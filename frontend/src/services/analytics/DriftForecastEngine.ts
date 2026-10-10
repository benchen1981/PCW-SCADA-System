/**
 * DriftForecastEngine — PCW early-warning analytics (pure, deterministic, unit-testable).
 *
 * ┌──────────────────────────── CORE METHOD (thesis / patent claim set, unchanged) ───────────────────────────┐
 * │ Window (1 point / min, oldest → newest), W = 70:                                                          │
 * │   B  = x[t-70 .. t-10)   (60 pts)  BaseAvg60 = mean(B)                                                    │
 * │   P  = x[t-10 .. t-5)    (5 pts)   R = x[t-5 .. t]  (5 pts)                                               │
 * │   Slope       = (mean(R) − mean(P)) / 5                      [unit / min]                                 │
 * │   direction d = sign(Slope)  (≥0 → up)                                                                    │
 * │   M60 = #{ x ∈ B : d·(x − BaseAvg60) > 0 }                                                                │
 * │   M10 = #{ x ∈ x[t-10..t] : d·(x − BaseAvg60) > 0 }                                                       │
 * │   N10 = M10 / (M60 / 6)     (999 if M60 = 0 ∧ M10 > 0;  0 if both 0)                                      │
 * │   Fcst_h = x_t + Slope · h,  h ∈ {10, 20, 30}                                                             │
 * │   Decision:  Fcst10 hits limit → T-10 ; Fcst20 → T-20 ; Fcst30 → T-30 ;                                   │
 * │              N10 > θ ∧ drifting → T-30 (behaviour shift)                                                  │
 * └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * INDUSTRIAL HARDENING LAYERS (v4):
 *   L1 Quality gate      — only GOOD points enter statistics; validRatio < 0.8 → INSUFFICIENT_DATA.
 *   L2 Span-normalised drift gate — |Slope|·30 ≥ g% · (H − L). The former absolute gate
 *                          |Slope| > 0.001 was unit-agnostic (too tight for bar, meaningless for LPM).
 *   L3 Forecast confidence — OLS on last 10 points → slopeOls, R², and 95 % prediction-interval
 *                          half-width  t₀.₉₇₅,ₙ₋₂ · s · √(1 + 1/n + (xₕ − x̄)² / Sxx).
 *   L4 Time-To-Limit     — minutes until the nearest not-yet-crossed limit in the slope direction.
 *   L5 EVENT state       — the measured value already beyond H/L is an EVENT, not an early warning
 *                          (keeps the KPI definition "TP = warning issued BEFORE the event" clean).
 *   L6 Hysteresis latch  — escalation immediate; de-escalation only after `releaseHold`
 *                          consecutive lower-severity evaluations (anti-chattering, ISA-18.2 spirit).
 *   L7 Risk index        — 0..100 fused score (margin, TTL, density, state floor) for ranking/heat-maps.
 */
import type { EngineeringLimits } from '../../domain/sensorTypes';
import type { PredictionResult, PredictionState } from '../../domain/predictionTypes';

export const WINDOW = 70;
export const N10_SATURATED = 999;
export const MIN_VALID_RATIO = 0.8;
const T_975_DF8 = 2.306; // Student-t, two-sided 95 %, n − 2 = 8

export interface WindowPoint {
  v: number;
  good: boolean;
}

export interface EngineParams {
  sensitivity: number; // θ for N10
  slopeGatePct: number; // g, % of (H − L) span
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function computeN10(m60: number, m10: number): number {
  if (m60 === 0 && m10 > 0) return N10_SATURATED;
  if (m60 === 0) return 0;
  return m10 / (m60 / 6);
}

/** Ordinary least squares on (0..n-1, y). */
export function ols(y: number[]) {
  const n = y.length;
  if (n < 3) return { slope: 0, intercept: y[0] ?? 0, r2: 0, s: 0, sxx: 0, xbar: 0, n };
  const xbar = (n - 1) / 2;
  const ybar = mean(y);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - xbar;
    const dy = y[i] - ybar;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxy / sxx;
  const intercept = ybar - slope * xbar;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = y[i] - (intercept + slope * i);
    sse += r * r;
  }
  const r2 = syy > 0 ? clamp01(1 - sse / syy) : 0;
  const s = Math.sqrt(sse / Math.max(1, n - 2));
  return { slope, intercept, r2, s, sxx, xbar, n };
}

