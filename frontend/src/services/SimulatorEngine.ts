import { db } from '../repositories/MockDatabase';
import { DriftForecastEngine } from './analytics/DriftForecastEngine';
import type { WindowPoint } from './analytics/DriftForecastEngine';
import { AlarmEngine } from './analytics/AlarmEngine';
import type { PredictionResult } from '../domain/predictionTypes';
import type { FaultScenario, SimulatorConfig } from '../domain/modbusTypes';
import type { TagQuality } from '../domain/sensorTypes';

/**
 * SimulatorEngine — POC data plane.
 *
 *  tick (default 1 s) ─► per-tag sample  = base + noise + fault(scenario)
 *                    ─► Modbus register image (FLOAT32, CDAB)
 *                    ─► ISA-18.2 AlarmEngine (deadband / on-delay / quality)
 *                    ─► 1-min accumulator  (mean of GOOD samples, majority quality)
 *  minute boundary   ─► Historian append (raw) ─► DriftForecastEngine (N10 + forecast)
 *                    ─► feature tags (_N10, _Slope, _Fcst10…) ─► predictive DRIFT alarms
 *
 * Using a 1-minute *mean* (instead of the former single instantaneous sample) is standard
 * historian practice: it removes sampling aliasing and lowers the variance seen by N10/slope by √n.
 */

interface MinuteAcc {
  sum: number;
  good: number;
  total: number;
  lastQuality: TagQuality;
}

const engine = new DriftForecastEngine(db.predictionConfig.releaseHold ?? 3);
const alarmEngine = new AlarmEngine(3);
const acc = new Map<string, MinuteAcc>();
let currentMinute = Math.floor(Date.now() / 60_000);
const regByTag = new Map(db.modbusMap.map((m) => [m.tagId, m]));

export class SimulatorEngine {
  private static lastTickTime = Date.now();

  public static setControl(action: 'START' | 'PAUSE' | 'RESET', interval?: number): void {
    if (interval && interval >= 100) db.simulatorStatus.updateIntervalMs = interval;

    if (action === 'PAUSE' || action === 'RESET') {
      if (db.simulatorIntervalId) clearInterval(db.simulatorIntervalId);
      db.simulatorIntervalId = null;
      db.simulatorStatus.isRunning = false;
    }

    if (action === 'RESET') {
      db.simulatorStatus.iteration = 0;
      db.alarms = [];
      db.predictions = [];
      engine.reset();
      acc.clear();
      Object.values(db.simulatorConfigs).forEach((conf) => {
        conf.scenario = 'NONE';
        conf.driftRatePerMin = 0;
        conf.stepOffset = 0;
        conf.spikeAmplitude = 0;
        conf.spikeProbability = 0;
        conf.scenarioStartedAt = null;
      });
      db.clearHistorian();
      db.backfill(70);
      db.persistConfig();
      db.persist();
      db.audit('SYSTEM', 'SIM_RESET', 'ALL');
    }

    if (action === 'START') {
      if (db.simulatorIntervalId) clearInterval(db.simulatorIntervalId);
      db.simulatorStatus.isRunning = true;
      this.lastTickTime = Date.now();
      db.simulatorIntervalId = setInterval(() => this.runTick(), db.simulatorStatus.updateIntervalMs);
      // Produce predictions immediately on start (do not wait up to 60 s)
      if (db.predictions.length === 0) this.evaluatePredictions(new Date().toISOString());
    }
  }

  /** Inject / clear a fault scenario on a set of tags (ground truth recorded for KPI evaluation). */
  public static injectFault(tagIds: string[], scenario: FaultScenario, params: Partial<SimulatorConfig> = {}, user = 'HMI_OPERATOR') {
    const now = Date.now();
    tagIds.forEach((tagId) => {
      const c = db.simulatorConfigs[tagId];
      if (!c) return;
      Object.assign(c, {
        scenario,
        driftRatePerMin: 0,
        stepOffset: 0,
        spikeAmplitude: 0,
        spikeProbability: 0,
        ...params,
        scenarioStartedAt: scenario === 'NONE' ? null : now,
      });
    });
    db.persistConfig();
    db.audit(user, scenario === 'NONE' ? 'FAULT_CLEAR' : `FAULT_${scenario}`, tagIds.length === 1 ? tagIds[0] : `${tagIds.length} tags`, JSON.stringify(params));
  }

