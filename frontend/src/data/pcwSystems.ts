import type { PcwSystem } from '../domain/pcwTypes';

export const initialPcwSystems: PcwSystem[] = Array.from({ length: 8 }).map((_, i) => ({
  systemId: `PCW0${i + 1}`,
  systemName: `PCW System 0${i + 1}`,
  description: `Main Process Cooling Water Loop ${i + 1}`,
  status: 'ONLINE',
  health: 'HEALTHY',
  communicationStatus: 'CONNECTED',
  activeAlarmCount: 0,
  unacknowledgedAlarmCount: 0,
  driftSensorCount: 0,
  totalSensorCount: 40,
  supplyPressure: { min: 1.45, max: 1.45, avg: 1.45 },
  returnPressure: { min: 1.20, max: 1.20, avg: 1.20 },
  differentialPressure: { min: 0.25, max: 0.25, avg: 0.25 },
  supplyTemperature: 20.0,
  returnTemperature: 25.0,
  flow: 1000.0,
  lastUpdateTime: new Date().toISOString(),
  submains: Array.from({ length: 20 }).map((_, j) => `PCW0${i + 1}.Submain${String(j + 1).padStart(2, '0')}`)
}));