/** 95 % prediction-interval half-width h minutes ahead of the last OLS sample. */
export function predictionBand(fit: ReturnType<typeof ols>, h: number) {
  if (fit.n < 3 || fit.sxx === 0) return 0;
  const xh = fit.n - 1 + h;
  return T_975_DF8 * fit.s * Math.sqrt(1 + 1 / fit.n + ((xh - fit.xbar) ** 2) / fit.sxx);
}

export function classifyLimit(val: number, L: EngineeringLimits): string | null {
  if (val >= L.highHigh) return `HH (${L.highHigh})`;
  if (val >= L.high) return `H (${L.high})`;
  if (val <= L.lowLow) return `LL (${L.lowLow})`;
  if (val <= L.low) return `L (${L.low})`;
  return null;
}

/** Minutes until the nearest limit not yet crossed in the slope direction (null if none/flat). */
export function timeToLimit(value: number, slope: number, L: EngineeringLimits, horizonCap = 1440) {
  if (!Number.isFinite(slope) || Math.abs(slope) < 1e-12) return { minutes: null, limit: null };
  const targets =
    slope > 0
      ? [
          { name: 'H', v: L.high },
          { name: 'HH', v: L.highHigh },
        ]
      : [
          { name: 'L', v: L.low },
          { name: 'LL', v: L.lowLow },
        ];
  for (const t of targets) {
    const ahead = slope > 0 ? value < t.v : value > t.v;
    if (ahead) {
      const m = (t.v - value) / slope;
      return m <= horizonCap ? { minutes: m, limit: t.name } : { minutes: null, limit: null };
    }
  }
  return { minutes: 0, limit: slope > 0 ? 'HH' : 'LL' };
}

const SEVERITY: Record<PredictionState, number> = {
  DISABLED: -2,
  INSUFFICIENT_DATA: -1,
  NORMAL: 0,
  'T-30': 1,
  'T-20': 2,
  'T-10': 3,
  EVENT: 4,
};
export const severityOf = (s: PredictionState) => SEVERITY[s] ?? 0;

/**
 * False-alarm probability of the density detector under H0 (i.i.d. symmetric noise),
 * approximating M60 ≈ 30 so the trigger becomes M10 > 5θ with M10 ~ Binomial(10, 0.5).
 * Also returns the structural ceiling N10_max = 60 / M60 (= 2.0 when M60 = 30).
 */
export function densityFalseAlarmProbability(theta: number, m60 = 30) {
  const k = Math.floor((theta * m60) / 6) + 1; // smallest M10 strictly above threshold
  let p = 0;
  const C = (n: number, r: number) => {
    let c = 1;
    for (let i = 1; i <= r; i++) c = (c * (n - r + i)) / i;
    return c;
  };
  for (let m = Math.max(0, k); m <= 10; m++) p += C(10, m) / 1024;
  return { probability: p, n10Max: 60 / m60, reachable: k <= 10 };
}

