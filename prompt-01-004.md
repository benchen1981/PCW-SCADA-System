# Phase 4: 介面精簡、說明文件同步與無用功能移除紀錄 (prompt-01-004.md)

## 開發過程與對話紀錄 (Development Prompts)

本階段著重於改善終端使用者的視覺體驗 (UI/UX)，優化決策引擎的證據輸出格式，並確保系統內的技術文件與底層數學模型 100% 同步。

### Prompt 1: 優化 Trigger Path Evidence 版面
**User**: 
> System Prediction的Decision Engine中Trigger Path Evidence太佔版本，立即優化

**AI Response**: 
- 分析發現 `Trigger Path Evidence` 由於包含了過多的前置特徵數值 (如 Base60, M60, M10, Slope)，導致字串過長撐開版面。
- 既然這些特徵已經呈現在前方的專屬欄位中，因此修改 `SimulatorEngine.ts` 的輸出邏輯，將 `Trigger Path` 精簡為只輸出「最終決策依據與警報級別」(如: `Fcst10 (2.85) reaches HH (2.8) ➔ ALARM`)，大幅減少表格寬度負擔。

### Prompt 2: 核實 Prediction Model Info 內容
**User**: 
> 立即核實Prediction model info內容與現行模型是否一致

**AI Response**: 
- 檢閱 `PredictionHelpModal.tsx` 後，發現其內容還停留在初期的舊版邏輯。
- 全面更新了數學公式說明：將 `m60`/`m10` 更新為支援向上與向下雙向漂移追蹤的語意；更新了 `Slope` (斜率) 為支援正負值雙向運算；更新了 `Forecast` 外推公式為現行精準的 `CurrentValue + Slope * X`。

### Prompt 3: 移除 SAT Evidence
**User**: 
> SAT Evidence功能完全無用處，sat就是實際測試，刪了吧

**AI Response**: 
- 確認 `SATEvidence` (廠驗證據) 只是測試階段的過渡產物，並非最終產品 UI 必需。
- 將 `src/pages/SATEvidence.tsx` 檔案徹底刪除，並將 `App.tsx` 中的導航連結與 Router 路由設定一併清除。

### Prompt 4: 彰顯預測引擎的兩大核心目的
**User**: 
> Prediction要達到1.目前行為是否已改變產生偏移，2.推算出未來 (T+10, T+20, T+30)預測值是否將達到工程極限值 (Engineering Limits: HH, H, L, LL)判定未來的健康狀態
> 所以Prediction model info內容要清楚說明這二個推論的目的、流程、結果...等說明

**AI Response**: 
- 在 `PredictionHelpModal.tsx` 的最上方，新增了一個帶有視覺強調 (紫框) 的「**🎯 核心推論目的 (Core Objectives)**」區塊。
- 明確列出：「1. 目前行為是否已改變產生偏移 (Drift Detection)」以及「2. 判定未來的健康狀態 (Limit Forecast)」，讓使用者打開說明的瞬間就能直接掌握模型的價值與意義。

### Prompt 5 & 6: 總結確認與文件產出
**User**: 
> 所有任務都完成了嗎？檢查計劃並確認所有項目都已落實。
> 生成詳細中英文readme.md, 包含所有prompt、執行步驟、系統架構、開發過程、debug記錄及使用方法

**AI Response**: 
- 確認所有介面與文件優化任務皆已完成。
- 生成本階段專屬的 `prompt-01-004.md` 與 `debug-01-004.md`，並同步更新主體的 `README.md`。

---

## 專案架構變動 (Architecture Updates)

在此階段，系統架構與功能主要進行了「瘦身」與「對齊」：
1. **Model Synchronization (模型說明同步)**：確立了前端介面文件與後端演算法邏輯的 Single Source of Truth，確保 `SimulatorEngine.ts` 內的數學公式與 `PredictionHelpModal.tsx` 中顯示的公式完全吻合。
2. **UI Cleanup (無用路由清理)**：精簡了 React Router 的架構，拔除 `SATEvidence`，減少無謂的 Bundle 負擔。
