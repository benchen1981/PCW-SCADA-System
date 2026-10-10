import { initialPcwSystems } from '../data/pcwSystems';
import { initialPcwSubmains } from '../data/pcwSubmains';
import { initialSensors } from '../data/sensorDefinitions';
import { initialAlarms } from '../data/alarmDefinitions';
import { initialModbusMap } from '../data/modbusRegisterMap';
import { HistorianStore } from './HistorianStore';
import type { SeriesPoint } from './HistorianStore';

import type { PcwSystem, PcwSubmain } from '../domain/pcwTypes';
import type { SensorTag, EngineeringLimits } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';
import type { PredictionResult, PredictionConfig } from '../domain/predictionTypes';
import { DEFAULT_PREDICTION_CONFIG } from '../domain/predictionTypes';
import type { SimulatorConfig, ModbusRegisterValue, ModbusRegisterDefinition } from '../domain/modbusTypes';

/** Operator / engineering action journal (traceability for audits & patent evidence). */
export interface AuditEntry {
  ts: string;
  user: string;
  action: string;
  target: string;
  detail?: string;
}

const LS = {
  HIST: 'pcw_hist_v4',
  ALARMS: 'pcw_alarms',
  STATUS: 'pcw_simulatorStatus',
  PRED_CFG: 'pcw_pred_config',
  PREDICTIONS: 'pcw_predictions',
  SIM_CFG: 'pcw_sim_configs',
  LIMITS: 'pcw_limits_v4',
  AUDIT: 'pcw_audit_v4',
  LEGACY_HIST: 'pcw_historian',
};

/** Retained in localStorage (minutes). Must be ≥ prediction window (70). */
const PERSIST_WINDOW_MIN = 180;
const AUDIT_MAX = 1000;

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// Singleton in-memory mock database
class MockDatabase {
  public systems: PcwSystem[] = initialPcwSystems.map((s) => ({ ...s }));
  public submains: PcwSubmain[] = [...initialPcwSubmains];
  public sensors: SensorTag[] = initialSensors.map((s) => ({ ...s, engineeringLimits: { ...s.engineeringLimits } }));
  public alarms: AlarmEvent[] = [...initialAlarms];
  public historian = new HistorianStore(1440, 720);
  public predictions: PredictionResult[] = [];
  public modbusRegisters: Record<number, ModbusRegisterValue> = {};
  public modbusMap: ModbusRegisterDefinition[] = [...initialModbusMap];
  public modbusWriteLog: string[] = [];
  public auditLog: AuditEntry[] = [];

  public simulatorStatus = { isRunning: false, iteration: 0, updateIntervalMs: 1000 };
  public simulatorConfigs: Record<string, SimulatorConfig> = {};
  public simulatorIntervalId: ReturnType<typeof setInterval> | null = null;

  public predictionConfig: PredictionConfig = { ...DEFAULT_PREDICTION_CONFIG };

  constructor() {
    this.init();
  }

  private init() {
    // ---- Engineering limit overrides ----
    const limits = readJson<Record<string, EngineeringLimits>>(LS.LIMITS);
    if (limits) {
      this.sensors.forEach((s) => {
        if (limits[s.tagId]) s.engineeringLimits = { ...s.engineeringLimits, ...limits[s.tagId] };
      });
    }

    // ---- Modbus map & simulator configs ----
    this.modbusMap.forEach((reg) => {
      const sensor = this.sensors.find((s) => s.tagId === reg.tagId);
      this.modbusRegisters[reg.registerAddress] = {
        registerAddress: reg.registerAddress,
        rawValue: sensor ? sensor.value * reg.scale : 0,
        engineeringValue: sensor ? sensor.value : 0,
        quality: 'GOOD',
        lastUpdate: new Date().toISOString(),
      };
    });
    this.sensors.forEach((sensor) => {
      this.simulatorConfigs[sensor.tagId] = {
        tagId: sensor.tagId,
        baseValue: sensor.value,
        noise: (sensor.engineeringLimits.high - sensor.engineeringLimits.low) * 0.02,
        scenario: 'NONE',
      };
    });
    const savedSim = readJson<Record<string, SimulatorConfig>>(LS.SIM_CFG);
    if (savedSim) {
      for (const key in savedSim) {
        if (this.simulatorConfigs[key]) this.simulatorConfigs[key] = { ...this.simulatorConfigs[key], ...savedSim[key] };
      }
    }

    // ---- Historian: restore compact snapshot, migrate legacy, then backfill ----
    const snap = readJson<Record<string, [number, number, number][]>>(LS.HIST);
    if (snap) this.historian.restore(snap);
    // A snapshot whose newest point is older than the prediction window is stale: the 70-point
    // window would mix yesterday's data with today's. Start clean instead.
    const newest = Math.max(0, ...this.historian.tagIds().map((id) => this.historian.tail(id, 1)[0]?.t ?? 0));
    if (newest && Date.now() - newest > 70 * 60_000) this.historian.clear();
    if (localStorage.getItem(LS.LEGACY_HIST)) {
      // Legacy 200k-row array exceeded the 5 MB quota; drop it to free space.
      try {
        localStorage.removeItem(LS.LEGACY_HIST);
      } catch {
        /* ignore */
      }
    }
    this.backfill();

    // ---- Alarms / status / predictions / config / audit ----
    const alarms = readJson<AlarmEvent[]>(LS.ALARMS);
    if (alarms) this.alarms = alarms.filter((a) => a && a.alarmId && a.tagId);
    const status = readJson<typeof this.simulatorStatus>(LS.STATUS);
    if (status) this.simulatorStatus = { ...this.simulatorStatus, ...status };
    const pcfg = readJson<Partial<PredictionConfig>>(LS.PRED_CFG);
    if (pcfg) this.predictionConfig = { ...DEFAULT_PREDICTION_CONFIG, ...pcfg, sensorSensitivity: { ...(pcfg.sensorSensitivity ?? {}) } };
    const preds = readJson<PredictionResult[]>(LS.PREDICTIONS);
    if (preds) this.predictions = preds;
    const audit = readJson<AuditEntry[]>(LS.AUDIT);
    if (audit) this.auditLog = audit;

    // Simulator auto-start is driven by App.tsx; mark running so UI is consistent.
    if (this.simulatorStatus.isRunning !== false) this.simulatorStatus.isRunning = true;
  }

