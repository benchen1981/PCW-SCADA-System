# Phase 3: Prediction Engine 全域化與 Historian 連動整合紀錄 (prompt-01-003.md)

## 開發過程與對話紀錄 (Development Prompts)

本階段著重於將 Prediction Engine (預測與決策引擎) 擴展至全系統感測器，強化對上下限 (HH/H/L/LL) 的動態判定，並深度整合至 Historian Trend，讓機器學習特徵能被直接繪製成圖表。

### Prompt 1: 預測引擎全域化與動態極限值
**User**: 
> Prediction模型只有一個，需套用到整個系統，所有pcw01~08系統的pt、ft、dp sensor 回傳值可以功能預測，達到1.目前行為是否已改變產生偏移，2.推算出未來 (T+10, T+20, T+30)預測值是否將達到工程極限值 (Engineering Limits: HH, H, L, LL)判定未來的健康狀態

**AI Response**: 
- 將 `SimulatorEngine.ts` 中原本限定 `PRESSURE` 的篩選器移除，使模型套用至所有 PT, FT, DP 感測器。
- 修改 Slope 演算法，支援「雙向 (正/負) 漂移偵測」。
- 導入完整的 4 階段工程極限值 (HH, H, L, LL) 動態讀取與比對，精準標記警報級別 (`T-10 ALARM`, `T-20 WARN` 等)。

### Prompt 2: Historian 資料不足導致預測停滯
**User**: 
> Decision Engine的Trigger Path Evidence內一直顯示[Hold] INSUFFICIENT_DATA (Need 70 points, currently have 35)，sensor value一直都有，立即核實是否無與historian或Modbus Simulator串接失效

**AI Response**: 
- 確認主因為 Historian 頻率為每分鐘 1 筆，收集 70 筆需要等待 70 分鐘。
- 初期暫時調降資料門檻至 30 秒並加快 Historian 取樣率以利 POC 測試。

### Prompt 3: UI 新增 Limits 欄位
**User**: 
> Prediction需新增顯示各sensor H/HH/L/LL alarm limit 設定值，使推論結果更容易判斷是否與Current Value、推論結果、準確率一致

**AI Response**: 
- 於 `PredictionT30.tsx` 中新增 `Limits (HH/H/L/LL)` 欄位。
- 加入紅藍色彩標示，讓使用者能直觀對比 Fcst10/20/30 的推算值與設定閥值。

### Prompt 4: 還原預測引擎頻率
**User**: 
> Prediction模型執行頻率為每一分鐘執行一次，立即核實

**AI Response**: 
- 將 Prediction 執行週期嚴格還原為每分鐘一次 (`db.simulatorStatus.iteration % 60 === 0`)。
- 為解決 70 分鐘等待時間的問題，導入 **Data Seeding (預填歷史資料)** 機制：在系統 RESET 或載入時，直接將過去 70 分鐘的 Baseline 資料推入 Historian，實現隨插即用的預測引擎。

### Prompt 5: 機器學習特徵寫入 Historian
**User**: 
> 將BaseAvg60、M60 / M10、N10 (Limit > 2)、Slope / min、Fcst-30、Fcst-20、Fcst-10每一次推論的結果記錄至Historian，讓使用者以Historian trend選出每個特徵能明顯看出那段時間數值已超標

**AI Response**: 
- 於 `SimulatorEngine.ts` 每一分鐘執行推論後，將這 8 項特徵以虛擬 Tag 形式 (`{TagID}_BaseAvg60`, `{TagID}_Fcst10` 等) 寫入 Historian。
- 修改 `HistorianTrend.tsx` 的查詢面板，將這些虛擬 Tag 加進 `availableTags` 中供使用者搜尋並匯出成趨勢圖。

### Prompt 6 & 7: 確認與文件生成
**User**: 
> 所有任務都完成了嗎？檢查計劃並確認所有項目都已落實。
> 生成詳細中英文readme.md, 包含所有prompt、執行步驟、系統架構、開發過程、debug記錄及使用方法

**AI Response**: 
- 確認所有任務皆已完成。
- 撰寫並生成 `prompt-01-003.md`, `debug-01-003.md` 以及主體的 `README.md`。

---

## 專案架構變動 (Architecture Updates)

在此階段，系統架構在資料流上進行了擴充：
1. **SimulatorEngine**: 
   從單純的「資料產生器」轉型為「即時特徵工程引擎 (Feature Engineering Engine)」。不僅運算數值，還將自身產出的特徵參數重新打回 Historian 資料庫。
2. **Virtual Tags System**: 
   在原本的實體 Sensor Tags 之外，架構中正式引入了虛擬特徵 Tags，這些 Tags 具有實體 Tag 的前綴與特定的特徵後綴，在前端 UI 可以被同等視為實體 Tag 進行歷史調閱。
