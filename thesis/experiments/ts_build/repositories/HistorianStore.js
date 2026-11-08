"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistorianStore = exports.codeToQuality = exports.qualityToCode = exports.QUALITY_CODE = void 0;
exports.downsampleMinMax = downsampleMinMax;
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
exports.QUALITY_CODE = { GOOD: 0, UNCERTAIN: 1, BAD: 2, COMM_LOSS: 3 };
const QUALITY_NAME = ['GOOD', 'UNCERTAIN', 'BAD', 'COMM_LOSS'];
const qualityToCode = (q) => exports.QUALITY_CODE[q] ?? exports.QUALITY_CODE.UNCERTAIN;
exports.qualityToCode = qualityToCode;
const codeToQuality = (c) => QUALITY_NAME[c] ?? 'UNCERTAIN';
exports.codeToQuality = codeToQuality;
class RingSeries {
    constructor(capacity) {
        this.capacity = capacity;
        this.head = 0; // next write index
        this.size = 0;
        this.ts = new Float64Array(capacity);
        this.vs = new Float64Array(capacity);
        this.qs = new Uint8Array(capacity);
    }
    push(t, v, q) {
        this.ts[this.head] = t;
        this.vs[this.head] = v;
        this.qs[this.head] = q;
        this.head = (this.head + 1) % this.capacity;
        if (this.size < this.capacity)
            this.size++;
    }
    get length() {
        return this.size;
    }
    idx(i) {
        // i: 0 = oldest
        return (this.head - this.size + i + this.capacity) % this.capacity;
    }
    at(i) {
        const k = this.idx(i);
        return { t: this.ts[k], v: this.vs[k], q: this.qs[k] };
    }
    firstTime() {
        return this.size ? this.ts[this.idx(0)] : null;
    }
    tail(n) {
        const count = Math.min(n, this.size);
        const out = new Array(count);
        for (let i = 0; i < count; i++)
            out[i] = this.at(this.size - count + i);
        return out;
    }
    range(startMs, endMs) {
        const out = [];
        // Binary search for first index with t >= startMs (series is time-ordered)
        let lo = 0;
        let hi = this.size;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (this.ts[this.idx(mid)] < startMs)
                lo = mid + 1;
            else
                hi = mid;
        }
        for (let i = lo; i < this.size; i++) {
            const k = this.idx(i);
            if (this.ts[k] > endMs)
                break;
            out.push({ t: this.ts[k], v: this.vs[k], q: this.qs[k] });
        }
        return out;
    }
}
/** Spike-preserving min/max bucket downsampling. */
function downsampleMinMax(points, maxPoints) {
    if (points.length <= maxPoints || maxPoints < 4)
        return points;
    const buckets = Math.floor(maxPoints / 2);
    const size = points.length / buckets;
    const out = [];
    for (let b = 0; b < buckets; b++) {
        const start = Math.floor(b * size);
        const end = Math.min(points.length, Math.floor((b + 1) * size));
        if (start >= end)
            continue;
        let min = points[start];
        let max = points[start];
        for (let i = start + 1; i < end; i++) {
            if (points[i].v < min.v)
                min = points[i];
            if (points[i].v > max.v)
                max = points[i];
        }
        if (min === max)
            out.push(min);
        else if (min.t <= max.t)
            out.push(min, max);
        else
            out.push(max, min);
    }
    return out;
}
class HistorianStore {
    /**
     * @param rawCapacity      points kept per raw process tag (1/min → 1440 = 24 h)
     * @param featureCapacity  points kept per derived feature tag (e.g. `_N10`)
     */
    constructor(rawCapacity = 1440, featureCapacity = 720) {
        this.rawCapacity = rawCapacity;
        this.featureCapacity = featureCapacity;
        this.series = new Map();
    }
    static isFeatureTag(tagId) {
        return tagId.includes('_');
    }
    ring(tagId) {
        let r = this.series.get(tagId);
        if (!r) {
            r = new RingSeries(HistorianStore.isFeatureTag(tagId) ? this.featureCapacity : this.rawCapacity);
            this.series.set(tagId, r);
        }
        return r;
    }
    append(tagId, t, v, quality = 'GOOD') {
        if (!Number.isFinite(v) || !Number.isFinite(t))
            return;
        const q = typeof quality === 'number' ? quality : (0, exports.qualityToCode)(quality);
        this.ring(tagId).push(t, v, q);
    }
    count(tagId) {
        return this.series.get(tagId)?.length ?? 0;
    }
    firstTime(tagId) {
        return this.series.get(tagId)?.firstTime() ?? null;
    }
    tail(tagId, n) {
        return this.series.get(tagId)?.tail(n) ?? [];
    }
    range(tagId, startMs, endMs) {
        return this.series.get(tagId)?.range(startMs, endMs) ?? [];
    }
    /** Backward compatible query returning HistorianRecord rows (ISO timestamps). */
    query(tagIds, startIso, endIso, maxPointsPerTag = 2000) {
        const s = new Date(startIso).getTime();
        const e = new Date(endIso).getTime();
        const out = [];
        for (const tagId of tagIds) {
            const pts = downsampleMinMax(this.range(tagId, s, e), maxPointsPerTag);
            for (const p of pts) {
                out.push({ tagId, timestamp: new Date(p.t).toISOString(), value: p.v, quality: (0, exports.codeToQuality)(p.q) });
            }
        }
        return out;
    }
    clear() {
        this.series.clear();
    }
    /** Replace a tag's whole series (points must be time-ordered). */
    replace(tagId, pts) {
        this.series.delete(tagId);
        for (const p of pts)
            this.append(tagId, p.t, p.v, p.q);
    }
    tagIds() {
        return Array.from(this.series.keys());
    }
    /** Compact snapshot of raw tags for localStorage (≈20 bytes / point). */
    snapshot(windowMinutes) {
        const cutoff = Date.now() - windowMinutes * 60000;
        const snap = {};
        for (const [tagId, ring] of this.series) {
            if (HistorianStore.isFeatureTag(tagId))
                continue;
            const pts = ring.range(cutoff, Number.POSITIVE_INFINITY);
            snap[tagId] = pts.map((p) => [Math.round(p.t / 1000), Math.round(p.v * 1e4) / 1e4, p.q]);
        }
        return snap;
    }
    restore(snap) {
        for (const tagId of Object.keys(snap)) {
            for (const [ts, v, q] of snap[tagId])
                this.append(tagId, ts * 1000, v, q);
        }
    }
}
exports.HistorianStore = HistorianStore;
