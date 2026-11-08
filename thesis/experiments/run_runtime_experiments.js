/**
 * run_runtime_experiments.js
 * ---------------------------------------------------------------------------
 * Reproducible experiments that execute the *actual production* DriftForecastEngine
 * (compiled verbatim from frontend/src/services/analytics/DriftForecastEngine.ts via tsc)
 * and the actual downsampleMinMax (frontend/src/repositories/HistorianStore.ts).
 *
 * The signal generator reproduces SimulatorEngine.ts exactly:
 *   1-s sample  = base + (U - 0.5) * noise,  noise = 0.02 * (H - L)   (uniform)
 *   DRIFT       : + rate * minutesSinceInjection
 *   STEP        : + offset
 *   SPIKE       : with prob p, +/- amplitude
 *   1-min value = mean of the 60 GOOD 1-s samples (historian point)
 *   engine input: last 70 minute points + current (last 1-s) value
 *
 * Outputs: thesis/experiments/results/runtime_results.json
 * Run:     node thesis/experiments/run_runtime_experiments.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { DriftForecastEngine, evaluateWindow } = require('./ts_build/services/analytics/DriftForecastEngine.js');
const { downsampleMinMax } = require('./ts_build/repositories/HistorianStore.js');

const OUT = path.join(__dirname, 'results');
fs.mkdirSync(OUT, { recursive: true });

// ---- deterministic PRNG (mulberry32) ----
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Engineering limits exactly as frontend/src/data/sensorDefinitions.ts (PT) ----
const GROUPS = {
  G1: { lowLow: 1.2, low: 1.3, high: 1.7, highHigh: 1.8, baseline: 1.5 }, // PCW01/02
  G2: { lowLow: 1.5, low: 1.7, high: 2.1, highHigh: 2.2, baseline: 1.9 }, // PCW03/04
  G3: { lowLow: 2.2, low: 2.3, high: 2.7, highHigh: 2.8, baseline: 2.5 }, // PCW05/06
  G4: { lowLow: 1.9, low: 2.0, high: 2.4, highHigh: 2.5, baseline: 2.2 }, // PCW07/08
};
const DEFAULT_PARAMS = { sensitivity: 2, slopeGatePct: 5 }; // DEFAULT_PREDICTION_CONFIG
const WARMUP_MIN = 120; // steady-state minutes before injection (historian fully live)
const OBS_MIN = 300; // observation minutes after injection

const isWarn = (s) => s === 'T-30' || s === 'T-20' || s === 'T-10';

/** Simulate one run; returns per-minute engine states and timing metrics. */
function simulateRun(L, scenario, opt, seed, params = DEFAULT_PARAMS, releaseHold = 3) {
  const r = rng(seed);
  const span = L.high - L.low;
  const noise = 0.02 * span;
  const engine = new DriftForecastEngine(releaseHold);
  const hist = [];
  let firstWarn = null, firstWarnState = null, firstEvent = null, firstHardAlarm = null;
  let warnMinutes = 0;
  const states = [];
  const total = WARMUP_MIN + OBS_MIN;
  for (let m = 0; m < total; m++) {
    let sum = 0, last = L.baseline;
    for (let s = 0; s < 60; s++) {
      let v = L.baseline + (r() - 0.5) * noise;
      const minsSince = m - WARMUP_MIN + s / 60;
      if (minsSince >= 0) {
        if (scenario === 'DRIFT') v += opt.rate * minsSince;
        else if (scenario === 'STEP') v += opt.offset;
        else if (scenario === 'SPIKE') { if (r() < opt.prob) v += (r() < 0.5 ? -1 : 1) * opt.amp; }
      }
      sum += v; last = v;
    }
    hist.push({ v: sum / 60, good: true });
    if (hist.length < 70) continue;
    const res = engine.evaluate('X', hist.slice(-70), last, L, params, new Date(m * 60000).toISOString());
    const t = m - WARMUP_MIN; // minutes since injection (negative = warm-up)
    states.push({ t, state: res.state, v: last, n10: res.n10, slope: res.slope, ttl: res.ttlMinutes });
    // hard alarm reference: first minute whose current value is beyond H/L (static SCADA limit)
    if (t >= 0 && firstHardAlarm === null && (last >= L.high || last <= L.low)) firstHardAlarm = t;
    if (t >= 0) {
      if (isWarn(res.state)) {
        warnMinutes++;
        if (firstWarn === null && firstHardAlarm === null) { firstWarn = t; firstWarnState = res.state; }
      }
      if (res.state === 'EVENT' && firstEvent === null) firstEvent = t;
    }
  }
  // warm-up false warnings (steady state, no fault)
  const warmupWarn = states.filter((x) => x.t < 0 && isWarn(x.state)).length;
  const warmupEvals = states.filter((x) => x.t < 0).length;
  return { firstWarn, firstWarnState, firstEvent, firstHardAlarm, warnMinutes, warmupWarn, warmupEvals, states };
}

