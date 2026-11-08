# -*- coding: utf-8 -*-
"""
run_thesis_experiments.py — reproducible evidence generator for the final thesis.

E1  Historical replay of the frozen "Rollback" thesis model (Excel workbook
    PCW_T30_T20_T10_FINAL_ROLLBACK_THESIS_VERIFICATION.xlsx) on its RawData sheet (PT-1).
    The Excel formulas are transcribed 1:1 (time-based half-open windows, SUMIFS/COUNTIFS
    semantics) because the workbook stores formulas without cached values.
E1b Sensitivity of the frozen model (N threshold, auxiliary gates, baseline length).
E1c Replay of the Web SCADA runtime engine (TS v4) on the same PT-1 history.
E5  Cross-implementation check: independent Python port vs. compiled TS engine vectors.
FIG Thesis figures from the results above and from runtime_results.json.

Run: Code/pcw-poc-v1_merged/venv/bin/python thesis/experiments/run_thesis_experiments.py
"""
import json
import math
import os
from datetime import timedelta

import openpyxl
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EXP = os.path.join(ROOT, "thesis", "experiments")
RES = os.path.join(EXP, "results")
FIG = os.path.join(ROOT, "thesis", "figures")
os.makedirs(RES, exist_ok=True)
os.makedirs(FIG, exist_ok=True)
XLSX = os.path.join(ROOT, "PCW_T30_T20_T10_FINAL_ROLLBACK_THESIS_VERIFICATION.xlsx")

# ---- CJK font for figures ----
for cand in ["PingFang TC", "Heiti TC", "Arial Unicode MS", "Noto Sans CJK TC", "Microsoft JhengHei"]:
    if any(cand in f.name for f in font_manager.fontManager.ttflist):
        plt.rcParams["font.sans-serif"] = [cand]
        break
plt.rcParams["axes.unicode_minus"] = False

# ============================================================================
# Load RawData + Parameters
# ============================================================================
wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=False)
P = {}
for row in wb["Parameters"].iter_rows(min_row=4, values_only=True):
    if row[0]:
        P[row[0]] = row[1]
