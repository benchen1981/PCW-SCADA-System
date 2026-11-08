# -*- coding: utf-8 -*-
"""
algorithms.py — Formal Academic Pseudocode and Mathematical Formulations for PCW SCADA.

Contains:
1. Algorithm 1: Dual-Window Anomaly Density Estimation (DW-ADE)
2. Algorithm 2: Bilateral OLS Dynamic Drift Extrapolation & Time-To-Limit (B-DDE-TTL)
3. Algorithm 3: Seven-Layer Industrial Hardening & Anti-Chattering State Machine (7L-IH-AC)
4. Formal Mathematical Derivation & Closed-Form Solutions:
   - Bernoulli Hydraulic Elevation Model: P_1 / (rho*g) + z_1 + v_1^2 / (2g) = P_2 / (rho*g) + z_2 + v_2^2 / (2g) + h_f
   - Finite Difference Slope Estimator: hat{beta}(t) = (bar{x}_{R_t} - bar{x}_{P_t}) / Delta t
   - Anomaly Density Ratio: N_{10}(t) = M_{10}(t) / (M_{60}(t) / 6)
   - Closed-Form Time-To-Limit (TTL): TTL(t) = (L - x_t) / hat{beta}(t)
   - 95% Confidence Interval for Extrapolation: delta_h = t_{0.975, n-2} * s_e * sqrt(1 + 1/n + (h - bar{t})^2 / Sxx)
   - Fused Risk Index: R(t) = w_1 * S_margin(t) + w_2 * S_TTL(t) + w_3 * S_density(t) + S_floor(S_t)
"""
import math
from typing import List, Dict, Any, Tuple

# ============================================================================
# ALGORITHM 1: Dual-Window Anomaly Density Estimation (DW-ADE)
# ============================================================================
"""
================================================================================
Algorithm 1: Dual-Window Anomaly Density Estimation (DW-ADE)
================================================================================
Input:
  - Time series window X = {x_1, x_2, ..., x_W}, where W = 70 points (sampled at 1 pt/min).
  - Anomaly sensitivity threshold theta in [1.5, 3.0] (default theta = 2.0).
Output:
  - Baseline mean mu_B.
  - Estimated drift slope hat{beta}.
  - Baseline directional anomaly count M_60.
  - Recent directional anomaly count M_10.
  - Anomaly Density Ratio N_10.
--------------------------------------------------------------------------------
1: Partition window X into three non-overlapping historical segments:
     B  <-- {x_1, x_2, ..., x_60}      // Baseline window [t-70, t-10), |B| = 60
     P  <-- {x_61, x_62, ..., x_65}    // Prior sub-window [t-10, t-5),  |P| = 5
     R  <-- {x_66, x_67, ..., x_70}    // Recent sub-window [t-5, t],     |R| = 5
2: Compute baseline expectation:
     mu_B <-- (1 / 60) * sum_{i=1}^{60} x_i
3: Compute mean of prior and recent sub-windows:
     bar{x}_P <-- (1 / 5) * sum_{x in P} x
     bar{x}_R <-- (1 / 5) * sum_{x in R} x
4: Compute finite difference drift slope:
     hat{beta} <-- (bar{x}_R - bar{x}_P) / 5.0
5: Determine drift orientation:
     d <-- sgn(hat{beta}) = { +1 if hat{beta} >= 0, -1 if hat{beta} < 0 }
6: Count directional baseline deviations:
     M_60 <-- sum_{x in B} I( d * (x - mu_B) > 0 )
7: Count directional recent deviations over window [t-10, t]:
     M_10 <-- sum_{x in (P union R)} I( d * (x - mu_B) > 0 )
8: Compute standardized Anomaly Density Ratio N_10:
     if M_60 > 0 then:
         N_10 <-- M_10 / (M_60 / 6.0)
     else if M_60 == 0 and M_10 > 0 then:
         N_10 <-- 999.0                // Density saturation indicator
     else:
         N_10 <-- 0.0
9: return (mu_B, hat{beta}, M_60, M_10, N_10)
================================================================================
"""