const pct = (a, q) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const sd = (a) => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };

// ===========================================================================
// E2 — Monte Carlo fault-injection experiment (runtime engine, default params)
// ===========================================================================
const RUNS = 50; // per group per scenario  → 4 groups × 50 = 200 runs per scenario
const scenarios = [];
for (const frac of [0.002, 0.005, 0.01, 0.02]) {
  scenarios.push({ name: `DRIFT_UP ${frac * 100}%span/min`, kind: 'DRIFT', positive: true, rel: { rate: frac } });
  scenarios.push({ name: `DRIFT_DOWN ${frac * 100}%span/min`, kind: 'DRIFT', positive: true, rel: { rate: -frac } });
}
scenarios.push({ name: 'STEP_SMALL +10%span', kind: 'STEP', positive: false, rel: { offset: 0.1 } });
scenarios.push({ name: 'STEP_LARGE +60%span', kind: 'STEP', positive: true, rel: { offset: 0.6 } });
scenarios.push({ name: 'SPIKE 10%span p=0.05', kind: 'SPIKE', positive: false, rel: { amp: 0.1, prob: 0.05 } });
scenarios.push({ name: 'SPIKE 25%span p=0.05', kind: 'SPIKE', positive: false, rel: { amp: 0.25, prob: 0.05 } });
scenarios.push({ name: 'NONE (steady)', kind: 'NONE', positive: false, rel: {} });

function scaled(rel, L) {
  const span = L.high - L.low;
  const o = {};
  if ('rate' in rel) o.rate = rel.rate * span;
  if ('offset' in rel) o.offset = rel.offset * span;
  if ('amp' in rel) { o.amp = rel.amp * span; o.prob = rel.prob; }
  return o;
}

