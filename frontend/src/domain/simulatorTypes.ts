export interface SimulatorConfig {
  tagId: string;
  enabled: boolean;
  baseValue: number;
  noiseStd: number;
  driftRate: number;
  driftEnabled: boolean;
}
