import { db } from '../repositories/MockDatabase';
import type { AuditEntry } from '../repositories/MockDatabase';
import { SimulatorEngine } from './SimulatorEngine';
import type { PcwSystem, PcwSubmain } from '../domain/pcwTypes';
import type { SensorTag, EngineeringLimits } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';
import type { HistorianRecord } from '../domain/historianTypes';
import type { PredictionResult, PredictionConfig } from '../domain/predictionTypes';
import type { SimulatorConfig, ModbusRegisterValue, ModbusRegisterDefinition, FaultScenario } from '../domain/modbusTypes';
import type { SeriesPoint } from '../repositories/HistorianStore';

export interface AlarmFilter {
  tagId?: string;
  startTime?: string;
  endTime?: string;
}

/** Engineering-limit sanity check. Returns an error message or null. */
export function validateLimits(l: EngineeringLimits): string | null {
  const vals = [l.lowLow, l.low, l.high, l.highHigh];
  if (vals.some((v) => !Number.isFinite(v))) return 'All limits must be finite numbers';
  if (!(l.lowLow <= l.low)) return 'LL must be ≤ L';
  if (!(l.low < l.high)) return 'L must be < H';
  if (!(l.high <= l.highHigh)) return 'H must be ≤ HH';
  return null;
}

/**
 * PcwDataService
 * The canonical data gateway for the PCW SCADA frontend.
 * Provides unified access to repositories for Zustand Store.
 */
export class PcwDataService {
  
  // ==================================================
  // PCW System Level
  // ==================================================
  
  async getAllSystems(): Promise<PcwSystem[]> {
    return db.systems;
  }

  async getSystem(systemId: string): Promise<PcwSystem | undefined> {
    return db.systems.find(s => s.systemId === systemId);
  }

  async getSystemHealth(): Promise<{ status: string; lastCheck: string; systemsHealthy: number; totalSystems: number }> {
    return {
      status: 'OK',
      lastCheck: new Date().toISOString(),
      systemsHealthy: db.systems.filter(s => s.health === 'HEALTHY').length,
      totalSystems: db.systems.length
    };
  }

  // ==================================================
  // Submain Level
  // ==================================================

  async getAllSubmains(systemId?: string): Promise<PcwSubmain[]> {
    if (systemId) return db.submains.filter(sm => sm.systemId === systemId);
    return db.submains;
  }

  async getSubmain(systemId: string, submainId: string): Promise<PcwSubmain | undefined> {
    return db.submains.find(sm => sm.systemId === systemId && sm.submainId === submainId);
  }

  // ==================================================
  // Sensor Level
  // ==================================================

  async getAllSensors(): Promise<SensorTag[]> {
    return db.sensors;
  }

  async getSensorsBySystem(systemId: string): Promise<SensorTag[]> {
    return db.sensors.filter(t => t.systemId === systemId);
  }

  async getSensorsBySubmain(systemId: string, submainId: string): Promise<SensorTag[]> {
    return db.sensors.filter(t => t.systemId === systemId && t.submainId === submainId);
  }

  async getSensor(tagId: string): Promise<SensorTag | undefined> {
    return db.sensors.find(t => t.tagId === tagId);
  }

  async getLatestSensorValues(tagIds?: string[]): Promise<SensorTag[]> {
    let result = db.sensors;
    if (tagIds && tagIds.length > 0) {
      result = db.sensors.filter(t => tagIds.includes(t.tagId));
    }
    // Deep clone to ensure Zustand state update triggers re-renders
    return result.map(s => ({ ...s }));
  }

  async getSensorHistory(tagIds: string[], startTime: string, endTime: string): Promise<HistorianRecord[]> {
    // Per-tag ring buffers + spike-preserving min/max downsampling (≤ 2000 pts / tag)
    return db.historian.query(tagIds, startTime, endTime, 2000);
  }

  /** Last `minutes` one-minute points of a tag (raw or feature), oldest → newest. */
  async getTagSeries(tagId: string, minutes = 120): Promise<SeriesPoint[]> {
    return db.historian.tail(tagId, minutes);
  }

  // ==================================================
  // Alarms
  // ==================================================