console.log('E2 Monte Carlo ...');
const e2 = [];
let seed = 20261101;
let steadyWarn = 0, steadyEvals = 0;
const exampleTraces = {};
for (const sc of scenarios) {
  const leads = [], leadByState = { 'T-30': 0, 'T-20': 0, 'T-10': 0 };
  let runs = 0, warned = 0, warnedBeforeAlarm = 0, alarmReached = 0, anyWarn = 0, events = 0, ttlErr = [];
  for (const [g, L] of Object.entries(GROUPS)) {
    for (let k = 0; k < RUNS; k++) {
      const res = simulateRun(L, sc.kind, scaled(sc.rel, L), seed++);
      runs++;
      steadyWarn += res.warmupWarn; steadyEvals += res.warmupEvals;
      if (res.firstHardAlarm !== null) alarmReached++;
      if (res.warnMinutes > 0) anyWarn++;
      if (res.firstEvent !== null) events++;
      if (res.firstWarn !== null) {
        warned++;
        if (res.firstHardAlarm !== null) {
          warnedBeforeAlarm++;
          leads.push(res.firstHardAlarm - res.firstWarn);
          leadByState[res.firstWarnState]++;
        }
      }
      // TTL error: at the first warning minute, compare predicted TTL vs actual remaining minutes
      if (res.firstWarn !== null && res.firstHardAlarm !== null) {
        const st = res.states.find((x) => x.t === res.firstWarn);
        if (st && st.ttl !== null && st.ttl !== undefined) ttlErr.push(Math.abs(st.ttl - (res.firstHardAlarm - res.firstWarn)));
      }
      if (k === 0 && g === 'G1') exampleTraces[sc.name] = res.states.map((x) => [x.t, +x.v.toFixed(5), x.state]);
    }
  }
  e2.push({
    scenario: sc.name, kind: sc.kind, positive: sc.positive, runs,
    hardAlarmReached: alarmReached, runsWithAnyWarning: anyWarn, runsWithEvent: events,
    warnedBeforeHardAlarm: warnedBeforeAlarm,
    detectionRateBeforeAlarm: alarmReached ? warnedBeforeAlarm / alarmReached : null,
    leadTime: { n: leads.length, mean: mean(leads), sd: sd(leads), min: leads.length ? Math.min(...leads) : null, p50: pct(leads, 0.5), max: leads.length ? Math.max(...leads) : null },
    firstWarningLevel: leadByState,
    ttlAbsErrAtFirstWarning: { n: ttlErr.length, mean: mean(ttlErr), p50: pct(ttlErr, 0.5) },
    leads,
  });
  console.log(' ', sc.name, 'alarm', alarmReached, 'warnedBefore', warnedBeforeAlarm, 'anyWarn', anyWarn, 'lead', mean(leads));
}

// ===========================================================================
// E3 — Sensitivity of runtime parameters (θ, g) on representative scenarios
// ===========================================================================
console.log('E3 sensitivity ...');
const e3 = [];
const SENS_RUNS = 25;
for (const theta of [1.2, 1.4, 1.6, 1.8, 2.0]) {
  for (const g of [2.5, 5, 10]) {
    const params = { sensitivity: theta, slopeGatePct: g };
    let dPos = 0, dAlarm = 0, leads = [], fpRuns = 0, negRuns = 0, densityFirst = 0;
    for (const [gid, L] of Object.entries(GROUPS)) {
      for (let k = 0; k < SENS_RUNS; k++) {
        for (const rate of [0.005, -0.005]) {
          const res = simulateRun(L, 'DRIFT', { rate: rate * (L.high - L.low) }, 900000 + k * 7 + (rate > 0 ? 1 : 2), params);
          if (res.firstHardAlarm !== null) {
            dAlarm++;
            if (res.firstWarn !== null) { dPos++; leads.push(res.firstHardAlarm - res.firstWarn); }
          }
        }
        for (const sc of ['NONE', 'SPIKE']) {
          const res = simulateRun(L, sc, sc === 'SPIKE' ? { amp: 0.1 * (L.high - L.low), prob: 0.05 } : {}, 800000 + k * 11 + (sc === 'NONE' ? 3 : 5), params);
          negRuns++;
          if (res.warnMinutes > 0) fpRuns++;
        }
      }
    }
    e3.push({ theta, slopeGatePct: g, recall: dAlarm ? dPos / dAlarm : null, meanLead: mean(leads), falseWarningRunRate: fpRuns / negRuns, positives: dAlarm, negatives: negRuns });
  }
}

// ===========================================================================
// E4 — Analytical H0 false-alarm probability of the density detector (engine fn)
// ===========================================================================
const { densityFalseAlarmProbability } = require('./ts_build/services/analytics/DriftForecastEngine.js');
const e4 = [1.2, 1.4, 1.6, 1.8, 2.0].map((th) => ({ theta: th, ...densityFalseAlarmProbability(th, 30) }));

