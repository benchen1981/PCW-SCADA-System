export interface ModbusRegisterDefinition {
  registerAddress: number;
  tagId: string;
  dataType: 'FLOAT32' | 'INT16' | 'UINT16';
  unit: string;
  scale: number;
  min: number;
  max: number;
  access: 'READ_ONLY' | 'READ_WRITE';
  source: string;
}

export interface SimulatorConfig {
  tagId: string;
  baseValue: number;
  noise: number;
}

export interface ModbusRegisterValue {
  registerAddress: number;
  rawValue: number;
  engineeringValue: number;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN';
  lastUpdate: string;
}
