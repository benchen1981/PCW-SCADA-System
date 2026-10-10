import type { HistorianRecord } from '../domain/historianTypes';

/**
 * HistorianStore — per-tag fixed-capacity ring buffers backed by typed arrays.
 *
 * Why (v4 hardening):
 *  - The previous implementation kept ALL tags (raw + 8 prediction features) in one shared
 *    200k-row JS array. With 320 tags that is ~2,880 rows/min, so after ~70 min the raw
 *    series of each tag fell below the 70-point evaluation window and the prediction engine
 *    silently stalled at INSUFFICIENT_DATA. `Array.shift()` on 200k rows was also O(n).
 *  - Per-tag rings guarantee each tag's retention independently of tag count, and
 *    O(1) append / O(k) tail reads. Typed arrays keep memory ≈17 bytes / point.
 *  - Downsampling is min/max bucket based (spike preserving). Stride sampling can hide
 *    short excursions, which is unacceptable for an alarm/forensics historian.
 */

export const QUALITY_CODE = { GOOD: 0, UNCERTAIN: 1, BAD: 2, COMM_LOSS: 3 } as const;
export type QualityName = keyof typeof QUALITY_CODE;
const QUALITY_NAME: QualityName[] = ['GOOD', 'UNCERTAIN', 'BAD', 'COMM_LOSS'];

export const qualityToCode = (q: string): number =>
  (QUALITY_CODE as Record<string, number>)[q] ?? QUALITY_CODE.UNCERTAIN;
export const codeToQuality = (c: number): QualityName => QUALITY_NAME[c] ?? 'UNCERTAIN';

export interface SeriesPoint {
  t: number; // epoch ms
  v: number;
  q: number; // quality code
}

class RingSeries {
  private ts: Float64Array;
  private vs: Float64Array;
  private qs: Uint8Array;
  private head = 0; // next write index
  private size = 0;

  constructor(private capacity: number) {
    this.ts = new Float64Array(capacity);
    this.vs = new Float64Array(capacity);
    this.qs = new Uint8Array(capacity);
  }

  push(t: number, v: number, q: number) {
    this.ts[this.head] = t;
    this.vs[this.head] = v;
    this.qs[this.head] = q;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }

  get length() {
    return this.size;
  }

  private idx(i: number) {
    // i: 0 = oldest
    return (this.head - this.size + i + this.capacity) % this.capacity;
  }

  at(i: number): SeriesPoint {
    const k = this.idx(i);
    return { t: this.ts[k], v: this.vs[k], q: this.qs[k] };
  }

  firstTime(): number | null {
    return this.size ? this.ts[this.idx(0)] : null;
  }

  tail(n: number): SeriesPoint[] {
    const count = Math.min(n, this.size);
    const out: SeriesPoint[] = new Array(count);
    for (let i = 0; i < count; i++) out[i] = this.at(this.size - count + i);
    return out;
  }

  range(startMs: number, endMs: number): SeriesPoint[] {
    const out: SeriesPoint[] = [];
    // Binary search for first index with t >= startMs (series is time-ordered)
    let lo = 0;
    let hi = this.size;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.ts[this.idx(mid)] < startMs) lo = mid + 1;
      else hi = mid;
    }
    for (let i = lo; i < this.size; i++) {
      const k = this.idx(i);
      if (this.ts[k] > endMs) break;
      out.push({ t: this.ts[k], v: this.vs[k], q: this.qs[k] });
    }
    return out;
  }
}

/** Spike-preserving min/max bucket downsampling. */
export function downsampleMinMax(points: SeriesPoint[], maxPoints: number): SeriesPoint[] {
  if (points.length <= maxPoints || maxPoints < 4) return points;
  const buckets = Math.floor(maxPoints / 2);
  const size = points.length / buckets;
  const out: SeriesPoint[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size);
    const end = Math.min(points.length, Math.floor((b + 1) * size));
    if (start >= end) continue;
    let min = points[start];
    let max = points[start];
    for (let i = start + 1; i < end; i++) {
      if (points[i].v < min.v) min = points[i];
      if (points[i].v > max.v) max = points[i];
    }
    if (min === max) out.push(min);
    else if (min.t <= max.t) out.push(min, max);
    else out.push(max, min);
  }
  return out;
}

export class HistorianStore {
  private series = new Map<string, RingSeries>();

  /**
   * @param rawCapacity      points kept per raw process tag (1/min → 1440 = 24 h)
   * @param featureCapacity  points kept per derived feature tag (e.g. `_N10`)
   */
  constructor(private rawCapacity = 1440, private featureCapacity = 720) {}

  static isFeatureTag(tagId: string) {
    return tagId.includes('_');
  }

  private ring(tagId: string): RingSeries {
    let r = this.series.get(tagId);
    if (!r) {
      r = new RingSeries(HistorianStore.isFeatureTag(tagId) ? this.featureCapacity : this.rawCapacity);
      this.series.set(tagId, r);
    }
    return r;
  }

  append(tagId: string, t: number, v: number, quality: string | number = 'GOOD') {
    if (!Number.isFinite(v) || !Number.isFinite(t)) return;
    const q = typeof quality === 'number' ? quality : qualityToCode(quality);
    this.ring(tagId).push(t, v, q);
  }

  count(tagId: string) {
    return this.series.get(tagId)?.length ?? 0;
  }

  firstTime(tagId: string) {
    return this.series.get(tagId)?.firstTime() ?? null;
  }

  tail(tagId: string, n: number): SeriesPoint[] {
    return this.series.get(tagId)?.tail(n) ?? [];
  }

  range(tagId: string, startMs: number, endMs: number): SeriesPoint[] {
    return this.series.get(tagId)?.range(startMs, endMs) ?? [];
  }

  /** Backward compatible query returning HistorianRecord rows (ISO timestamps). */
  query(tagIds: string[], startIso: string, endIso: string, maxPointsPerTag = 2000): HistorianRecord[] {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    const out: HistorianRecord[] = [];
    for (const tagId of tagIds) {
      const pts = downsampleMinMax(this.range(tagId, s, e), maxPointsPerTag);
      for (const p of pts) {
        out.push({ tagId, timestamp: new Date(p.t).toISOString(), value: p.v, quality: codeToQuality(p.q) });
      }
    }
    return out;
  }

  clear() {
    this.series.clear();
  }

  /** Replace a tag's whole series (points must be time-ordered). */
  replace(tagId: string, pts: SeriesPoint[]) {
    this.series.delete(tagId);
    for (const p of pts) this.append(tagId, p.t, p.v, p.q);
  }

  tagIds() {
    return Array.from(this.series.keys());
  }

  /** Compact snapshot of raw tags for localStorage (≈20 bytes / point). */
  snapshot(windowMinutes: number): Record<string, [number, number, number][]> {
    const cutoff = Date.now() - windowMinutes * 60_000;
    const snap: Record<string, [number, number, number][]> = {};
    for (const [tagId, ring] of this.series) {
      if (HistorianStore.isFeatureTag(tagId)) continue;
      const pts = ring.range(cutoff, Number.POSITIVE_INFINITY);
      snap[tagId] = pts.map((p) => [Math.round(p.t / 1000), Math.round(p.v * 1e4) / 1e4, p.q]);
    }
    return snap;
  }

  restore(snap: Record<string, [number, number, number][]>) {
    for (const tagId of Object.keys(snap)) {
      for (const [ts, v, q] of snap[tagId]) this.append(tagId, ts * 1000, v, q);
    }
  }
}