def algorithm_1_dw_ade(window_70: List[float], theta: float = 2.0) -> Dict[str, Any]:
    assert len(window_70) == 70, "Window length must be exactly W=70"
    B = window_70[0:60]
    P = window_70[60:65]
    R = window_70[65:70]

    mu_b = sum(B) / 60.0
    bar_p = sum(P) / 5.0
    bar_r = sum(R) / 5.0
    slope = (bar_r - bar_p) / 5.0
    direction = 1.0 if slope >= 0 else -1.0

    m60 = sum(1 for x in B if direction * (x - mu_b) > 0)
    m10 = sum(1 for x in window_70[60:70] if direction * (x - mu_b) > 0)

    if m60 > 0:
        n10 = m10 / (m60 / 6.0)
    elif m10 > 0:
        n10 = 999.0
    else:
        n10 = 0.0

    is_anomaly = (n10 >= theta)
    return {
        "mu_B": mu_b,
        "slope": slope,
        "direction": direction,
        "M_60": m60,
        "M_10": m10,
        "N_10": n10,
        "is_anomaly": is_anomaly
    }


# ============================================================================
# ALGORITHM 2: Bilateral OLS Dynamic Drift Extrapolation & Time-To-Limit (B-DDE-TTL)
# ============================================================================
"""
================================================================================
Algorithm 2: Bilateral OLS Dynamic Drift Extrapolation & Time-To-Limit (B-DDE-TTL)
================================================================================
Input:
  - Current sensor observation x_t.
  - Finite difference drift slope hat{beta}.
  - Recent observation vector Y = {x_{t-9}, x_{t-8}, ..., x_t}, n = 10.
  - Engineering limits L = {L_LO, L_HI, L_LL, L_HH}.
  - Prediction horizons H = {10, 20, 30} minutes.
Output:
  - Extrapolated forecasts hat{x}_{t+10}, hat{x}_{t+20}, hat{x}_{t+30}.
  - OLS regression slope hat{beta}_OLS and coefficient of determination R^2.
  - 95% Confidence prediction half-width delta_30.
  - Closed-form Time-To-Limit TTL(t).
--------------------------------------------------------------------------------
1: For each horizon h in {10, 20, 30}:
     hat{x}_{t+h} <-- x_t + hat{beta} * h
2: Compute sample statistics of recent vector Y:
     bar{t} <-- (n - 1) / 2.0 = 4.5
     bar{x} <-- (1 / n) * sum_{i=0}^{n-1} Y_i
     S_tt   <-- sum_{i=0}^{n-1} (i - bar{t})^2 = 82.5
     S_tx   <-- sum_{i=0}^{n-1} (i - bar{t}) * (Y_i - bar{x})
     hat{beta}_OLS <-- S_tx / S_tt
     hat{alpha}_OLS <-- bar{x} - hat{beta}_OLS * bar{t}
3: Compute regression error and goodness-of-fit:
     SSE <-- sum_{i=0}^{n-1} (Y_i - (hat{alpha}_OLS + hat{beta}_OLS * i))^2
     SST <-- sum_{i=0}^{n-1} (Y_i - bar{x})^2
     R^2 <-- 1.0 - (SSE / SST) if SST > 0 else 0.0
     s_e <-- sqrt( SSE / (n - 2) )
4: Calculate 95% Prediction Interval half-width for h = 30:
     t_crit <-- 2.306   // Student-t critical value at alpha=0.05, df=8
     delta_30 <-- t_crit * s_e * sqrt( 1 + 1/n + (9 + 30 - bar{t})^2 / S_tt )
5: Derive closed-form Time-To-Limit TTL(t):
     if hat{beta} > 0 and x_t < L_HI then:
         TTL <-- (L_HI - x_t) / hat{beta}
     else if hat{beta} < 0 and x_t > L_LO then:
         TTL <-- (x_t - L_LO) / |hat{beta}|
     else:
         TTL <-- +infinity
6: return (hat{x}_{t+10}, hat{x}_{t+20}, hat{x}_{t+30}, hat{beta}_OLS, R^2, delta_30, TTL)
================================================================================
"""