/** Stateless evaluation of one 70-minute window. */
export function evaluateWindow(
  tagId: string,
  window: WindowPoint[],
  currentValue: number,
  limits: EngineeringLimits,
  params: EngineParams,
  nowIso: string,
): PredictionResult {
  const base: PredictionResult = {
    tagId,
    evaluationTime: nowIso,
    currentValue,
    baseAvg60: 0,
    m60: 0,
    m10: 0,
    n10: 0,
    slope: 0,
    forecast30: currentValue,
    forecast20: currentValue,
    forecast10: currentValue,
    state: 'INSUFFICIENT_DATA',
    detector: 'NONE',
    riskScore: 0,
  };

  if (window.length < WINDOW) {
    return { ...base, validRatio: 0, triggerPath: `[Hold] INSUFFICIENT_DATA (need ${WINDOW} pts, have ${window.length})` };
  }
  const w = window.slice(-WINDOW);
  const validRatio = w.filter((p) => p.good).length / WINDOW;

  const good = (arr: WindowPoint[]) => arr.filter((p) => p.good).map((p) => p.v);
  const B = good(w.slice(0, 60));
  const P = good(w.slice(60, 65));
  const R = good(w.slice(65, 70));
  const last10 = good(w.slice(60, 70));

  if (validRatio < MIN_VALID_RATIO || P.length === 0 || R.length === 0 || B.length < 30) {
    return {
      ...base,
      validRatio,
      triggerPath: `[Hold] DATA_QUALITY (GOOD ratio ${(validRatio * 100).toFixed(0)}% < ${MIN_VALID_RATIO * 100}%)`,
    };
  }

  // ---- Core method ----
  const baseAvg60 = mean(B);
  const slope = (mean(R) - mean(P)) / 5;
  const up = slope >= 0;
  const above = (x: number) => (up ? x > baseAvg60 : x < baseAvg60);
  // M60 scaled to a full 60-pt window if some points were rejected by the quality gate
  const m60 = Math.round((B.filter(above).length * 60) / B.length);
  const m10 = Math.round((last10.filter(above).length * 10) / last10.length);
  const n10 = computeN10(m60, m10);

  const forecast10 = currentValue + slope * 10;
  const forecast20 = currentValue + slope * 20;
  const forecast30 = currentValue + slope * 30;

  // ---- L2: span-normalised drift gate ----
  const span = Math.max(1e-9, limits.high - limits.low);
  const excursion30 = Math.abs(slope) * 30;
  const slopeGate = excursion30 >= (params.slopeGatePct / 100) * span;
  const isDrifting = n10 > params.sensitivity && slopeGate;

  // ---- L3: confidence ----
  const fit = ols(last10);
  const band10 = predictionBand(fit, 10);
  const band20 = predictionBand(fit, 20);
  const band30 = predictionBand(fit, 30);

  // ---- L4: TTL ----
  const ttl = timeToLimit(currentValue, slope, limits);

  // ---- Decision ----
  let state: PredictionState = 'NORMAL';
  let detector: PredictionResult['detector'] = 'NONE';
  let triggerPath = 'Forecasts within limits, no density shift ➔ STABLE';
  const nowHit = currentValue >= limits.high || currentValue <= limits.low;
  const hit10 = classifyLimit(forecast10, limits);
  const hit20 = classifyLimit(forecast20, limits);
  const hit30 = classifyLimit(forecast30, limits);

  if (nowHit) {
    state = 'EVENT';
    detector = 'FORECAST';
    triggerPath = `PV (${currentValue.toFixed(3)}) beyond ${classifyLimit(currentValue, limits)} ➔ EVENT`;
  } else if (hit10) {
    state = 'T-10';
    detector = 'FORECAST';
    triggerPath = `Fcst10 (${forecast10.toFixed(3)}) reaches ${hit10} ➔ ALARM`;
  } else if (hit20) {
    state = 'T-20';
    detector = 'FORECAST';
    triggerPath = `Fcst20 (${forecast20.toFixed(3)}) reaches ${hit20} ➔ WARN`;
  } else if (hit30) {
    state = 'T-30';
    detector = 'FORECAST';
    triggerPath = `Fcst30 (${forecast30.toFixed(3)}) reaches ${hit30} ➔ WARN`;
  } else if (isDrifting) {
    state = 'T-30';
    detector = 'DENSITY';
    triggerPath = `N10 ${n10 >= N10_SATURATED ? 'SAT' : n10.toFixed(2)} > θ ${params.sensitivity} ∧ |Δ30| ${excursion30.toFixed(3)} ≥ ${params.slopeGatePct}% span ➔ WARN (Behaviour Shift)`;
  }

  // ---- L7: risk index ----
  const centre = limits.baseline ?? (limits.high + limits.low) / 2;
  const marginFactor = clamp01(Math.abs(currentValue - centre) / (span / 2));
  const ttlFactor = ttl.minutes === null ? 0 : clamp01(1 - ttl.minutes / 60);
  const densityFactor = n10 >= N10_SATURATED ? (slopeGate ? 1 : 0.3) : clamp01(n10 / Math.max(0.1, params.sensitivity)) * (slopeGate ? 1 : 0.4);
  let risk = 100 * clamp01(0.4 * marginFactor + 0.4 * ttlFactor + 0.2 * densityFactor);
  const floor: Partial<Record<PredictionState, number>> = { EVENT: 100, 'T-10': 85, 'T-20': 70, 'T-30': 50 };
  risk = Math.max(risk, floor[state] ?? 0);
  if (state === 'NORMAL') risk = Math.min(risk, 49);

  return {
    tagId,
    evaluationTime: nowIso,
    currentValue,
    baseAvg60,
    m60,
    m10,
    n10,
    slope,
    forecast10,
    forecast20,
    forecast30,
    state,
    triggerPath,
    detector,
    slopeOls: fit.slope,
    r2: fit.r2,
    band10,
    band20,
    band30,
    ttlMinutes: ttl.minutes,
    ttlLimit: ttl.limit,
    riskScore: Math.round(risk),
    validRatio,
    holdCount: 0,
  };
}

