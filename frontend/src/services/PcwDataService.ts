import { db } from '../repositories/MockDatabase';
import { SimulatorEngine } from './SimulatorEngine';
import type { PcwSystem, PcwSubmain } from '../domain/pcwTypes';
import type { SensorTag } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';
import type { HistorianRecord } from '../domain/historianTypes';
import type { PredictionResult } from '../domain/predictionTypes';
import type { SimulatorConfig, ModbusRegisterValue, ModbusRegisterDefinition } from '../domain/modbusTypes';

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

  async getSystemHealth(): Promise<any> {
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
    const raw = db.historian.filter(h => 
      tagIds.includes(h.tagId) && 
      new Date(h.timestamp) >= new Date(startTime) && 
      new Date(h.timestamp) <= new Date(endTime)
    );
    
    // Downsample per tag to max 2000 points to avoid chart rendering lag
    const MAX_PTS = 2000;
    const byTag: Record<string, HistorianRecord[]> = {};
    raw.forEach(h => { if (!byTag[h.tagId]) byTag[h.tagId] = []; byTag[h.tagId].push(h); });
    
    const result: HistorianRecord[] = [];
    Object.values(byTag).forEach(pts => {
      if (pts.length <= MAX_PTS) {
        result.push(...pts);
      } else {
        const step = pts.length / MAX_PTS;
        for (let i = 0; i < MAX_PTS; i++) {
          result.push(pts[Math.floor(i * step)]);
        }
      }
    });
    
    return result;
  }

  // ==================================================
  // Alarms
  // ==================================================

  async getActiveAlarms(filters?: any): Promise<AlarmEvent[]> {
    let active = db.alarms.filter(a => a.state.startsWith('ACTIVE') || a.state.startsWith('CLEARED_UNACK'));
    if (filters?.tagId) active = active.filter(a => a.tagId === filters.tagId);
    return active;
  }

  async getAlarmHistory(filters?: any): Promise<AlarmEvent[]> {
    let history = [...db.alarms];
    if (filters?.startTime) history = history.filter(a => new Date(a.activatedAt) >= new Date(filters.startTime));
    if (filters?.endTime) history = history.filter(a => new Date(a.activatedAt) <= new Date(filters.endTime));
    if (filters?.tagId) history = history.filter(a => a.tagId === filters.tagId);
    return history;
  }

  async acknowledgeAlarm(alarmId: string, user: string): Promise<void> {
    const a = db.alarms.find(x => x.alarmId === alarmId);
    if (a) {
      a.acknowledgedAt = new Date().toISOString();
      a.acknowledgedBy = user;
      if (a.state === 'ACTIVE_UNACK') a.state = 'ACTIVE_ACK';
      else if (a.state === 'CLEARED_UNACK') a.state = 'CLEARED_ACK';
    }
  }

  async acknowledgeAllAlarms(user: string): Promise<void> {
    const now = new Date().toISOString();
    db.alarms.forEach(a => {
      if (a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK') {
        a.acknowledgedAt = now;
        a.acknowledgedBy = user;
        if (a.state === 'ACTIVE_UNACK') a.state = 'ACTIVE_ACK';
        else if (a.state === 'CLEARED_UNACK') a.state = 'CLEARED_ACK';
      }
    });
  }

  async shelveAlarm(alarmId: string): Promise<void> {
    const a = db.alarms.find(x => x.alarmId === alarmId);
    if (a && a.state.startsWith('ACTIVE')) {
      a.state = 'SHELVED';
    }
  }

  // ==================================================
  // Predictive Analytics
  // ==================================================

  async getPredictionResults(filters?: any): Promise<PredictionResult[]> {
    let res = [...db.predictions];
    if (filters?.tagId) res = res.filter(p => p.tagId === filters.tagId);
    return res;
  }

  async getPredictionConfig(): Promise<any> {
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
    localStorage.setItem('pcw_pred_config', JSON.stringify(db.predictionConfig));
  }

  async updatePredictionSensitivity(val: number): Promise<void> {
    db.predictionConfig.sensitivity = val;
    localStorage.setItem('pcw_pred_config', JSON.stringify(db.predictionConfig));
  }

  async updateSensorSensitivity(tagId: string, val: number | null): Promise<void> {
    if (!db.predictionConfig.sensorSensitivity) {
      db.predictionConfig.sensorSensitivity = {};
    }
    if (val === null) {
      delete db.predictionConfig.sensorSensitivity[tagId];
    } else {
      db.predictionConfig.sensorSensitivity[tagId] = val;
    }
    localStorage.setItem('pcw_pred_config', JSON.stringify(db.predictionConfig));
  }

  // ==================================================
  // Simulator & Modbus
  // ==================================================

  async getSimulatorStatus(): Promise<any> {
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
    localStorage.setItem('pcw_sim_configs', JSON.stringify(db.simulatorConfigs));
  }

  async updateSensorLimits(tagIds: string[], limits: Partial<any>): Promise<void> {
    tagIds.forEach(tag => {
      const sensor = db.sensors.find(s => s.tagId === tag);
      if (sensor) {
        sensor.engineeringLimits = { ...sensor.engineeringLimits, ...limits };
      }
    });
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