def algorithm_2_b_dde_ttl(cur_val: float, slope: float, recent_10: List[float], l_hi: float = 1.70, l_lo: float = 1.30) -> Dict[str, Any]:
    n = 10
    assert len(recent_10) == n, "Recent window must be exactly n=10"

    fcst_10 = cur_val + slope * 10.0
    fcst_20 = cur_val + slope * 20.0
    fcst_30 = cur_val + slope * 30.0

    t_bar = (n - 1) / 2.0
    x_bar = sum(recent_10) / n
    stt = sum((i - t_bar) ** 2 for i in range(n))
    stx = sum((i - t_bar) * (recent_10[i] - x_bar) for i in range(n))
    slope_ols = stx / stt if stt > 0 else 0.0
    intercept = x_bar - slope_ols * t_bar

    sse = sum((recent_10[i] - (intercept + slope_ols * i)) ** 2 for i in range(n))
    sst = sum((recent_10[i] - x_bar) ** 2 for i in range(n))
    r2 = 1.0 - (sse / sst) if sst > 1e-12 else 0.0
    se = math.sqrt(sse / (n - 2)) if n > 2 else 0.0
    delta_30 = 2.306 * se * math.sqrt(1.0 + 1.0 / n + ((9 + 30 - t_bar) ** 2) / stt) if stt > 0 else 0.0

    ttl = 999.0
    if slope > 0 and cur_val < l_hi:
        ttl = (l_hi - cur_val) / slope
    elif slope < 0 and cur_val > l_lo:
        ttl = (cur_val - l_lo) / abs(slope)

    return {
        "fcst_10": fcst_10,
        "fcst_20": fcst_20,
        "fcst_30": fcst_30,
        "slope_ols": slope_ols,
        "r2": r2,
        "delta_30": delta_30,
        "ttl": ttl
    }


# ============================================================================
# ALGORITHM 3: Seven-Layer Industrial Hardening & Anti-Chattering State Machine
# ============================================================================
"""
================================================================================
Algorithm 3: Seven-Layer Industrial Hardening & Anti-Chattering State Machine (7L-IH-AC)
================================================================================
Input:
  - Current observation x_t and quality flag Q_t.
  - Extrapolated forecasts hat{x}_{t+10}, hat{x}_{t+20}, hat{x}_{t+30}.
  - Anomaly density N_10, drift slope hat{beta}, Time-to-limit TTL(t).
  - Previous system state S_{t-1} in {NORMAL, T-30, T-20, T-10, EVENT}.
  - Consecutive hold-down counter C_{hold}.
  - Parameters: Span gate percentage g = 5%, Sensitivity theta = 2.0, Hold threshold K = 3.
Output:
  - Updated system state S_t.
  - Updated hold counter C_{hold}.
  - Fused Risk Index R(t) in [0, 100].
--------------------------------------------------------------------------------
1: [Layer 1: Quality Gate]
     if (valid_ratio < 0.80) or (Q_t != GOOD) then return (INSUFFICIENT_DATA, C_{hold}, 0.0)
2: [Layer 5: Hard Event Verification]
     if (x_t >= L_HI) or (x_t <= L_LO) then:
         return (EVENT, K, 100.0)      // Physical boundary already breached
3: [Layer 2: Span-Normalized Drift Gate]
     Span <-- L_HI - L_LO
     Gate <-- (g / 100.0) * Span
     is_drifting <-- ( |hat{beta}| * 30.0 >= Gate )
4: [Pre-State Candidate Classification]
     if (hat{x}_{t+10} >= L_HI) or (hat{x}_{t+10} <= L_LO) then:
         S_cand <-- T-10
     else if (hat{x}_{t+20} >= L_HI) or (hat{x}_{t+20} <= L_LO) then:
         S_cand <-- T-20
     else if (hat{x}_{t+30} >= L_HI) or (hat{x}_{t+30} <= L_LO) then:
         S_cand <-- T-30
     else if (N_10 >= theta) and is_drifting then:
         S_cand <-- T-30               // Anomaly density shift detected
     else:
         S_cand <-- NORMAL
5: [Layer 6: ISA-18.2 Hysteresis Latch Anti-Chattering]
     Rank(S) = { NORMAL: 0, T-30: 1, T-20: 2, T-10: 3, EVENT: 4 }
     if Rank(S_cand) >= Rank(S_{t-1}) then:
         S_t <-- S_cand                // Immediate escalation
         C_{hold} <-- K                // Reset hold-down timer
     else:
         if C_{hold} > 0 then:
             S_t <-- S_{t-1}           // Maintain warning state
             C_{hold} <-- C_{hold} - 1 // Decrement hold timer
         else:
             S_t <-- S_cand            // De-escalate only after K stable steps
6: [Layer 7: Fused Multi-Factor Risk Index R(t)]
     S_margin  <-- max(0, 1.0 - (L_HI - x_t) / (L_HI - mu_B))
     S_TTL     <-- max(0, 1.0 - TTL / 60.0)
     S_density <-- min(1.0, N_10 / 5.0)
     S_floor   <-- { EVENT: 100, T-10: 75, T-20: 50, T-30: 25, NORMAL: 0 }[S_t]
     R(t) <-- max( S_floor, 35 * S_margin + 35 * S_TTL + 30 * S_density )
7: return (S_t, C_{hold}, R(t))
================================================================================
"""

