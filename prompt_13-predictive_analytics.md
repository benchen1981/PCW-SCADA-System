# Prompt Development Record: Predictive Analytics Module Alignment (Phase 13)

## Conversation Log

**User Prompt 1:**
> 重建預警模組前皆析核實目前使用模型需依此excel及ppt@[/Users/benchen1981/Downloads/Web SCADA/PCW_T30_T20_T10_5頁_資料處理與推理流程_優化版.pptx] @[/Users/benchen1981/Downloads/Web SCADA/PCW_T30_T20_T10_5頁口試必背版.pptx] 差異@[/Users/benchen1981/Downloads/Web SCADA/PCW_T30_T20_T10_FINAL_ROLLBACK_THESIS_VERIFICATION.xlsx]

**Agent Action 1:**
1. Wrote a Python parsing script using `python-pptx` and `pandas` to read the provided PPTX slides and Excel configuration files.
2. Extracted the core logical algorithm:
   - **N10 (Anomaly Density)**: Calculated by comparing the threshold crossings in the recent 10 minutes (M10) to the expected rate from the past 60 minutes (M60/6).
   - **Trend (Slope)**: The difference between the recent 5-minute average and the previous 5-minute average.
   - **Dual-Track Inference Engine**: Warning states (T-30/T-20/T-10) are triggered EITHER when the Forecast (Value + Slope*h) hits the 1.70 limit, OR when N10 > 2 and the Raw Value crosses a specific proximity gate (1.55, 1.58, 1.62).

**User Prompt 2:**
> 立即重建與邏輯對齊

**Agent Action 2:**
1. **Simulator Engine Update**: Rewrote the prediction mock logic in `SimulatorEngine.ts` to strictly emulate the extracted dual-track inference algorithm. It now dynamically calculates `N10`, `M60`, `M10`, `Slope`, and `Forecast30/20/10` based on the Simulator's Drift settings. It also outputs the exact `triggerPath` (evidence).
2. **UI Reconstruction**: Completely rebuilt `PredictionT30.tsx`. Transformed it from a generic table into a deep analytical dashboard.
3. Added column groups for `Anomaly Density (N10)`, `Trend Forecast (Value + Slope*h)`, and `Decision Engine`.
4. Visually highlighted limits (e.g. `Forecast >= 1.70` turns red, `N10 > 2` turns yellow), and prominently displayed the `Trigger Path Evidence` so the underlying model logic is completely transparent to the user/operator.
