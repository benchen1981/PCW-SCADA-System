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

/** Fault scenarios that can be injected into a simulated loop (for drift-detection validation). */
export type FaultScenario = 'NONE' | 'DRIFT' | 'STEP' | 'SPIKE' | 'BAD_QUALITY' | 'COMM_LOSS';

export interface SimulatorConfig {
  tagId: string;
  baseValue: number;
  noise: number;
  /** Active fault scenario */
  scenario?: FaultScenario;
  /** DRIFT: ramp rate in engineering units per minute (signed) */
  driftRatePerMin?: number;
  /** STEP: constant offset in engineering units */
  stepOffset?: number;
  /** SPIKE: amplitude in engineering units; probability per tick */
  spikeAmplitude?: number;
  spikeProbability?: number;
  /** epoch ms when the current scenario was injected (ground truth for KPI evaluation) */
  scenarioStartedAt?: number | null;
}

export interface ModbusRegisterValue {
  registerAddress: number;
  rawValue: number;
  engineeringValue: number;
  quality: 'GOOD' | 'BAD' | 'UNCERTAIN' | 'COMM_LOSS';
  lastUpdate: string;
}
