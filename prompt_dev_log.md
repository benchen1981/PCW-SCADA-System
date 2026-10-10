# Development Process & Prompts (開發過程與對話紀錄)

## Initial Architecture Phase (初期架構階段)
**Prompt**: "這專案是用於半導體廠的網頁版scada，監控pcw系統，整體程式重點在於偏移偵測 (Drift Detection)、趨勢預測 (Forecast)。系統將會移植至真實工廠落地運行，並且發展論文參加競賽，也將參與專利申請。立即以多方最專業角度審查、強化所有頁面、功能"
**Action Taken**: 
- Established robust domain model (`predictionTypes.ts`, `sensorTypes.ts`, `modbusTypes.ts`) supporting OLS confidence, TTL, risk indices.
- Upgraded UI aesthetic to premium modern web design standards.
- Replaced shared array historian with a per-tag typed-array ring-buffer historian (`HistorianStore.ts`) to avoid O(N) shift operations and memory overflows under LocalStorage limits.

## Analytics & Engine Phase (分析與引擎階段)
**Prompt**: "探討模型驗證的 KPI 指標，深入了解 N10 異常密度的數學定義，查看系統架構與資料流向，檢視模型驗證的混淆矩陣與 KPI 指標"
**Action Taken**:
- Created `DriftForecastEngine.ts` as a deterministic, unit-testable engine preserving thesis formulas, adding industrial-grade quality gating and OLS-based confidence intervals.
- Implemented `AlarmEngine.ts` compliant with ISA-18.2/IEC 62682 standards with deadbands, on-delays, and predictive drift alarms.
- Rewrote `SimulatorEngine.ts` for fault injection and 1-minute aggregations, incorporating background throttling using `setInterval`.

## Persistence Phase (資料持久化階段)
**Prompt**: "系統將會移植至真實工廠落地運行...所有任務都完成了嗎？"
**Action Taken**:
- Refactored `MockDatabase.ts` for compact snapshot management within LocalStorage (5MB limit).
- Added noise-based backfill for smooth startup to avoid false-alarm triggers.
- Integrated an audit journal for traceability.
