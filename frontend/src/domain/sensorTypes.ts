export interface EngineeringLimits {
  lowLow: number;
  low: number;
  high: number;
  highHigh: number;
  baseline?: number;
  /** ISA-18.2 alarm deadband (engineering units). Defaults to 1% of (H-L) span. */
  deadband?: number;
}

export type MeasurementType = 'PRESSURE' | 'TEMPERATURE' | 'FLOW' | 'LEVEL' | 'DP';
export type TagQuality = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'COMM_LOSS';

export interface SensorTag {
  tagId: string;
  displayTag: string;
  description?: string;
  systemId: string;
  submainId: string;
  measurementType: MeasurementType;
  position: 'SUPPLY' | 'RETURN' | 'TANK' | 'PUMP';
  value: number;
  unit: string;
  quality: TagQuality;
  source: 'SENSOR_SIMULATOR' | 'PLC' | 'HISTORIAN';
  timestamp: string;
  status: 'NORMAL' | 'WARNING' | 'ALARM' | 'ERROR';
  alarmState: 'NONE' | 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED_UNACK' | 'CLEARED_ACK' | 'SHELVED';
  alarmPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  engineeringLimits: EngineeringLimits;
}