// ===========================================================================
// E5 — Cross-implementation consistency: TS engine vs. Python port (vectors)
// ===========================================================================
console.log('E5 vectors ...');
const vec = [];
const rv = rng(4242);
for (let i = 0; i < 2000; i++) {
  const gid = ['G1', 'G2', 'G3', 'G4'][i % 4];
  const L = GROUPS[gid];
  const span = L.high - L.low;
  const kind = i % 3;
  const rate = (rv() - 0.5) * 0.04 * span;
  const w = [];
  for (let j = 0; j < 70; j++) {
    let v = L.baseline + (rv() - 0.5) * 0.02 * span * 0.3;
    if (kind === 1) v += rate * Math.max(0, j - 40);
    if (kind === 2 && j > 55) v += (rv() < 0.5 ? 1 : -1) * 0.05 * span;
    w.push({ v, good: rv() > 0.03 });
  }
  const cur = w[69].v + (rv() - 0.5) * 0.001;
  const out = evaluateWindow('V', w, cur, L, DEFAULT_PARAMS, '2026-11-01T00:00:00Z');
  vec.push({ gid, window: w, current: cur, out: { state: out.state, baseAvg60: out.baseAvg60, slope: out.slope, m60: out.m60, m10: out.m10, n10: out.n10, forecast10: out.forecast10, forecast20: out.forecast20, forecast30: out.forecast30, slopeOls: out.slopeOls ?? null, r2: out.r2 ?? null, band30: out.band30 ?? null, ttl: out.ttlMinutes ?? null, risk: out.riskScore } });
}
fs.writeFileSync(path.join(OUT, 'engine_vectors.json'), JSON.stringify({ limits: GROUPS, params: DEFAULT_PARAMS, vectors: vec }));

// ===========================================================================
// E6 — downsampleMinMax benchmark (Node.js, measured on this machine)
// ===========================================================================
console.log('E6 downsampling ...');
const e6 = [];
for (const N of [10000, 50000, 100000, 500000, 1000000]) {
  const r = rng(N);
  const pts = new Array(N);
  for (let i = 0; i < N; i++) pts[i] = { t: i * 60000, v: 1.5 + (r() - 0.5) * 0.008, q: 0 };
  const spikeIdx = Math.floor(N * 0.37) + 3; // +3: not aligned with decimation stride
  pts[spikeIdx] = { t: spikeIdx * 60000, v: 1.95, q: 0 }; // single-point water-hammer spike
  const dipIdx = Math.floor(N * 0.81) + 7;
  pts[dipIdx] = { t: dipIdx * 60000, v: 1.05, q: 0 };
  for (let w = 0; w < 3; w++) downsampleMinMax(pts, 1000); // warm-up JIT
  const reps = 20;
  const t0 = process.hrtime.bigint();
  let out;
  for (let k = 0; k < reps; k++) out = downsampleMinMax(pts, 1000);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / reps;
  // naive stride decimation for comparison (keeps every k-th point)
  const stride = Math.ceil(N / 1000);
  const dec = pts.filter((_, i) => i % stride === 0);
  e6.push({
    N, outPoints: out.length, msPerCall: +ms.toFixed(3),
    spikeKept: out.some((p) => p.v === 1.95), dipKept: out.some((p) => p.v === 1.05),
    strideSpikeKept: dec.some((p) => p.v === 1.95), strideDipKept: dec.some((p) => p.v === 1.05),
    timeOrdered: out.every((p, i) => i === 0 || p.t >= out[i - 1].t),
  });
}

const env = { node: process.version, platform: `${os.type()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, cpuCount: os.cpus().length, memGB: +(os.totalmem() / 2 ** 30).toFixed(1), runAt: new Date().toISOString() };

fs.writeFileSync(path.join(OUT, 'runtime_results.json'), JSON.stringify({
  env, config: { groups: GROUPS, defaultParams: DEFAULT_PARAMS, releaseHold: 3, warmupMin: WARMUP_MIN, obsMin: OBS_MIN, runsPerGroup: RUNS, steadyNoise: '0.02*(H-L) uniform peak-to-peak per 1-s sample; 1-min mean' },
  steadyState: { warnEvaluations: steadyWarn, evaluations: steadyEvals, perMinuteFalseWarningRate: steadyWarn / steadyEvals },
  e2, e3, e4, e6, exampleTraces,
}, null, 1));
console.log('DONE ->', path.join(OUT, 'runtime_results.json'));
