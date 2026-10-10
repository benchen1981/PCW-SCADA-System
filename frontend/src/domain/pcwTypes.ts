export interface PcwSystem {
  systemId: string;
  systemName: string;
  description: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  health: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  communicationStatus: 'CONNECTED' | 'DISCONNECTED';
  activeAlarmCount: number;
  unacknowledgedAlarmCount: number;
  driftSensorCount: number;
  totalSensorCount: number;
  supplyPressure: { min: number, max: number, avg: number };
  returnPressure: { min: number, max: number, avg: number };
  differentialPressure: { min: number, max: number, avg: number };
  supplyTemperature: number;
  returnTemperature: number;
  flow: number;
  lastUpdateTime: string;
  submains: string[]; // references to submainIds
}

export interface PcwSubmain {
  systemId: string;
  submainId: string;
  canonicalName: string;
  displayName: string;
  supplyTags: string[]; // references to tagIds
  returnTags: string[]; // references to tagIds
  pressureDifferential: number;
  status: 'NORMAL' | 'WARNING' | 'ALARM';
  alarmState: string;
  lastUpdateTime: string;
}
