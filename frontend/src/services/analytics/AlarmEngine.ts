/**
 * AlarmEngine — ISA-18.2 / IEC 62682 aligned alarm state machine.
 *
 *  - Limit alarms HH / H / L / LL with **deadband** (return-to-normal hysteresis) and
 *    **on-delay** (value must persist N samples) to suppress chattering.
 *  - Mutually exclusive per-direction escalation (H ↔ HH) — a tag never shows H and HH together.
 *  - Quality alarms (BAD / COMM_LOSS) raised as `ERROR`; limit evaluation is suppressed on bad data
 *    (prevents "garbage-in" alarms).
 *  - Predictive alarms (`DRIFT`) raised from the Drift/Forecast engine with source PREDICTION_ENGINE,
 *    so early warnings flow through the same ACK / shelve / audit pipeline as process alarms.
 *  - SHELVED alarms are respected (no re-annunciation while shelved) and released on clear.
 *  - Journal is bounded to avoid unbounded memory growth on long runs.
 */
import type { AlarmEvent } from '../../domain/alarmTypes';
import type { SensorTag } from '../../domain/sensorTypes';
import type { PredictionResult } from '../../domain/predictionTypes';

export const ALARM_JOURNAL_MAX = 5000;
export const DEFAULT_ON_DELAY_SAMPLES = 3;

let seq = 0;
const newAlarmId = () => `ALM-${Date.now().toString(36).toUpperCase()}-${(++seq).toString(36).toUpperCase().padStart(4, '0')}`;

type LimitType = 'HIGH_HIGH' | 'HIGH' | 'LOW' | 'LOW_LOW';

const isOpen = (a: AlarmEvent) => a.state === 'ACTIVE_UNACK' || a.state === 'ACTIVE_ACK' || a.state === 'SHELVED';

export class AlarmEngine {
  /** consecutive-sample counters for on-delay, keyed `${tagId}|${type}` */
  private pending = new Map<string, number>();
  /** O(1) index of open alarms keyed `${tagId}|${type}`; rebuilt if the journal array is replaced */
  private index = new Map<string, AlarmEvent>();
  private boundTo: AlarmEvent[] | null = null;

  constructor(public onDelaySamples = DEFAULT_ON_DELAY_SAMPLES) {}

  private bind(alarms: AlarmEvent[]) {
    if (this.boundTo === alarms) return;
    this.boundTo = alarms;
    this.index.clear();
    for (const a of alarms) if (isOpen(a)) this.index.set(`${a.tagId}|${a.alarmType}`, a);
  }

  private findOpen(alarms: AlarmEvent[], tagId: string, type: AlarmEvent['alarmType']) {
    this.bind(alarms);
    const key = `${tagId}|${type}`;
    const a = this.index.get(key);
    if (a && isOpen(a)) return a;
    if (a) this.index.delete(key);
    return undefined;
  }

  private raise(
    alarms: AlarmEvent[],
    s: SensorTag,
    type: AlarmEvent['alarmType'],
    priority: AlarmEvent['priority'],
    message: string,
    limit: number,
    ts: string,
    source = 'ALARM_ENGINE',
  ) {
    alarms.push({
      alarmId: newAlarmId(),
      tagId: s.tagId,
      systemId: s.systemId,
      submainId: s.submainId,
      alarmType: type,
      priority,
      state: 'ACTIVE_UNACK',
      message,
      value: s.value,
      limit,
      unit: s.unit,
      activatedAt: ts,
      acknowledgedAt: null,
      clearedAt: null,
      acknowledgedBy: null,
      source,
    });
    this.bind(alarms);
    this.index.set(`${s.tagId}|${type}`, alarms[alarms.length - 1]);
    if (alarms.length > ALARM_JOURNAL_MAX) {
      // Drop the oldest *closed* alarms first; never drop an open one.
      const idx = alarms.findIndex((a) => !isOpen(a) && a.state !== 'CLEARED_UNACK');
      alarms.splice(idx >= 0 ? idx : 0, 1);
    }
  }

  private clear(a: AlarmEvent, ts: string) {
    a.clearedAt = ts;
    if (a.state === 'ACTIVE_UNACK') a.state = 'CLEARED_UNACK';
    else a.state = 'CLEARED_ACK'; // ACTIVE_ACK and SHELVED both return to normal acknowledged
  }