  async getActiveAlarms(filters?: AlarmFilter): Promise<AlarmEvent[]> {
    let active = db.alarms.filter(a => a.state.startsWith('ACTIVE') || a.state === 'CLEARED_UNACK' || a.state === 'SHELVED');
    if (filters?.tagId) active = active.filter(a => a.tagId === filters.tagId);
    // Shallow clone so Zustand sees a new reference each poll
    return active.map(a => ({ ...a }));
  }

  async getAlarmHistory(filters?: AlarmFilter): Promise<AlarmEvent[]> {
    let history = [...db.alarms];
    if (filters?.startTime) history = history.filter(a => new Date(a.activatedAt) >= new Date(filters.startTime!));
    if (filters?.endTime) history = history.filter(a => new Date(a.activatedAt) <= new Date(filters.endTime!));
    if (filters?.tagId) history = history.filter(a => a.tagId === filters.tagId);
    return history.sort((a, b) => b.activatedAt.localeCompare(a.activatedAt));
  }

  async acknowledgeAlarm(alarmId: string, user: string): Promise<void> {
    const a = db.alarms.find(x => x.alarmId === alarmId);
    if (a) {
      a.acknowledgedAt = new Date().toISOString();
      a.acknowledgedBy = user;
      if (a.state === 'ACTIVE_UNACK') a.state = 'ACTIVE_ACK';
      else if (a.state === 'CLEARED_UNACK') a.state = 'CLEARED_ACK';
      db.audit(user, 'ALARM_ACK', a.tagId, `${a.alarmType} ${a.alarmId}`);
      db.persist();
    }
  }

  async acknowledgeAllAlarms(user: string): Promise<void> {
    const now = new Date().toISOString();
    let n = 0;
    db.alarms.forEach(a => {
      if (a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK') {
        a.acknowledgedAt = now;
        a.acknowledgedBy = user;
        if (a.state === 'ACTIVE_UNACK') a.state = 'ACTIVE_ACK';
        else if (a.state === 'CLEARED_UNACK') a.state = 'CLEARED_ACK';
        n++;
      }
    });
    if (n) {
      db.audit(user, 'ALARM_ACK_ALL', `${n} alarms`);
      db.persist();
    }
  }

  async shelveAlarm(alarmId: string, user = 'HMI_OPERATOR'): Promise<void> {
    const a = db.alarms.find(x => x.alarmId === alarmId);
    if (a && a.state.startsWith('ACTIVE')) {
      a.state = 'SHELVED';
      if (!a.acknowledgedAt) {
        a.acknowledgedAt = new Date().toISOString();
        a.acknowledgedBy = user;
      }
      db.audit(user, 'ALARM_SHELVE', a.tagId, `${a.alarmType} ${a.alarmId}`);
      db.persist();
    }
  }

  async unshelveAlarm(alarmId: string, user = 'HMI_OPERATOR'): Promise<void> {
    const a = db.alarms.find(x => x.alarmId === alarmId);
    if (a && a.state === 'SHELVED') {
      a.state = 'ACTIVE_ACK';
      db.audit(user, 'ALARM_UNSHELVE', a.tagId, `${a.alarmType} ${a.alarmId}`);
      db.persist();
    }
  }

  async getAuditLog(): Promise<AuditEntry[]> {
    return [...db.auditLog].reverse();
  }

  // ==================================================
  // Predictive Analytics
  // ==================================================

  async getPredictionResults(filters?: { tagId?: string }): Promise<PredictionResult[]> {
    let res = [...db.predictions];
    if (filters?.tagId) res = res.filter(p => p.tagId === filters.tagId);
    return res;
  }

  async getPredictionConfig(): Promise<PredictionConfig> {
    return { ...db.predictionConfig };
  }

  async updatePredictionConfig(type: 'global' | 'system' | 'submain' | 'sensor', id: string, enabled: boolean): Promise<void> {
    if (type === 'global') {
      db.predictionConfig.global = enabled;
    } else if (type === 'system') {
      db.predictionConfig.systems[id] = enabled;
    } else if (type === 'submain') {
      db.predictionConfig.submains[id] = enabled;
    } else if (type === 'sensor') {
      db.predictionConfig.sensors[id] = enabled;
    }
    db.persistConfig();
    db.audit('ENGINEER', 'PRED_ENABLE', `${type}:${id}`, String(enabled));
  }