raw = [(r[0], r[1], float(r[2])) for r in wb["RawData"].iter_rows(min_row=4, values_only=True) if r[2] is not None]
tags = sorted(set(r[0] for r in raw))
times = [r[1] for r in raw]
vals = [r[2] for r in raw]
N = len(vals)
ALARM, NTH = float(P["AlarmLimit"]), float(P["NThreshold"])
G30, G20, G10 = float(P["Gate30"]), float(P["Gate20"]), float(P["Gate10"])
dts = [(times[i] - times[i - 1]).total_seconds() / 60 for i in range(1, N)]
data_profile = {
    "tags": tags, "rows": N, "start": times[0].isoformat(), "end": times[-1].isoformat(),
    "min": min(vals), "max": max(vals), "mean": sum(vals) / N,
    "rows_ge_alarm": sum(v >= ALARM for v in vals),
    "sampling_min": {"min": min(dts), "max": max(dts), "median": sorted(dts)[len(dts) // 2]},
    "parameters": P,
}

def window_idx(i, a_min, b_min):
    """indices j with times[j] in [t_i - a, t_i - b)  (Excel: >= A-a/1440 and < A-b/1440)."""
    lo, hi = times[i] - timedelta(minutes=a_min), times[i] - timedelta(minutes=b_min)
    return [j for j in range(max(0, i - a_min - 5), i + 1) if lo <= times[j] < hi]

def frozen_model(baseline_min=60, nth=NTH, gates=(G30, G20, G10), use_gate=True, symmetric=False):
    """Row-wise transcription of MinuteInference columns D..X."""
    out = []
    for i in range(N):
        v = vals[i]
        hard = int(v >= ALARM)
        P5 = [vals[j] for j in window_idx(i, 10, 5)]
        R5 = [vals[j] for j in window_idx(i, 5, 0)]
        if P5 and R5:
            raw_slope = (sum(R5) / len(R5) - sum(P5) / len(P5)) / 5
            slope = raw_slope if symmetric else max(0.0, raw_slope)
        else:
            raw_slope = slope = None
        f = {h: (v + slope * h if slope is not None else None) for h in (30, 20, 10)}
        Bi = window_idx(i, baseline_min + 10, 10)
        Ci = window_idx(i, 10, 0)
        if Bi:
            base = sum(vals[j] for j in Bi) / len(Bi)
            mB = sum(vals[j] > base for j in Bi)
            m10 = sum(vals[j] > base for j in Ci)
            ratio = baseline_min / 10.0
            n10 = (999 if m10 > 0 else 0) if mB == 0 else m10 / (mB / ratio)
        else:
            base = mB = m10 = n10 = None
        pred = {}
        for h, g in zip((30, 20, 10), gates):
            fc = f[h] is not None and f[h] >= ALARM
            dens = n10 is not None and n10 > nth and (v >= g if use_gate else True)
            pred[h] = int(hard == 0 and (fc or dens))
        fut = {h: int(any(vals[j] >= ALARM for j in range(i + 1, N) if times[i] < times[j] <= times[i] + timedelta(minutes=h))) for h in (30, 20, 10)}
        state = "EVENT" if hard else ("T-10" if pred[10] else "T-20" if pred[20] else "T-30" if pred[30] else "Normal")
        out.append(dict(i=i, t=times[i], v=v, hard=hard, slope=slope, raw_slope=raw_slope, f30=f[30], f20=f[20], f10=f[10],
                        base=base, m60=mB, m10=m10, n10=n10, p30=pred[30], p20=pred[20], p10=pred[10],
                        anyw=int(pred[30] or pred[20] or pred[10]), a30=fut[30], a20=fut[20], a10=fut[10], state=state))
    # LeadToNextEvent (column X)
    ev_times = [r["t"] for r in out if r["hard"]]
    for r in out:
        r["lead_next"] = None
        if r["anyw"]:
            nxt = [t for t in ev_times if t > r["t"]]
            if nxt:
                r["lead_next"] = (nxt[0] - r["t"]).total_seconds() / 60
    return out

def confusion(rows, ph, ah):
    tp = sum(r[ph] == 1 and r[ah] == 1 for r in rows)
    fp = sum(r[ph] == 1 and r[ah] == 0 for r in rows)
    fn = sum(r[ph] == 0 and r[ah] == 1 for r in rows)
    tn = sum(r[ph] == 0 and r[ah] == 0 for r in rows)
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return dict(TP=tp, FP=fp, FN=fn, TN=tn, Precision=prec, Recall=rec, F1=f1,
                Accuracy=(tp + tn) / max(1, tp + fp + fn + tn), FPR=fp / (fp + tn) if fp + tn else 0.0,
                WarningRate=(tp + fp) / max(1, tp + fp + fn + tn))

def confusion_excluding_event_rows(rows, ph, ah):
    """Same as above but restricted to rows not already in hard alarm (predictions are only
    defined when HardAlarm = 0; this removes the structural FN of in-event rows)."""
    return confusion([r for r in rows if r["hard"] == 0], ph, ah)

def episodes(rows):
    eps, cur = [], None
    for r in rows:
        if r["hard"] and cur is None:
            cur = [r["i"], r["i"]]
        elif r["hard"]:
            cur[1] = r["i"]
        elif cur is not None:
            eps.append(cur); cur = None
    if cur is not None:
        eps.append(cur)
    return eps

def episode_analysis(rows, key_any="anyw"):
    """Per hard-alarm episode: earliest warning within the 30 min before onset and after the
    previous episode ended (continuous-coverage lead time) and the levels reached."""
    eps = episodes(rows)
    res, prev_end = [], -1
    for k, (s, e) in enumerate(eps):
        onset = rows[s]["t"]
        cand = [r for r in rows[prev_end + 1:s] if r[key_any] and (onset - r["t"]).total_seconds() / 60 <= 30]
        first = cand[0] if cand else None
        lv = {lvl: next(((onset - r["t"]).total_seconds() / 60 for r in rows[prev_end + 1:s]
                         if r.get(f"p{lvl}") and (onset - r["t"]).total_seconds() / 60 <= 30), None) for lvl in (30, 20, 10)}
        res.append(dict(episode=k + 1, onset=onset.isoformat(), end=rows[e]["t"].isoformat(),
                        duration_min=(rows[e]["t"] - onset).total_seconds() / 60 + 1,
                        peak=max(rows[j]["v"] for j in range(s, e + 1)),
                        gap_from_prev_min=None if prev_end < 0 else (onset - rows[prev_end]["t"]).total_seconds() / 60,
                        first_warning=first["t"].isoformat() if first else None,
                        lead_min=(onset - first["t"]).total_seconds() / 60 if first else None,
                        lead_T30=lv[30], lead_T20=lv[20], lead_T10=lv[10]))
        prev_end = e
    return res

def false_warning_episodes(rows):
    """Contiguous warning streaks with no hard alarm within 30 min after the streak end."""
    streaks, cur = [], None
    for r in rows:
        if r["anyw"] and cur is None:
            cur = [r["i"], r["i"]]
        elif r["anyw"]:
            cur[1] = r["i"]
        elif cur is not None:
            streaks.append(cur); cur = None
    if cur is not None:
        streaks.append(cur)
    false = 0
    for s, e in streaks:
        tend = rows[e]["t"]
        if not any(rows[j]["hard"] for j in range(e + 1, N) if (rows[j]["t"] - tend).total_seconds() / 60 <= 30):
            false += 1
    return len(streaks), false

print("E1 frozen model replay ...")
E1 = frozen_model()
e1 = {
    "confusion_all_rows": {f"T{h}": confusion(E1, f"p{h}", f"a{h}") for h in (30, 20, 10)},
    "confusion_non_event_rows": {f"T{h}": confusion_excluding_event_rows(E1, f"p{h}", f"a{h}") for h in (30, 20, 10)},
}
leads = [r["lead_next"] for r in E1 if r["lead_next"] is not None and r["lead_next"] >= 0]
anyw = sum(r["anyw"] for r in E1)
fw = sum(r["anyw"] == 1 and r["a30"] == 0 for r in E1)
streaks, false_streaks = false_warning_episodes(E1)
e1["operational"] = {
    "input_rows": N, "hard_alarm_rows": sum(r["hard"] for r in E1), "any_warning_rows": anyw,
    "false_warning_rows": fw, "false_warning_rate": fw / anyw if anyw else 0,
    "avg_lead_to_next_event_min": sum(leads) / len(leads) if leads else None,
    "max_lead_to_next_event_min": max(leads) if leads else None,
    "n_gt2_rows": sum(1 for r in E1 if r["n10"] is not None and r["n10"] > NTH),
    "warning_streaks": streaks, "false_warning_streaks": false_streaks,
}
e1["episodes"] = episode_analysis(E1)
eps_with_warn = [x for x in e1["episodes"] if x["lead_min"] is not None]
e1["episode_summary"] = {
    "episodes": len(e1["episodes"]), "warned_within_30min": len(eps_with_warn),
    "mean_lead_min": sum(x["lead_min"] for x in eps_with_warn) / len(eps_with_warn) if eps_with_warn else None,
    "median_lead_min": sorted(x["lead_min"] for x in eps_with_warn)[len(eps_with_warn) // 2] if eps_with_warn else None,
}
# detector attribution
e1["detector_attribution"] = {
    "forecast_only": sum(1 for r in E1 if r["anyw"] and r["f30"] is not None and r["f30"] >= ALARM and not (r["n10"] is not None and r["n10"] > NTH)),
    "density_only": sum(1 for r in E1 if r["anyw"] and not (r["f30"] is not None and r["f30"] >= ALARM) and r["n10"] is not None and r["n10"] > NTH),
    "both": sum(1 for r in E1 if r["anyw"] and r["f30"] is not None and r["f30"] >= ALARM and r["n10"] is not None and r["n10"] > NTH),
}
# Excel Event_Summary replica (first event; last warning before it)
fe = next(r for r in E1 if r["hard"])
def last_before(key):
    c = [r for r in E1 if r[key] and r["t"] < fe["t"]]
    return c[-1]["t"] if c else None
e1["excel_event_summary"] = {"first_event": fe["t"].isoformat()}
for h in (30, 20, 10):
    lb = last_before(f"p{h}")
    e1["excel_event_summary"][f"T{h}_last_warning_before"] = lb.isoformat() if lb else None
    e1["excel_event_summary"][f"T{h}_lead_min"] = round((fe["t"] - lb).total_seconds() / 60, 1) if lb else None

print("E1b sensitivity ...")
e1b = {"n_threshold": [], "gates": [], "baseline": [], "symmetric_slope": None}
for nth in (1.5, 2.0, 2.5, 3.0):
    rr = frozen_model(nth=nth)
    c = confusion_excluding_event_rows(rr, "p30", "a30")
    ep = episode_analysis(rr)
    w = [x for x in ep if x["lead_min"] is not None]
    e1b["n_threshold"].append(dict(nth=nth, **{k: c[k] for k in ("TP", "FP", "FN", "TN", "Precision", "Recall", "F1")},
                                   episodes_warned=len(w), episodes=len(ep), false_streaks=false_warning_episodes(rr)[1]))
for label, use_gate in (("with gates 1.55/1.58/1.62", True), ("without gates", False)):
    rr = frozen_model(use_gate=use_gate)
    c = confusion_excluding_event_rows(rr, "p30", "a30")
    e1b["gates"].append(dict(config=label, **{k: c[k] for k in ("TP", "FP", "FN", "TN", "Precision", "Recall", "F1")},
                             false_streaks=false_warning_episodes(rr)[1]))
for B in (30, 45, 60, 90, 120):
    rr = frozen_model(baseline_min=B)
    c = confusion_excluding_event_rows(rr, "p30", "a30")
    ep = episode_analysis(rr)
    w = [x for x in ep if x["lead_min"] is not None]
    e1b["baseline"].append(dict(baseline_min=B, **{k: c[k] for k in ("TP", "FP", "FN", "TN", "Precision", "Recall", "F1")},
                                episodes_warned=len(w), episodes=len(ep), false_streaks=false_warning_episodes(rr)[1],
                                valid_rows=sum(1 for r in rr if r["n10"] is not None)))
rr = frozen_model(symmetric=True)
e1b["symmetric_slope"] = {"note": "slope kept signed; only HI-side alarm exists in this dataset so the result must equal the max(0,.) version",
                          "T30": confusion_excluding_event_rows(rr, "p30", "a30"),
                          "identical_predictions": all(a["p30"] == b["p30"] and a["p20"] == b["p20"] and a["p10"] == b["p10"] for a, b in zip(rr, E1))}

# ============================================================================
# Python port of the TS runtime engine (for E5 and E1c)
# ============================================================================
T975 = 2.306
def ts_mean(a):
    return sum(a) / len(a) if a else float("nan")
def ts_ols(y):
    n = len(y)
    if n < 3:
        return dict(slope=0, intercept=y[0] if y else 0, r2=0, s=0, sxx=0, xbar=0, n=n)
    xbar = (n - 1) / 2; ybar = ts_mean(y)
    sxx = sum((i - xbar) ** 2 for i in range(n)); sxy = sum((i - xbar) * (y[i] - ybar) for i in range(n)); syy = sum((v - ybar) ** 2 for v in y)
    slope = sxy / sxx; icpt = ybar - slope * xbar
    sse = sum((y[i] - (icpt + slope * i)) ** 2 for i in range(n))
    r2 = min(1, max(0, 1 - sse / syy)) if syy > 0 else 0
    return dict(slope=slope, intercept=icpt, r2=r2, s=math.sqrt(sse / max(1, n - 2)), sxx=sxx, xbar=xbar, n=n)
def ts_band(fit, h):
    if fit["n"] < 3 or fit["sxx"] == 0:
        return 0
    xh = fit["n"] - 1 + h
    return T975 * fit["s"] * math.sqrt(1 + 1 / fit["n"] + (xh - fit["xbar"]) ** 2 / fit["sxx"])
def ts_classify(v, L):
    return v >= L["highHigh"] or v >= L["high"] or v <= L["lowLow"] or v <= L["low"]
def ts_ttl(v, slope, L):
    if not math.isfinite(slope) or abs(slope) < 1e-12:
        return None
    tg = [L["high"], L["highHigh"]] if slope > 0 else [L["low"], L["lowLow"]]
    for t in tg:
        if (v < t) if slope > 0 else (v > t):
            m = (t - v) / slope
            return m if m <= 1440 else None
    return 0
def ts_eval(window, cur, L, theta=2, g=5):
    if len(window) < 70:
        return dict(state="INSUFFICIENT_DATA")
    w = window[-70:]
    valid = sum(1 for p in w if p["good"]) / 70
    good = lambda a: [p["v"] for p in a if p["good"]]
    B, Pp, R, last10 = good(w[0:60]), good(w[60:65]), good(w[65:70]), good(w[60:70])
    if valid < 0.8 or not Pp or not R or len(B) < 30:
        return dict(state="INSUFFICIENT_DATA")
    base = ts_mean(B); slope = (ts_mean(R) - ts_mean(Pp)) / 5; up = slope >= 0
    above = (lambda x: x > base) if up else (lambda x: x < base)
    jsround = lambda x: math.floor(x + 0.5)
    m60 = jsround(sum(1 for x in B if above(x)) * 60 / len(B)); m10 = jsround(sum(1 for x in last10 if above(x)) * 10 / len(last10))
    n10 = (999 if m10 > 0 else 0) if m60 == 0 else m10 / (m60 / 6)
    f10, f20, f30 = cur + slope * 10, cur + slope * 20, cur + slope * 30
    span = max(1e-9, L["high"] - L["low"]); gate = abs(slope) * 30 >= g / 100 * span
    drifting = n10 > theta and gate
    fit = ts_ols(last10)
    if cur >= L["high"] or cur <= L["low"]: st = "EVENT"
    elif ts_classify(f10, L): st = "T-10"
    elif ts_classify(f20, L): st = "T-20"
    elif ts_classify(f30, L): st = "T-30"
    elif drifting: st = "T-30"
    else: st = "NORMAL"
    return dict(state=st, baseAvg60=base, slope=slope, m60=m60, m10=m10, n10=n10, forecast10=f10, forecast20=f20, forecast30=f30,
                slopeOls=fit["slope"], r2=fit["r2"], band30=ts_band(fit, 30), ttl=ts_ttl(cur, slope, L), drifting=drifting)

print("E5 cross-implementation check ...")
vec = json.load(open(os.path.join(RES, "engine_vectors.json")))
fields = ["baseAvg60", "slope", "m60", "m10", "n10", "forecast10", "forecast20", "forecast30", "slopeOls", "r2", "band30", "ttl"]
maxerr = {k: 0.0 for k in fields}; state_mismatch = 0; nstate = {}
for v in vec["vectors"]:
    L = vec["limits"][v["gid"]]
    py = ts_eval(v["window"], v["current"], L)
    if py["state"] != v["out"]["state"]:
        state_mismatch += 1
    nstate[v["out"]["state"]] = nstate.get(v["out"]["state"], 0) + 1
    if py["state"] == "INSUFFICIENT_DATA":
        continue
    for k in fields:
        a, b = py.get(k), v["out"].get(k)
        if a is None or b is None:
            if (a is None) != (b is None):
                maxerr[k] = float("inf")
            continue
        maxerr[k] = max(maxerr[k], abs(a - b))
e5 = {"vectors": len(vec["vectors"]), "state_mismatches": state_mismatch, "state_distribution": nstate, "max_abs_error": maxerr}

print("E1c runtime engine replay on PT-1 ...")
L_PT1 = {"lowLow": 1.2, "low": 1.3, "high": ALARM, "highHigh": 1.8, "baseline": 1.5}
SEV = {"INSUFFICIENT_DATA": -1, "NORMAL": 0, "T-30": 1, "T-20": 2, "T-10": 3, "EVENT": 4}
latch = None; rt = []
for i in range(N):
    win = [{"v": vals[j], "good": True} for j in range(max(0, i - 69), i + 1)]
    r = ts_eval(win, vals[i], L_PT1)
    st = r["state"]
    if st != "INSUFFICIENT_DATA":
        if latch is None or SEV[st] >= SEV[latch["s"]]:
            latch = {"s": st, "low": 0}
        else:
            latch["low"] += 1
            if latch["low"] >= 3:
                latch = {"s": st, "low": 0}
            else:
                st = latch["s"]
    rt.append(dict(i=i, t=times[i], v=vals[i], hard=int(vals[i] >= ALARM), state=st,
                   anyw=int(st in ("T-30", "T-20", "T-10")), p30=int(st in ("T-30", "T-20", "T-10")),
                   p20=int(st in ("T-20", "T-10")), p10=int(st == "T-10"),
                   a30=E1[i]["a30"], a20=E1[i]["a20"], a10=E1[i]["a10"]))
rt_eval = [r for r in rt if r["state"] != "INSUFFICIENT_DATA"]
e1c = {
    "limits": L_PT1, "params": {"theta": 2, "slopeGatePct": 5, "releaseHold": 3},
    "evaluated_rows": len(rt_eval),
    "confusion_non_event_rows": {f"T{h}": confusion([r for r in rt_eval if r["hard"] == 0], f"p{h}", f"a{h}") for h in (30, 20, 10)},
    "episodes": episode_analysis(rt_eval),
    "state_counts": {s: sum(1 for r in rt_eval if r["state"] == s) for s in ("NORMAL", "T-30", "T-20", "T-10", "EVENT")},
}
w = [x for x in e1c["episodes"] if x["lead_min"] is not None]
e1c["episode_summary"] = {"episodes": len(e1c["episodes"]), "warned_within_30min": len(w),
                          "mean_lead_min": sum(x["lead_min"] for x in w) / len(w) if w else None}
e1c["warning_streaks"], e1c["false_warning_streaks"] = false_warning_episodes([dict(r, i=k) for k, r in enumerate(rt_eval)]) if False else false_warning_episodes(rt)

def clean(o):
    if isinstance(o, float):
        return None if (math.isinf(o) or math.isnan(o)) else o
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if hasattr(o, "isoformat"):
        return o.isoformat()
    return o

results = clean({"data_profile": data_profile, "E1": e1, "E1b": e1b, "E1c": e1c, "E5": e5})
json.dump(results, open(os.path.join(RES, "thesis_results.json"), "w"), ensure_ascii=False, indent=1)
# per-minute replay table (evidence appendix)
with open(os.path.join(RES, "E1_minute_inference_replay.csv"), "w", encoding="utf-8") as f:
    f.write("Time,Value,HardAlarm,Slope,Forecast30,Forecast20,Forecast10,BaseAvg60,M60,M10,N10,Pred_T30,Pred_T20,Pred_T10,Actual_T30,Actual_T20,Actual_T10,State,LeadToNextEvent_min,Runtime_TS_State\n")
    for r, q in zip(E1, rt):
        fmt = lambda x: "" if x is None else (f"{x:.6f}" if isinstance(x, float) else str(x))
        f.write(",".join(fmt(x) for x in [r["t"].isoformat(), r["v"], r["hard"], r["slope"], r["f30"], r["f20"], r["f10"], r["base"], r["m60"], r["m10"], r["n10"],
                                           r["p30"], r["p20"], r["p10"], r["a30"], r["a20"], r["a10"], r["state"], r["lead_next"], q["state"]]) + "\n")

# ============================================================================
# Figures
# ============================================================================
print("Figures ...")
rt_res = json.load(open(os.path.join(RES, "runtime_results.json")))
COL = {"T-30": "#f2c94c", "T-20": "#f2994a", "T-10": "#eb5757", "EVENT": "#9b51e0"}

# Fig A: frozen model replay timeline
fig, ax = plt.subplots(figsize=(13, 5.2), dpi=200)
ax.plot([r["t"] for r in E1], [r["v"] for r in E1], color="#2d9cdb", lw=1.0, label="PT-1 壓力 (bar)")
ax.axhline(ALARM, color="#eb5757", ls="--", lw=1.2, label=f"SCADA Hard Alarm = {ALARM} bar")
for g, lab in ((G30, "Gate30"), (G20, "Gate20"), (G10, "Gate10")):
    ax.axhline(g, color="#828282", ls=":", lw=0.8)
    ax.text(times[0], g + 0.002, f"{lab} {g}", fontsize=7, color="#555")
for lvl in ("T-30", "T-20", "T-10"):
    pts = [r for r in E1 if r["state"] == lvl]
    ax.scatter([r["t"] for r in pts], [r["v"] for r in pts], s=10, color=COL[lvl], label=f"{lvl} 預警 ({len(pts)} 筆)", zorder=3)
for s, e in episodes(E1):
    ax.axvspan(times[s], times[e], color=COL["EVENT"], alpha=0.12)
ax.set_title("圖 E1：凍結版論文模型（Excel Rollback）於 PT-1 歷史資料之 Past-Only 逐分鐘回放", fontsize=11)
ax.set_xlabel("時間"); ax.set_ylabel("壓力 (bar)"); ax.legend(fontsize=7.5, ncol=3, loc="lower left"); ax.grid(alpha=0.25)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_e1_replay_timeline.png")); plt.close(fig)

# Fig B: Monte Carlo lead time vs drift rate
drift = [x for x in rt_res["e2"] if x["kind"] == "DRIFT"]
fig, ax = plt.subplots(figsize=(10, 4.8), dpi=200)
labels = [x["scenario"].replace("span/min", "") for x in drift]
ax.boxplot([x["leads"] for x in drift], labels=labels, showfliers=True)
for k, x in enumerate(drift, 1):
    frac = float(x["scenario"].split()[1].replace("%span/min", "")) / 100
    ax.scatter([k], [0.5 / frac], marker="_", s=600, color="#eb5757", zorder=3)
ax.set_yscale("log"); ax.set_ylabel("Lead Time = T_HardAlarm − T_EarlyWarning (min, log)")
ax.set_title("圖 E2：執行期引擎 Monte Carlo 漂移注入之預警提前量（每情境 200 次；紅線＝理論越限時間 0.5·span/rate）", fontsize=10)
plt.setp(ax.get_xticklabels(), rotation=20, fontsize=8); ax.grid(alpha=0.25, axis="y")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_e2_mc_leadtime.png")); plt.close(fig)

# Fig C: sensitivity θ × g
fig, axs = plt.subplots(1, 2, figsize=(12, 4.4), dpi=200)
for g in (2.5, 5, 10):
    rows = [x for x in rt_res["e3"] if x["slopeGatePct"] == g]
    axs[0].plot([x["theta"] for x in rows], [x["falseWarningRunRate"] * 100 for x in rows], marker="o", label=f"g = {g}%")
    axs[1].plot([x["theta"] for x in rows], [x["meanLead"] for x in rows], marker="s", label=f"g = {g}%")
axs[0].set_title("負樣本（NONE/SPIKE）出現預警之執行比例 (%)", fontsize=10); axs[0].set_xlabel("θ (N10 門檻)")
axs[1].set_title("漂移 ±0.5% span/min 平均提前量 (min)", fontsize=10); axs[1].set_xlabel("θ (N10 門檻)")
for a in axs: a.grid(alpha=0.3); a.legend(fontsize=8)
fig.suptitle("圖 E3：執行期參數敏感度分析（θ × 跨度閘門 g）", fontsize=11)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_e3_sensitivity.png")); plt.close(fig)

# Fig D: example traces
ex = rt_res["exampleTraces"]
keys = ["DRIFT_UP 0.5%span/min", "DRIFT_DOWN 0.5%span/min", "STEP_SMALL +10%span", "SPIKE 25%span p=0.05"]
fig, axs = plt.subplots(2, 2, figsize=(13, 6.5), dpi=200, sharex=True)
for a, k in zip(axs.flat, keys):
    tr = [p for p in ex[k] if p[0] >= -60]
    a.plot([p[0] for p in tr], [p[1] for p in tr], color="#2d9cdb", lw=0.9)
    for lvl in ("T-30", "T-20", "T-10", "EVENT"):
        pts = [p for p in tr if p[2] == lvl]
        a.scatter([p[0] for p in pts], [p[1] for p in pts], s=6, color=COL[lvl], label=lvl)
    a.axhline(1.7, color="#eb5757", ls="--", lw=0.8); a.axhline(1.3, color="#eb5757", ls="--", lw=0.8)
    a.axvline(0, color="k", lw=0.6); a.set_title(f"G1 (PCW01/02) — {k}", fontsize=9); a.grid(alpha=0.25)
axs[0, 0].legend(fontsize=7); axs[1, 0].set_xlabel("注入後分鐘"); axs[1, 1].set_xlabel("注入後分鐘")
fig.suptitle("圖 E4：執行期引擎代表性情境軌跡（藍線為 1-s 現值，色點為引擎狀態；H=1.7 / L=1.3 bar）", fontsize=11)
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_e4_mc_traces.png")); plt.close(fig)

# Fig E: downsampling benchmark
e6 = rt_res["e6"]
fig, ax = plt.subplots(figsize=(8, 4), dpi=200)
ax.plot([x["N"] for x in e6], [x["msPerCall"] for x in e6], marker="o", color="#27ae60")
for x in e6:
    ax.annotate(f'{x["msPerCall"]:.2f} ms', (x["N"], x["msPerCall"]), textcoords="offset points", xytext=(4, 6), fontsize=7)
ax.set_xscale("log"); ax.set_yscale("log"); ax.set_xlabel("原始點數 N"); ax.set_ylabel("每次呼叫耗時 (ms)")
ax.set_title("圖 E5：downsampleMinMax 實測耗時（輸出 1,000 點；Node.js，同機量測）", fontsize=10); ax.grid(alpha=0.3, which="both")
fig.tight_layout(); fig.savefig(os.path.join(FIG, "fig_e5_downsample_bench.png")); plt.close(fig)

print(json.dumps({k: results["E1"][k] for k in ("operational", "episode_summary", "excel_event_summary", "detector_attribution")}, ensure_ascii=False, indent=1))
print(json.dumps(results["E1"]["confusion_non_event_rows"], indent=1))
print(json.dumps(results["E1"]["confusion_all_rows"], indent=1))
print(json.dumps(results["E1b"], indent=1)[:3500])
print(json.dumps({k: results["E1c"][k] for k in ("confusion_non_event_rows", "episode_summary", "state_counts", "false_warning_streaks", "warning_streaks")}, indent=1))
print(json.dumps(results["E5"], indent=1))
print(json.dumps(data_profile, default=str, indent=1))