def algorithm_3_7l_ih_ac(
    cur_val: float,
    fcst_10: float, fcst_20: float, fcst_30: float,
    n10: float, slope: float, ttl: float,
    prev_state: str, hold_count: int,
    l_hi: float = 1.70, l_lo: float = 1.30,
    theta: float = 2.0, g_pct: float = 5.0, k_hold: int = 3
) -> Tuple[str, int, float]:
    # L5 Event Check
    if cur_val >= l_hi or cur_val <= l_lo:
        return "EVENT", k_hold, 100.0

    # L2 Span Gate
    span = l_hi - l_lo
    gate = (g_pct / 100.0) * span
    is_drifting = (abs(slope) * 30.0 >= gate)

    # Pre-State Candidate
    if fcst_10 >= l_hi or fcst_10 <= l_lo:
        cand_state = "T-10"
    elif fcst_20 >= l_hi or fcst_20 <= l_lo:
        cand_state = "T-20"
    elif fcst_30 >= l_hi or fcst_30 <= l_lo:
        cand_state = "T-30"
    elif n10 >= theta and is_drifting:
        cand_state = "T-30"
    else:
        cand_state = "NORMAL"

    # L6 Hysteresis
    rank = {"NORMAL": 0, "T-30": 1, "T-20": 2, "T-10": 3, "EVENT": 4}
    if rank[cand_state] >= rank.get(prev_state, 0):
        new_state = cand_state
        new_hold = k_hold
    else:
        if hold_count > 0:
            new_state = prev_state
            new_hold = hold_count - 1
        else:
            new_state = cand_state
            new_hold = 0

    # L7 Risk Index
    margin_score = max(0.0, min(1.0, (cur_val - l_lo) / span if slope < 0 else (cur_val - 1.50) / (l_hi - 1.50)))
    ttl_score = max(0.0, min(1.0, 1.0 - ttl / 60.0))
    density_score = min(1.0, n10 / 5.0)
    floor_score = {"EVENT": 100.0, "T-10": 75.0, "T-20": 50.0, "T-30": 25.0, "NORMAL": 0.0}.get(new_state, 0.0)

    fused_risk = max(floor_score, 35.0 * margin_score + 35.0 * ttl_score + 30.0 * density_score)
    return new_state, new_hold, round(fused_risk, 1)