  async updatePredictionSensitivity(val: number): Promise<void> {
    if (!Number.isFinite(val) || val <= 0) return;
    db.predictionConfig.sensitivity = val;
    db.persistConfig();
    db.audit('ENGINEER', 'PRED_THETA', 'GLOBAL', String(val));
  }

  async updatePredictionTuning(patch: Pick<Partial<PredictionConfig>, 'slopeGatePct' | 'releaseHold'>): Promise<void> {
    if (patch.slopeGatePct !== undefined && Number.isFinite(patch.slopeGatePct) && patch.slopeGatePct >= 0) db.predictionConfig.slopeGatePct = patch.slopeGatePct;
    if (patch.releaseHold !== undefined && Number.isFinite(patch.releaseHold) && patch.releaseHold >= 0) db.predictionConfig.releaseHold = Math.floor(patch.releaseHold);
    db.persistConfig();
    db.audit('ENGINEER', 'PRED_TUNING', 'GLOBAL', JSON.stringify(patch));
  }

  async updateSensorSensitivity(tagId: string, val: number | null): Promise<void> {
    if (!db.predictionConfig.sensorSensitivity) {
      db.predictionConfig.sensorSensitivity = {};
    }
    if (val === null) {
      delete db.predictionConfig.sensorSensitivity[tagId];
    } else if (Number.isFinite(val) && val > 0) {
      db.predictionConfig.sensorSensitivity[tagId] = val;
    }
    db.persistConfig();
    db.audit('ENGINEER', 'PRED_THETA', tagId, String(val));
  }

  /** Force an immediate prediction pass (e.g. after tuning) instead of waiting for the minute boundary. */
  async reevaluatePredictions(): Promise<void> {
    SimulatorEngine.evaluatePredictions(new Date().toISOString());
  }

  // ==================================================
  // Simulator & Modbus
  // ==================================================

  async getSimulatorStatus(): Promise<{ isRunning: boolean; iteration: number; updateIntervalMs: number }> {
    return { ...db.simulatorStatus };
  }

  async setSimulatorControl(action: 'START' | 'PAUSE' | 'RESET', interval?: number): Promise<void> {
    SimulatorEngine.setControl(action, interval);
  }

  async getSimulatorConfigs(): Promise<Record<string, SimulatorConfig>> {
    return { ...db.simulatorConfigs };
  }

  async updateSimulatorConfig(tagIds: string[], updates: Partial<SimulatorConfig>): Promise<void> {
    tagIds.forEach(tag => {
      if (db.simulatorConfigs[tag]) {
        db.simulatorConfigs[tag] = { ...db.simulatorConfigs[tag], ...updates };
      }
    });
    db.persistConfig();
  }

  async injectFault(tagIds: string[], scenario: FaultScenario, params: Partial<SimulatorConfig> = {}): Promise<void> {
    SimulatorEngine.injectFault(tagIds, scenario, params);
  }

  /** Returns an error string if rejected. */
  async updateSensorLimits(tagIds: string[], limits: Partial<EngineeringLimits>): Promise<string | null> {
    for (const tag of tagIds) {
      const sensor = db.sensors.find(s => s.tagId === tag);
      if (!sensor) continue;
      const err = validateLimits({ ...sensor.engineeringLimits, ...limits });
      if (err) return `${tag}: ${err}`;
    }
    tagIds.forEach(tag => {
      const sensor = db.sensors.find(s => s.tagId === tag);
      if (sensor) sensor.engineeringLimits = { ...sensor.engineeringLimits, ...limits };
    });
    db.persistConfig();
    db.audit('ENGINEER', 'LIMIT_CHANGE', tagIds.length === 1 ? tagIds[0] : `${tagIds.length} tags`, JSON.stringify(limits));
    return null;
  }

  async getModbusRegisters(): Promise<Record<number, ModbusRegisterValue>> {
    return { ...db.modbusRegisters };
  }

  async getModbusMap(): Promise<ModbusRegisterDefinition[]> {
    return db.modbusMap;
  }

  async getModbusWriteLog(): Promise<string[]> {
    return db.modbusWriteLog;
  }
}

export const pcwDataService = new PcwDataService();