  private static runTick() {
    const nowTime = Date.now();
    const interval = db.simulatorStatus.updateIntervalMs;
    const elapsed = nowTime - this.lastTickTime;
    let ticksToRun = Math.round(elapsed / interval);
    if (ticksToRun < 1) ticksToRun = 1;
    if (ticksToRun > 600) ticksToRun = 600; // Cap catch-up (background-tab throttling) to protect the UI thread
    const start = nowTime - (ticksToRun - 1) * interval;
    for (let i = 0; i < ticksToRun; i++) this.processTick(start + i * interval);
    this.lastTickTime = nowTime;
  }

  private static sample(c: SimulatorConfig, prev: number, tickMs: number): { v: number; q: TagQuality } {
    const noise = (Math.random() - 0.5) * c.noise;
    let v = c.baseValue + noise;
    switch (c.scenario) {
      case 'DRIFT': {
        const mins = c.scenarioStartedAt ? (tickMs - c.scenarioStartedAt) / 60_000 : 0;
        v += (c.driftRatePerMin ?? 0) * Math.max(0, mins);
        break;
      }
      case 'STEP':
        v += c.stepOffset ?? 0;
        break;
      case 'SPIKE':
        if (Math.random() < (c.spikeProbability ?? 0.05)) v += (Math.random() < 0.5 ? -1 : 1) * (c.spikeAmplitude ?? 0);
        break;
      case 'BAD_QUALITY':
        return { v, q: 'BAD' };
      case 'COMM_LOSS':
        return { v: prev, q: 'COMM_LOSS' }; // value frozen at last known
    }
    return { v, q: 'GOOD' };
  }

  private static processTick(tickMs: number) {
    db.simulatorStatus.iteration++;
    const nowIso = new Date(tickMs).toISOString();

    db.sensors.forEach((sensor) => {
      const conf = db.simulatorConfigs[sensor.tagId];
      if (!conf) return;
      const { v, q } = this.sample(conf, sensor.value, tickMs);
      sensor.value = v;
      sensor.quality = q;
      if (q !== 'COMM_LOSS') sensor.timestamp = nowIso;

      const regDef = regByTag.get(sensor.tagId);
      if (regDef) {
        db.modbusRegisters[regDef.registerAddress] = {
          registerAddress: regDef.registerAddress,
          rawValue: v * regDef.scale,
          engineeringValue: v,
          quality: q,
          lastUpdate: q === 'COMM_LOSS' ? db.modbusRegisters[regDef.registerAddress]?.lastUpdate ?? nowIso : nowIso,
        };
      }

      // 1-minute accumulator
      let a = acc.get(sensor.tagId);
      if (!a) {
        a = { sum: 0, good: 0, total: 0, lastQuality: 'GOOD' };
        acc.set(sensor.tagId, a);
      }
      a.total++;
      a.lastQuality = q;
      if (q === 'GOOD') {
        a.sum += v;
        a.good++;
      }

      alarmEngine.evaluateSensor(db.alarms, sensor, nowIso);
    });

    // ---- Minute boundary → historian + predictions ----
    const minute = Math.floor(tickMs / 60_000);
    if (minute !== currentMinute) {
      const stampMs = currentMinute * 60_000 + 30_000; // centre of the closed minute
      currentMinute = minute;
      db.sensors.forEach((s) => {
        const a = acc.get(s.tagId);
        if (!a || a.total === 0) return;
        const goodMajority = a.good / a.total >= 0.5;
        const quality = goodMajority ? 'GOOD' : a.lastQuality === 'COMM_LOSS' ? 'COMM_LOSS' : 'BAD';
        db.historian.append(s.tagId, stampMs, goodMajority ? a.sum / a.good : s.value, quality);
      });
      acc.clear();
      this.evaluatePredictions(new Date(tickMs).toISOString());
      db.persistHistorian();
    }

    this.aggregateSystems(nowIso);

    if (db.simulatorStatus.iteration % 10 === 0) db.persist();
  }

