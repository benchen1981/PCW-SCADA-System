# -*- coding: utf-8 -*-
"""
baselines.py — Formal implementation of baseline models and evaluation metrics for PCW SCADA thesis.

Models included:
1. StaticThresholdModel (ISA-18.2 standard threshold checking)
2. EWMAModel (Exponentially Weighted Moving Average statistical process control)
3. NaiveLinearRegressionModel (Standard single-window linear slope extrapolation)
4. ProposedDualWindowEngine (T-30 Anomaly Density + Bilateral Extrapolation + 7-Layer Hardening)

Formal mathematical metrics:
- Accuracy, Precision, Recall (DDR), Specificity, F1-Score, False Alarm Rate (FAR / FPR)
- Mean Lead Time, Median Lead Time, Warning Stability (Streak analysis)
- Latency (mean, p50, p95, p99 in microseconds) and Throughput (samples/sec)
"""
import math
import time
from typing import List, Dict, Any, Tuple, Optional

# ============================================================================
# Formal Metrics Calculator
# ============================================================================
def calculate_metrics(y_true: List[int], y_pred: List[int], lead_times: Optional[List[float]] = None) -> Dict[str, Any]:
    """
    Calculate formal confusion matrix and classification metrics.
    y_true: Ground truth binary state (1 = Fault/Event within forecast horizon, 0 = Normal)
    y_pred: Predicted binary state (1 = Warning/Alarm triggered, 0 = No warning)
    lead_times: List of lead times (in minutes) for true positive detections
    """
    assert len(y_true) == len(y_pred), "Dimension mismatch between ground truth and predictions"
    n = len(y_true)
    if n == 0:
        return {}

    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)

    accuracy = (tp + tn) / n if n > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0  # False Alarm Rate (FAR)

    lead_stats = {}
    if lead_times and len(lead_times) > 0:
        sorted_leads = sorted(lead_times)
        lead_stats = {
            "count": len(lead_times),
            "mean": sum(lead_times) / len(lead_times),
            "median": sorted_leads[len(sorted_leads) // 2],
            "min": sorted_leads[0],
            "max": sorted_leads[-1]
        }
    else:
        lead_stats = {"count": 0, "mean": 0.0, "median": 0.0, "min": 0.0, "max": 0.0}

    return {
        "n": n,
        "TP": tp,
        "FP": fp,
        "FN": fn,
        "TN": tn,
        "Accuracy": accuracy,
        "Precision": precision,
        "Recall": recall,
        "Specificity": specificity,
        "F1": f1,
        "FAR": fpr,
        "LeadTime": lead_stats
    }


# ============================================================================
# Baseline 1: Static Threshold Model (Standard ISA-18.2)
# ============================================================================
class StaticThresholdModel:
    """
    Standard Rule-Based Limit Checking (ISA-18.2).
    Triggers alarm ONLY when current value exceeds engineering limits (L_HI or L_LO).
    Early Warning Lead Time is structurally 0 minutes.
    """
    def __init__(self, high_limit: float = 1.70, low_limit: float = 1.30):
        self.high_limit = high_limit
        self.low_limit = low_limit
        self.name = "Static Threshold (ISA-18.2 Standard)"

    def predict(self, window: List[float]) -> Dict[str, Any]:
        """window[-1] is the current value."""
        v = window[-1]
        is_alarm = (v >= self.high_limit) or (v <= self.low_limit)
        return {
            "model": self.name,
            "state": "ALARM" if is_alarm else "NORMAL",
            "warning": 1 if is_alarm else 0,
            "lead_time": 0.0
        }


# ============================================================================
# Baseline 2: EWMA Model (Statistical Process Control)
# ============================================================================
class EWMAModel:
    """
    Exponentially Weighted Moving Average (SPC Control Chart).
    z_t = lambda * x_t + (1 - lambda) * z_{t-1}
    sigma_z = sigma_0 * sqrt( (lambda / (2 - lambda)) * (1 - (1 - lambda)^{2t}) )
    Control limits: UCL = mu_0 + L * sigma_z, LCL = mu_0 - L * sigma_z
    """
    def __init__(self, lambda_factor: float = 0.20, L: float = 3.0, baseline_pts: int = 60):
        self.lambda_factor = lambda_factor
        self.L = L
        self.baseline_pts = baseline_pts
        self.name = "EWMA Control Chart (SPC, λ=0.2, 3σ)"

    def predict(self, window: List[float]) -> Dict[str, Any]:
        if len(window) < self.baseline_pts:
            return {"model": self.name, "state": "NORMAL", "warning": 0, "lead_time": 0.0}

        base = window[:self.baseline_pts]
        mu_0 = sum(base) / len(base)
        var_0 = sum((x - mu_0) ** 2 for x in base) / (len(base) - 1 if len(base) > 1 else 1)
        sigma_0 = math.sqrt(max(var_0, 1e-8))

        # Compute EWMA on recent points
        z = mu_0
        for x in window[self.baseline_pts:]:
            z = self.lambda_factor * x + (1.0 - self.lambda_factor) * z

        sigma_z = sigma_0 * math.sqrt(self.lambda_factor / (2.0 - self.lambda_factor))
        ucl = mu_0 + self.L * sigma_z
        lcl = mu_0 - self.L * sigma_z

        is_warning = (z > ucl) or (z < lcl)
        return {
            "model": self.name,
            "state": "WARNING" if is_warning else "NORMAL",
            "warning": 1 if is_warning else 0,
            "ewma": z,
            "ucl": ucl,
            "lcl": lcl
        }


# ============================================================================
# Baseline 3: Naive Linear Regression Model (Single Window Trend Extrapolation)
# ============================================================================
class NaiveLinearRegressionModel:
    """
    Standard Ordinary Least Squares (OLS) slope extrapolation over the last k points.
    Forecast: x_{t+h} = x_t + slope * h.
    Triggers warning if x_{t+30} exceeds limit, without anomaly density verification
    or hysteresis stabilization.
    """
    def __init__(self, k_points: int = 10, high_limit: float = 1.70, low_limit: float = 1.30, horizon: int = 30):
        self.k_points = k_points
        self.high_limit = high_limit
        self.low_limit = low_limit
        self.horizon = horizon
        self.name = "Naive OLS Linear Trend (10-point Slope)"

    def predict(self, window: List[float]) -> Dict[str, Any]:
        if len(window) < self.k_points:
            return {"model": self.name, "state": "NORMAL", "warning": 0, "lead_time": 0.0}

        y = window[-self.k_points:]
        n = len(y)
        x_bar = (n - 1) / 2.0
        y_bar = sum(y) / n
        sxx = sum((i - x_bar) ** 2 for i in range(n))
        sxy = sum((i - x_bar) * (y[i] - y_bar) for i in range(n))
        slope = sxy / sxx if sxx > 0 else 0.0

        cur = y[-1]
        fcst_30 = cur + slope * self.horizon
        is_warning = (fcst_30 >= self.high_limit) or (fcst_30 <= self.low_limit)

        ttl = 999.0
        if slope > 0 and cur < self.high_limit:
            ttl = (self.high_limit - cur) / slope
        elif slope < 0 and cur > self.low_limit:
            ttl = (cur - self.low_limit) / abs(slope)

        return {
            "model": self.name,
            "state": "T-30" if is_warning else "NORMAL",
            "warning": 1 if is_warning else 0,
            "slope": slope,
            "forecast_30": fcst_30,
            "ttl": ttl
        }


# ============================================================================
# Proposed Method: T-30 Dynamic Dual-Window Model (7-Layer Hardened Engine)
# ============================================================================
class ProposedDualWindowEngine:
    """
    Proposed Method:
    - Dual-Window Anomaly Density Estimation (B: [t-70, t-10), R: [t-10, t])
    - N10 Ratio = M10 / (M60 / 6)
    - Finite difference slope + OLS 95% Confidence Band
    - Closed-form Time-to-Limit (TTL)
    - Seven-layer industrial hardening with hysteresis latch
    """
    def __init__(self, high_limit: float = 1.70, low_limit: float = 1.30, sensitivity: float = 2.0, slope_gate_pct: float = 5.0):
        self.high_limit = high_limit
        self.low_limit = low_limit
        self.sensitivity = sensitivity
        self.slope_gate_pct = slope_gate_pct
        self.name = "Proposed Method (T-30 Dual-Window + 7-Layer Hardening)"
        self.hold_count = 0
        self.current_state = "NORMAL"

    def predict(self, window: List[float]) -> Dict[str, Any]:
        W = 70
        if len(window) < W:
            return {"model": self.name, "state": "INSUFFICIENT_DATA", "warning": 0, "lead_time": 0.0}

        cur = window[-1]
        # Layer 5: EVENT Check
        if cur >= self.high_limit or cur <= self.low_limit:
            self.current_state = "EVENT"
            self.hold_count = 3
            return {
                "model": self.name, "state": "EVENT", "warning": 1,
                "n10": 0.0, "slope": 0.0, "ttl": 0.0, "r2": 1.0, "lead_time": 0.0
            }

        # Step 1: Base window [t-70, t-10) -> 60 points
        B = window[-70:-10]
        base_avg_60 = sum(B) / 60.0

        # Step 2: Slope calculation: Prior [t-10, t-5) and Recent [t-5, t]
        P = window[-10:-5]
        R = window[-5:]
        mean_p = sum(P) / 5.0
        mean_r = sum(R) / 5.0
        slope = (mean_r - mean_p) / 5.0
        direction = 1.0 if slope >= 0 else -1.0

        # Step 3: Directional counts M60 and M10
        m60 = sum(1 for x in B if direction * (x - base_avg_60) > 0)
        recent_10 = window[-10:]
        m10 = sum(1 for x in recent_10 if direction * (x - base_avg_60) > 0)

        # Anomaly Density N10
        if m60 == 0 and m10 > 0:
            n10 = 999.0
        elif m60 == 0:
            n10 = 0.0
        else:
            n10 = m10 / (m60 / 6.0)

        # Step 4: OLS Regression over recent 10 points
        n = 10
        y = recent_10
        x_bar = (n - 1) / 2.0
        y_bar = sum(y) / n
        sxx = sum((i - x_bar) ** 2 for i in range(n))
        sxy = sum((i - x_bar) * (y[i] - y_bar) for i in range(n))
        slope_ols = sxy / sxx if sxx > 0 else 0.0
        intercept = y_bar - slope_ols * x_bar

        residuals = [y[i] - (intercept + slope_ols * i) for i in range(n)]
        sse = sum(r ** 2 for r in residuals)
        sst = sum((y[i] - y_bar) ** 2 for i in range(n))
        r2 = 1.0 - (sse / sst) if sst > 1e-12 else 0.0
        se = math.sqrt(sse / (n - 2)) if n > 2 else 0.0
        # 95% Confidence Interval for 30 min horizon (Student-t df=8 is 2.306)
        band_30 = 2.306 * se * math.sqrt(1.0 + 1.0 / n + ((9 + 30 - x_bar) ** 2) / sxx) if sxx > 0 else 0.0

        # Forecast horizons
        fcst_10 = cur + slope * 10.0
        fcst_20 = cur + slope * 20.0
        fcst_30 = cur + slope * 30.0

        # Time-to-limit (TTL)
        ttl = 999.0
        if slope > 0 and cur < self.high_limit:
            ttl = (self.high_limit - cur) / slope
        elif slope < 0 and cur > self.low_limit:
            ttl = (cur - self.low_limit) / abs(slope)

        # Layer 2: Span-normalized drift gate
        span = self.high_limit - self.low_limit
        slope_gate = (self.slope_gate_pct / 100.0) * span
        drifting = (abs(slope) * 30.0) >= slope_gate

        # Decision Engine Logic
        raw_state = "NORMAL"
        if fcst_10 >= self.high_limit or fcst_10 <= self.low_limit:
            raw_state = "T-10"
        elif fcst_20 >= self.high_limit or fcst_20 <= self.low_limit:
            raw_state = "T-20"
        elif fcst_30 >= self.high_limit or fcst_30 <= self.low_limit:
            raw_state = "T-30"
        elif n10 >= self.sensitivity and drifting:
            raw_state = "T-30"

        # Layer 6: Hysteresis Latch
        hierarchy = {"NORMAL": 0, "T-30": 1, "T-20": 2, "T-10": 3, "EVENT": 4}
        if hierarchy[raw_state] >= hierarchy[self.current_state]:
            self.current_state = raw_state
            self.hold_count = 3
        else:
            if self.hold_count > 0:
                self.hold_count -= 1
            else:
                self.current_state = raw_state

        is_warning = 1 if self.current_state in ("T-30", "T-20", "T-10") else (1 if self.current_state == "EVENT" else 0)

        return {
            "model": self.name,
            "state": self.current_state,
            "warning": is_warning,
            "n10": n10,
            "slope": slope,
            "slope_ols": slope_ols,
            "r2": r2,
            "band_30": band_30,
            "ttl": ttl,
            "fcst_10": fcst_10,
            "fcst_20": fcst_20,
            "fcst_30": fcst_30
        }
