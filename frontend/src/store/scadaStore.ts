import { create } from 'zustand';
import { pcwDataService } from '../services/PcwDataService';
import { wsClient } from '../api/WebSocketClient';
import { API_CONFIG } from '../api/config';
import type { PcwSystem, PcwSubmain } from '../domain/pcwTypes';
import type { SensorTag } from '../domain/sensorTypes';
import type { AlarmEvent } from '../domain/alarmTypes';
import type { PredictionResult } from '../domain/predictionTypes';
import type { ModbusRegisterValue, SimulatorConfig, ModbusRegisterDefinition } from '../domain/modbusTypes';

interface ScadaState {
  systems: PcwSystem[];
  submains: PcwSubmain[];
  sensors: SensorTag[];
  alarms: AlarmEvent[];
  predictions: PredictionResult[];
  predictionConfig: any;
  modbus: Record<number, ModbusRegisterValue>;
  modbusMap: ModbusRegisterDefinition[];
  simulatorConfigs: Record<string, SimulatorConfig>;
  simulatorStatus: any;
  modbusWriteLog: string[];
  historyData: any[]; // query cache for historian
  lastFetch: string;
  isFetching: boolean;
  selectedGlobalTag: string | null;
  
  // Actions
  openTagDetail: (tagId: string) => void;
  closeTagDetail: () => void;
  fetchAllData: () => Promise<void>;
  fetchSensorHistory: (tags: string[], start: string, end: string) => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  acknowledgeAlarm: (alarmId: string, user: string) => Promise<void>;
  acknowledgeAllAlarms: (user: string) => Promise<void>;
  shelveAlarm: (alarmId: string) => Promise<void>;
  setSimulatorControl: (action: 'START' | 'PAUSE' | 'RESET', interval?: number) => Promise<void>;
  updateSimulatorConfig: (tagIds: string[], updates: Partial<SimulatorConfig>) => Promise<void>;
  updateSensorLimits: (tagIds: string[], limits: Partial<any>) => Promise<void>;
  updatePredictionConfig: (type: 'global' | 'system' | 'submain' | 'sensor', id: string, enabled: boolean) => Promise<void>;
  updatePredictionSensitivity: (val: number) => Promise<void>;
  updateSensorSensitivity: (tagId: string, val: number | null) => Promise<void>;
}

let pollingInterval: any = null;

export const useScadaStore = create<ScadaState>((set, get) => ({
  systems: [],
  submains: [],
  sensors: [],
  alarms: [],
  predictions: [],
  predictionConfig: { global: true, systems: {}, submains: {}, sensors: {} },
  modbus: {},
  modbusMap: [],
  simulatorConfigs: {},
  simulatorStatus: { isRunning: false, iteration: 0, updateIntervalMs: 1000 },
  modbusWriteLog: [],
  historyData: [],
  lastFetch: '',
  isFetching: false,
  selectedGlobalTag: null,

  openTagDetail: (tagId: string) => set({ selectedGlobalTag: tagId }),
  closeTagDetail: () => set({ selectedGlobalTag: null }),

  fetchAllData: async () => {
    set({ isFetching: true });
    try {
      const [systems, submains, sensors, alarms, predictions, modbus, modbusMap, simulatorConfigs, simulatorStatus, modbusWriteLog, predictionConfig] = await Promise.all([
        pcwDataService.getAllSystems(),
        pcwDataService.getAllSubmains(),
        pcwDataService.getLatestSensorValues(),
        pcwDataService.getActiveAlarms(),
        pcwDataService.getPredictionResults(),
        pcwDataService.getModbusRegisters(),
        pcwDataService.getModbusMap(),
        pcwDataService.getSimulatorConfigs(),
        pcwDataService.getSimulatorStatus(),
        pcwDataService.getModbusWriteLog(),
        pcwDataService.getPredictionConfig()
      ]);
      set({ 
        systems, 
        submains, 
        sensors, 
        alarms, 
        predictions,
        modbus,
        modbusMap,
        simulatorConfigs,
        simulatorStatus,
        modbusWriteLog,
        predictionConfig,
        lastFetch: new Date().toISOString(),
        isFetching: false 
      });
    } catch (error) {
      console.error('Failed to fetch SCADA data', error);
      set({ isFetching: false });
    }
  },

  fetchSensorHistory: async (tags: string[], start: string, end: string) => {
    try {
      const records = await pcwDataService.getSensorHistory(tags, start, end);
      // Pivot data by timestamp for Recharts
      const pivot: Record<string, any> = {};
      records.forEach(r => {
        const iso = new Date(r.timestamp).toISOString();
        if (!pivot[iso]) pivot[iso] = { isoTime: iso, timestamp: new Date(r.timestamp).toLocaleTimeString() };
        pivot[iso][r.tagId] = r.value;
      });
      const chartData = Object.values(pivot).sort((a, b) => a.isoTime.localeCompare(b.isoTime));
      set({ historyData: chartData });
    } catch (e) {
      console.error('Failed to fetch history', e);
      set({ historyData: [] });
    }
  },

  startPolling: (intervalMs = 1000) => {
    const { fetchAllData, stopPolling } = get();
    stopPolling();
    
    if (API_CONFIG.USE_MOCK) {
      // POC MODE: Poll the mock SimulatorEngine
      fetchAllData();
      pollingInterval = setInterval(fetchAllData, intervalMs);
    } else {
      // PROD MODE: Connect WebSocket for real-time push
      wsClient.connect();
      
      // Fetch initial state via REST
      fetchAllData();
      
      // Setup WS listeners to update store directly without full poll
      wsClient.subscribe('SENSOR_UPDATE', (payload) => {
        // In a real app: merge new sensor values into the store
        // set(state => ({ sensors: merge(state.sensors, payload) }))
      });
      
      wsClient.subscribe('ALARM_UPDATE', (payload) => {
        // Update alarms list
      });
      
      wsClient.subscribe('SYSTEM_UPDATE', (payload) => {
        // Update system health statuses
      });
    }
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    // Note: Can disconnect WS here if user leaves SCADA entirely
    // wsClient.disconnect();
  },

  acknowledgeAlarm: async (alarmId: string, user: string) => {
    await pcwDataService.acknowledgeAlarm(alarmId, user);
    get().fetchAllData(); // Refresh immediately
  },

  acknowledgeAllAlarms: async (user: string) => {
    await pcwDataService.acknowledgeAllAlarms(user);
    get().fetchAllData();
  },

  shelveAlarm: async (alarmId: string) => {
    await pcwDataService.shelveAlarm(alarmId);
    get().fetchAllData(); // Refresh immediately
  },

  setSimulatorControl: async (action, interval) => {
    await pcwDataService.setSimulatorControl(action, interval);
    get().fetchAllData();
  },

  updateSimulatorConfig: async (tagIds, updates) => {
    await pcwDataService.updateSimulatorConfig(tagIds, updates);
    get().fetchAllData();
  },

  updateSensorLimits: async (tagIds, limits) => {
    await pcwDataService.updateSensorLimits(tagIds, limits);
    get().fetchAllData();
  },

  updatePredictionConfig: async (type, id, enabled) => {
    await pcwDataService.updatePredictionConfig(type, id, enabled);
    get().fetchAllData();
  },

  updatePredictionSensitivity: async (val: number) => {
    await pcwDataService.updatePredictionSensitivity(val);
    get().fetchAllData();
  },

  updateSensorSensitivity: async (tagId: string, val: number | null) => {
    await pcwDataService.updateSensorSensitivity(tagId, val);
    get().fetchAllData();
  }
}));