  /** Run the Drift/Forecast engine for every tag (once per minute). */
  public static evaluatePredictions(nowIso: string) {
    const pcfg = db.predictionConfig;
    engine.setReleaseHold(pcfg.releaseHold ?? 3);
    const tMs = new Date(nowIso).getTime();

    db.predictions = db.sensors.map((s): PredictionResult => {
      const enabled = pcfg.global && pcfg.systems[s.systemId] !== false && pcfg.submains[s.submainId] !== false && pcfg.sensors[s.tagId] !== false;
      if (!enabled) {
        engine.reset(s.tagId);
        const p: PredictionResult = {
          tagId: s.tagId, evaluationTime: nowIso, currentValue: s.value, baseAvg60: 0, m60: 0, m10: 0, n10: 0, slope: 0,
          forecast30: s.value, forecast20: s.value, forecast10: s.value, state: 'DISABLED', detector: 'NONE', riskScore: 0,
          triggerPath: '[Hold] ENGINE_DISABLED (Configured OFF)',
        };
        alarmEngine.evaluatePrediction(db.alarms, s, p, nowIso);
        return p;
      }

      const window: WindowPoint[] = db.historian.tail(s.tagId, 70).map((p) => ({ v: p.v, good: p.q === 0 }));
      const theta = pcfg.sensorSensitivity?.[s.tagId] ?? pcfg.sensitivity ?? 2;
      const p = engine.evaluate(s.tagId, window, s.value, s.engineeringLimits, { sensitivity: theta, slopeGatePct: pcfg.slopeGatePct ?? 5 }, nowIso);

      if (p.state !== 'INSUFFICIENT_DATA') {
        const f: [string, number][] = [
          ['BaseAvg60', p.baseAvg60], ['M60', p.m60], ['M10', p.m10], ['N10', Math.min(p.n10, 99)], ['Slope', p.slope],
          ['Fcst30', p.forecast30], ['Fcst20', p.forecast20], ['Fcst10', p.forecast10], ['Risk', p.riskScore ?? 0],
        ];
        f.forEach(([k, v]) => db.historian.append(`${s.tagId}_${k}`, tMs, v, 'GOOD'));
      }
      alarmEngine.evaluatePrediction(db.alarms, s, p, nowIso);
      return p;
    });
  }

  private static aggregateSystems(nowIso: string) {
    const predByTag = new Map(db.predictions.map((p) => [p.tagId, p]));
    db.systems.forEach((sys) => {
      const sysSensors = db.sensors.filter((s) => s.systemId === sys.systemId);
      const supply = sysSensors.filter((s) => s.position === 'SUPPLY' && s.measurementType === 'PRESSURE');
      const ret = sysSensors.filter((s) => s.position === 'RETURN' && s.measurementType === 'PRESSURE');
      const stats = (vals: number[]) =>
        vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: vals.reduce((a, b) => a + b, 0) / vals.length } : { min: 0, max: 0, avg: 0 };
      const dp = supply.map((s) => {
        const r = ret.find((x) => x.submainId === s.submainId);
        return r ? s.value - r.value : 0;
      });
      const open = db.alarms.filter((a) => a.systemId === sys.systemId && a.state.startsWith('ACTIVE'));
      const drift = sysSensors.filter((s) => {
        const st = predByTag.get(s.tagId)?.state;
        return st === 'T-30' || st === 'T-20' || st === 'T-10';
      }).length;
      const badQ = sysSensors.filter((s) => s.quality !== 'GOOD').length;

      sys.activeAlarmCount = open.length;
      sys.unacknowledgedAlarmCount = open.filter((a) => a.state === 'ACTIVE_UNACK').length;
      sys.supplyPressure = stats(supply.map((s) => s.value));
      sys.returnPressure = stats(ret.map((s) => s.value));
      sys.differentialPressure = stats(dp);
      sys.driftSensorCount = drift;
      sys.totalSensorCount = sysSensors.length;
      sys.health = open.some((a) => a.priority === 'CRITICAL') ? 'CRITICAL' : open.length || drift ? 'WARNING' : 'HEALTHY';
      sys.communicationStatus = badQ === sysSensors.length && badQ > 0 ? 'DISCONNECTED' : 'CONNECTED';
      sys.lastUpdateTime = nowIso;
    });
  }
}