/**
 * Stateful wrapper adding L6 hysteresis. One instance per engine (keeps a latch per tag).
 */
export class DriftForecastEngine {
  private latch = new Map<string, { state: PredictionState; hold: number; lowerStreak: number }>();

  constructor(private releaseHold = 3) {}

  setReleaseHold(n: number) {
    this.releaseHold = Math.max(0, Math.floor(n));
  }

  reset(tagId?: string) {
    if (tagId) this.latch.delete(tagId);
    else this.latch.clear();
  }

  evaluate(
    tagId: string,
    window: WindowPoint[],
    currentValue: number,
    limits: EngineeringLimits,
    params: EngineParams,
    nowIso: string,
  ): PredictionResult {
    const raw = evaluateWindow(tagId, window, currentValue, limits, params, nowIso);
    if (raw.state === 'INSUFFICIENT_DATA' || raw.state === 'DISABLED') {
      this.latch.delete(tagId);
      return raw;
    }
    const prev = this.latch.get(tagId);
    if (!prev || severityOf(raw.state) >= severityOf(prev.state)) {
      const hold = prev && prev.state === raw.state ? prev.hold + 1 : 1;
      this.latch.set(tagId, { state: raw.state, hold, lowerStreak: 0 });
      return { ...raw, holdCount: raw.state === 'NORMAL' ? 0 : hold };
    }
    // Lower severity than latched state → require releaseHold consecutive confirmations
    const lowerStreak = prev.lowerStreak + 1;
    if (lowerStreak >= this.releaseHold) {
      this.latch.set(tagId, { state: raw.state, hold: 1, lowerStreak: 0 });
      return { ...raw, holdCount: raw.state === 'NORMAL' ? 0 : 1 };
    }
    this.latch.set(tagId, { ...prev, hold: prev.hold + 1, lowerStreak });
    return {
      ...raw,
      state: prev.state,
      holdCount: prev.hold + 1,
      riskScore: Math.max(raw.riskScore ?? 0, 50),
      triggerPath: `[Latched ${prev.state} ${lowerStreak}/${this.releaseHold}] ${raw.triggerPath}`,
    };
  }
}
