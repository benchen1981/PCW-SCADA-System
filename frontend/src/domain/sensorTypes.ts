export interface EngineeringLimits {
  lowLow: number;
  low: number;
  high: number;
  highHigh: number;
  baseline?: number;
}

export interface SensorTag {
  tagId: string;
  displayTag: string;
  systemId: string;
  submainId: string;
  measurementType: 'PRESSURE' | 'TEMPERATURE' | 'FLOW' | 'LEVEL';
  position: 'SUPPLY' | 'RETURN' | 'TANK' | 'PUMP';
  value: number;
  unit: string;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  source: 'SENSOR_SIMULATOR' | 'PLC' | 'HISTORIAN';
  timestamp: string;
  status: 'NORMAL' | 'WARNING' | 'ALARM' | 'ERROR';
  alarmState: 'NONE' | 'HIHI' | 'HI' | 'LO' | 'LOLO';
  alarmPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  engineeringLimits: EngineeringLimits;
}
