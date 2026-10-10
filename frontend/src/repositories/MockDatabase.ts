import { initialPcwSystems } from '../data/pcwSystems';
import { initialPcwSubmains } from '../data/pcwSubmains';
import { initialSensors } from '../data/sensorDefinitions';
import { initialAlarms } from '../data/alarmDefinitions';
import { initialModbusMap } from '../data/modbusRegisterMap';

import type { PcwSystem, PcwSubmain } from '../domain/pcwTypes';
import type { SensorTag } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';
import type { HistorianRecord } from '../domain/historianTypes';
import type { PredictionResult } from '../domain/predictionTypes';
import type { SimulatorConfig, ModbusRegisterValue, ModbusRegisterDefinition } from '../domain/modbusTypes';

// Singleton in-memory mock database
class MockDatabase {
  public systems: PcwSystem[] = [...initialPcwSystems];
  public submains: PcwSubmain[] = [...initialPcwSubmains];
  public sensors: SensorTag[] = [...initialSensors];
  public alarms: AlarmEvent[] = [...initialAlarms];
  public historian: HistorianRecord[] = [];
  public predictions: PredictionResult[] = [];
  public modbusRegisters: Record<number, ModbusRegisterValue> = {};
  public modbusMap: ModbusRegisterDefinition[] = [...initialModbusMap];
  public modbusWriteLog: string[] = [];
  
  public simulatorStatus = { isRunning: false, iteration: 0, updateIntervalMs: 1000 };
  public simulatorConfigs: Record<string, SimulatorConfig> = {};
  public simulatorIntervalId: any = null;

  public predictionConfig = {
    global: true,
    systems: {} as Record<string, boolean>,
    submains: {} as Record<string, boolean>,
    sensors: {} as Record<string, boolean>,
    sensitivity: 2,
    sensorSensitivity: {} as Record<string, number>
  };

  constructor() {
    this.init();
  }

  private init() {
    // Restore from localStorage if available
    const savedHistorian = localStorage.getItem('pcw_historian');
    if (savedHistorian) {
      try { this.historian = JSON.parse(savedHistorian); } catch (e) {}
    }
    
    // Ensure all sensors have at least 70 historical points to simulate a long-term running background system
    const nowMs = Date.now();
    const tagCounts: Record<string, number> = {};
    const firstTimestamps: Record<string, number> = {};
    
    this.historian.forEach(h => {
      tagCounts[h.tagId] = (tagCounts[h.tagId] || 0) + 1;
      if (!firstTimestamps[h.tagId]) {
        firstTimestamps[h.tagId] = new Date(h.timestamp).getTime();
      }
    });

    const backfill: HistorianRecord[] = [];
    this.sensors.forEach(sensor => {
      const existingCount = tagCounts[sensor.tagId] || 0;
      if (existingCount < 70) {
        const missing = 70 - existingCount;
        const baseTime = firstTimestamps[sensor.tagId] || nowMs;
        const baseline = sensor.engineeringLimits.baseline ?? ((sensor.engineeringLimits.high + sensor.engineeringLimits.low) / 2);
        
        for (let i = missing; i > 0; i--) {
          backfill.push({
            tagId: sensor.tagId,
            timestamp: new Date(baseTime - i * 60000).toISOString(),
            value: baseline,
            quality: 'GOOD'
          });
        }
      }
    });
    
    // Prepend the generated historical data
    this.historian = [...backfill, ...this.historian];
    const savedAlarms = localStorage.getItem('pcw_alarms');
    if (savedAlarms) {
      try { this.alarms = JSON.parse(savedAlarms); } catch (e) {}
    }
    const savedStatus = localStorage.getItem('pcw_simulatorStatus');
    if (savedStatus) {
      try { this.simulatorStatus = JSON.parse(savedStatus); } catch (e) {}
    }

    const savedPredConfig = localStorage.getItem('pcw_pred_config');
    if (savedPredConfig) {
      try { this.predictionConfig = JSON.parse(savedPredConfig); } catch (e) {}
    }

    const savedPredictions = localStorage.getItem('pcw_predictions');
    if (savedPredictions) {
      try { this.predictions = JSON.parse(savedPredictions); } catch (e) {}
    }
    
    // Auto-start simulator on boot unless explicitly paused
    if (this.simulatorStatus.isRunning !== false) { // Default to true if not set
      // We don't start the interval here directly to avoid import cycles with SimulatorEngine,
      // We will export a method to do it or rely on App.tsx. Let's rely on App.tsx or store.
      // But we set isRunning to true so UI knows.
      this.simulatorStatus.isRunning = true;
    }

    // Initialize Modbus Map & Simulator Configs
    this.modbusMap.forEach(reg => {
      const sensor = this.sensors.find(s => s.tagId === reg.tagId);
      this.modbusRegisters[reg.registerAddress] = {
        registerAddress: reg.registerAddress,
        rawValue: sensor ? sensor.value * reg.scale : 0,
        engineeringValue: sensor ? sensor.value : 0,
        quality: 'GOOD',
        lastUpdate: new Date().toISOString()
      };
      
      if (sensor) {
        this.simulatorConfigs[sensor.tagId] = {
          tagId: sensor.tagId,
          baseValue: sensor.value,
          noise: (sensor.engineeringLimits.high - sensor.engineeringLimits.low) * 0.02
        };
      }
    });

    const savedSimConfigs = localStorage.getItem('pcw_sim_configs');
    if (savedSimConfigs) {
      try {
        const parsed = JSON.parse(savedSimConfigs);
        for (const key in parsed) {
          if (this.simulatorConfigs[key]) {
            this.simulatorConfigs[key] = { ...this.simulatorConfigs[key], ...parsed[key] };
          }
        }
      } catch (e) {}
    }

    if (this.alarms.length === 0) {
      // Intentionally empty. Let SimulatorEngine generate real alarms if values exceed limits.
    }
  }

  public persist() {
    try {
      // Only persist the last 72h to localStorage to avoid QuotaExceededError.
      // Full in-memory historian (up to 200k rows) stays available during the session.
      const cutoff = Date.now() - 72 * 60 * 60 * 1000;
      const historianToSave = this.historian.filter(h => new Date(h.timestamp).getTime() >= cutoff);
      localStorage.setItem('pcw_historian', JSON.stringify(historianToSave));
      localStorage.setItem('pcw_alarms', JSON.stringify(this.alarms));
      localStorage.setItem('pcw_simulatorStatus', JSON.stringify(this.simulatorStatus));
      localStorage.setItem('pcw_predictions', JSON.stringify(this.predictions));
    } catch (e) {
      console.error('Failed to persist mock db', e);
    }
  }
}

const globalAny: any = globalThis;
if (!globalAny.__SCADA_DB) {
  globalAny.__SCADA_DB = new MockDatabase();
}
export const db = globalAny.__SCADA_DB;
