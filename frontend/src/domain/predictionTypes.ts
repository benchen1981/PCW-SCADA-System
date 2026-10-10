/**
 * Prediction domain model.
 *
 * Core features (thesis / patent claim set):
 *   - BaseAvg60, M60, M10, N10  : Anomaly-density drift detection
 *   - Slope, Fcst10/20/30       : Linear trend forecast (two-window slope)
 *
 * Industrial hardening extensions (v4):
 *   - slopeOls / r2             : OLS regression slope & goodness-of-fit (forecast confidence)
 *   - band10/20/30              : 95% prediction-interval half-width of each forecast
 *   - ttlMinutes / ttlLimit     : Time-To-Limit, minutes until the nearest limit is crossed
 *   - riskScore                 : 0..100 fused drift-risk index for ranking & heat-maps
 *   - validRatio                : fraction of GOOD-quality points inside the evaluation window
 */
export type PredictionState =
  | 'NORMAL'
  | 'T-30'
  | 'T-20'
  | 'T-10'
  | 'EVENT'
  | 'DISABLED'
  | 'INSUFFICIENT_DATA';

export interface PredictionResult {
  tagId: string;
  evaluationTime: string;
  currentValue: number;
  baseAvg60: number;
  m60: number;
  m10: number;
  n10: number;
  slope: number;
  forecast30: number;
  forecast20: number;
  forecast10: number;
  state: PredictionState;
  triggerPath?: string;

  // ---- v4 extensions (optional for backward compatibility with persisted data / backend) ----
  slopeOls?: number;
  r2?: number;
  band10?: number;
  band20?: number;
  band30?: number;
  ttlMinutes?: number | null;
  ttlLimit?: string | null;
  riskScore?: number;
  validRatio?: number;
  /** Detector that fired: FORECAST (limit crossing) / DENSITY (N10 behaviour shift) / NONE */
  detector?: 'FORECAST' | 'DENSITY' | 'NONE';
  /** Number of consecutive evaluations the current non-normal state has been held */
  holdCount?: number;
}

export interface PredictionConfig {
  global: boolean;
  systems: Record<string, boolean>;
  submains: Record<string, boolean>;
  sensors: Record<string, boolean>;
  /** Global N10 density threshold */
  sensitivity: number;
  /** Per-sensor N10 threshold override */
  sensorSensitivity: Record<string, number>;
  /** Minimum projected 30-min excursion, as % of (H-L) span, for a slope to count as drift */
  slopeGatePct?: number;
  /** Consecutive NORMAL evaluations required before a latched warning is released */
  releaseHold?: number;
}

export const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  global: true,
  systems: {},
  submains: {},
  sensors: {},
  sensitivity: 2,
  sensorSensitivity: {},
  slopeGatePct: 5,
  releaseHold: 3,
};