  /** Evaluate quality + limit alarms for one sensor sample. Mutates `alarms` and sensor status. */
  evaluateSensor(alarms: AlarmEvent[], s: SensorTag, ts: string) {
    const L = s.engineeringLimits;
    const db = L.deadband ?? Math.max(1e-6, (L.high - L.low) * 0.01);

    // ---- Quality alarm ----
    const badQ = s.quality === 'BAD' || s.quality === 'COMM_LOSS';
    const qAlarm = this.findOpen(alarms, s.tagId, 'ERROR');
    if (badQ && !qAlarm) {
      this.raise(alarms, s, 'ERROR', 'HIGH', `${s.tagId} ${s.quality === 'BAD' ? 'BAD QUALITY' : 'COMM LOSS'}`, 0, ts, 'QUALITY_MONITOR');
    } else if (!badQ && qAlarm) {
      this.clear(qAlarm, ts);
    }

    if (!badQ) {
      const v = s.value;
      const defs: { type: LimitType; on: boolean; off: boolean; limit: number; prio: AlarmEvent['priority']; label: string }[] = [
        { type: 'HIGH_HIGH', on: v >= L.highHigh, off: v < L.highHigh - db, limit: L.highHigh, prio: 'CRITICAL', label: 'HIGH-HIGH' },
        { type: 'HIGH', on: v >= L.high && v < L.highHigh, off: v < L.high - db || v >= L.highHigh, limit: L.high, prio: 'HIGH', label: 'HIGH' },
        { type: 'LOW', on: v <= L.low && v > L.lowLow, off: v > L.low + db || v <= L.lowLow, limit: L.low, prio: 'HIGH', label: 'LOW' },
        { type: 'LOW_LOW', on: v <= L.lowLow, off: v > L.lowLow + db, limit: L.lowLow, prio: 'CRITICAL', label: 'LOW-LOW' },
      ];
      for (const d of defs) {
        const key = `${s.tagId}|${d.type}`;
        const open = this.findOpen(alarms, s.tagId, d.type);
        if (d.on) {
          if (open) {
            if (open.state !== 'SHELVED') open.value = v;
            this.pending.delete(key);
          } else {
            const n = (this.pending.get(key) ?? 0) + 1;
            if (n >= this.onDelaySamples) {
              this.raise(alarms, s, d.type, d.prio, `${s.tagId} ${d.label}`, d.limit, ts);
              this.pending.delete(key);
            } else this.pending.set(key, n);
          }
        } else {
          this.pending.delete(key);
          if (open && d.off) this.clear(open, ts);
        }
      }
    }

    // ---- Derive sensor status (O(1) via index) ----
    let active: AlarmEvent | undefined;
    for (const t of ['HIGH_HIGH', 'LOW_LOW', 'ERROR', 'HIGH', 'LOW'] as const) {
      const a = this.findOpen(alarms, s.tagId, t);
      if (a && (a.state === 'ACTIVE_UNACK' || a.state === 'ACTIVE_ACK')) {
        active = a;
        break;
      }
    }
    if (active) {
      s.alarmState = active.state;
      s.status = active.alarmType === 'ERROR' ? 'ERROR' : 'ALARM';
      s.alarmPriority = active.priority;
    } else {
      s.alarmState = 'NONE';
      s.status = 'NORMAL';
      s.alarmPriority = null;
    }
  }

  /** Raise / update / clear predictive DRIFT alarms from engine output. */
  evaluatePrediction(alarms: AlarmEvent[], s: SensorTag, p: PredictionResult, ts: string) {
    const open = this.findOpen(alarms, s.tagId, 'DRIFT');
    const warn = p.state === 'T-30' || p.state === 'T-20' || p.state === 'T-10';
    if (warn) {
      const prio: AlarmEvent['priority'] = p.state === 'T-10' ? 'HIGH' : p.state === 'T-20' ? 'MEDIUM' : 'LOW';
      const ttl = p.ttlMinutes != null ? ` · TTL ${p.ttlMinutes.toFixed(0)} min → ${p.ttlLimit}` : '';
      const msg = `${s.tagId} PREDICTIVE ${p.state} (${p.detector === 'DENSITY' ? 'N10 drift' : 'forecast'})${ttl}`;
      if (!open) {
        this.raise(alarms, s, 'DRIFT', prio, msg, p.state === 'T-10' ? p.forecast10 : p.state === 'T-20' ? p.forecast20 : p.forecast30, ts, 'PREDICTION_ENGINE');
      } else if (open.state !== 'SHELVED') {
        // Escalate priority in place (no new alarm → avoids flood), keep live evidence
        const rank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
        if (rank[prio] > rank[open.priority]) {
          open.priority = prio;
          if (open.state === 'ACTIVE_ACK') open.state = 'ACTIVE_UNACK'; // re-annunciate on escalation
        }
        open.message = msg;
        open.value = s.value;
      }
    } else if (open && (p.state === 'NORMAL' || p.state === 'EVENT' || p.state === 'DISABLED' || p.state === 'INSUFFICIENT_DATA')) {
      // EVENT: process alarm takes over → close the predictive alarm
      this.clear(open, ts);
    }
    if (warn && s.status === 'NORMAL') s.status = 'WARNING';
  }
}