  /**
   * Ensure every raw tag has ≥ 70 one-minute points so the prediction window is available at boot.
   * Points are generated with the tag's configured noise (NOT a flat line): a flat baseline yields
   * M60 = 0, which makes N10 saturate (999) on the very first noisy sample → false T-30 at start-up.
   */
  public backfill(minPoints = 70) {
    const nowMs = Date.now();
    this.sensors.forEach((sensor) => {
      const have = this.historian.count(sensor.tagId);
      if (have >= minPoints) return;
      const conf = this.simulatorConfigs[sensor.tagId];
      const L = sensor.engineeringLimits;
      const base = conf?.baseValue ?? L.baseline ?? (L.high + L.low) / 2;
      const noise = conf?.noise ?? (L.high - L.low) * 0.02;
      const first = this.historian.firstTime(sensor.tagId) ?? nowMs;
      const missing = minPoints - have;
      const seeded: SeriesPoint[] = [];
      for (let i = missing; i > 0; i--) {
        seeded.push({ t: first - i * 60_000, v: base + (Math.random() - 0.5) * noise, q: 0 });
      }
      if (have === 0) seeded.forEach((p) => this.historian.append(sensor.tagId, p.t, p.v, p.q));
      else this.historian.replace(sensor.tagId, [...seeded, ...this.historian.tail(sensor.tagId, have)]);
    });
  }

  public audit(user: string, action: string, target: string, detail?: string) {
    this.auditLog.push({ ts: new Date().toISOString(), user, action, target, detail });
    if (this.auditLog.length > AUDIT_MAX) this.auditLog.splice(0, this.auditLog.length - AUDIT_MAX);
    try {
      localStorage.setItem(LS.AUDIT, JSON.stringify(this.auditLog));
    } catch {
      /* quota */
    }
  }

  public persistConfig() {
    try {
      localStorage.setItem(LS.PRED_CFG, JSON.stringify(this.predictionConfig));
      localStorage.setItem(LS.SIM_CFG, JSON.stringify(this.simulatorConfigs));
      const limits: Record<string, EngineeringLimits> = {};
      this.sensors.forEach((s) => (limits[s.tagId] = s.engineeringLimits));
      localStorage.setItem(LS.LIMITS, JSON.stringify(limits));
    } catch (e) {
      console.error('Failed to persist config', e);
    }
  }

  /** Lightweight state (alarms, status, predictions). Called frequently. */
  public persist() {
    try {
      localStorage.setItem(LS.ALARMS, JSON.stringify(this.alarms));
      localStorage.setItem(LS.STATUS, JSON.stringify(this.simulatorStatus));
      localStorage.setItem(LS.PREDICTIONS, JSON.stringify(this.predictions));
    } catch (e) {
      console.error('Failed to persist mock db', e);
    }
  }

  /** Heavy historian snapshot (~1–2 MB). Called once per simulated minute and on unload. */
  public persistHistorian() {
    try {
      localStorage.setItem(LS.HIST, JSON.stringify(this.historian.snapshot(PERSIST_WINDOW_MIN)));
    } catch (e) {
      console.warn('Historian snapshot skipped (storage quota)', e);
    }
  }

  public clearHistorian() {
    this.historian.clear();
    try {
      localStorage.removeItem(LS.HIST);
    } catch {
      /* ignore */
    }
  }
}

const globalAny = globalThis as unknown as { __SCADA_DB?: MockDatabase };
if (!globalAny.__SCADA_DB) {
  globalAny.__SCADA_DB = new MockDatabase();
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      globalAny.__SCADA_DB?.persist();
      globalAny.__SCADA_DB?.persistHistorian();
    });
  }
}
export const db: MockDatabase = globalAny.__SCADA_DB;
export type { MockDatabase };
