# Phase 16: V2.1 UI, Historian, Modbus & Prediction Optimization

## 目的 (Purpose)
根據 V2.1 規格大幅度重構前端 UI 呈現方式，並增強資料持久性與可解釋性。目標是將現有的 Web Dashboard 風格轉變為工業 SCADA / Process HMI 風格，並修復一些系統性的問題。

## 執行過程 (Execution Process)

### 1. Historian 資料庫持久化 (Historian Persistence)
- **問題**：原先的 Historian 與 Alarms 資料僅存在於 `MockDatabase.ts` 的記憶體中，當開發伺服器重啟或網頁重新整理時，歷史資料會全數遺失，無法滿足 SCADA 系統的基本稽核與趨勢圖需求。
- **解決方案**：
  - 在 `MockDatabase.ts` 初始化時，從 `localStorage` 讀取並還原 `pcw_historian`、`pcw_alarms` 與 `pcw_simulatorStatus`。
  - 於 `MockDatabase` 中新增 `persist()` 函式，並在 `SimulatorEngine` 每次迭代 (Tick) 時呼叫，以確保持續保存最新資料。

### 2. Modbus Simulator 自動啟動 (Simulator Auto-Start)
- **問題**：Simulator 必須由使用者手動點擊啟動，而真實世界中 SCADA Simulator 或底層通訊常駐程式應該是自動啟動的。
- **解決方案**：
  - 修改 `MockDatabase` 的 `simulatorStatus` 預設值，並在還原狀態時確保 `isRunning` 為 true。
  - 在 `App.tsx` 的 `useEffect` 中，於啟動 UI 輪詢的同時一併呼叫 `setSimulatorControl('START', 1000)` 自動啟動引擎。

### 3. P&ID Process Mimic 轉換 (Live Sensors HMI)
- **問題**：`LiveSensors.tsx` (Live Sensor Data) 頁面原先僅是一張巨大的資料表，不符合操作員 (Operator) 直覺判讀管線與設備關聯的需求。
- **解決方案**：
  - 引進雙模式切換 (`Process View` / `Table View`)。
  - `Process View` 實作了工業標準的 SVG P&ID 繪圖：藍色 Supply Header、紅色 Return Header，並透過動態迭代繪製各 Submain 的分支、傳感器節點以及負載 (Fab Tool)。
  - 加入了左側 System Tree，允許使用者快速切換檢視不同的 PCW 系統 (PCW01 ~ PCW08)。

### 4. 系統全域篩選 (System Scope Filtering)
- **問題**：`ModbusMonitor.tsx` 中的 Modbus Monitor 頁籤與 Sensor Simulator 頁籤缺乏完整的 PCW01 - PCW08 篩選機制，且未與實際的 `sensors` 陣列連動。
- **解決方案**：
  - 新增 `simSysFilter` 狀態，將下拉選單選項從寫死的陣列改為 `sensors.map(s => s.systemId)` 動態生成。
  - 將 Sensor Simulator 中的表格渲染由 `sensors.map` 改為 `filteredSimSensors.map`，並且將「Select All」按鈕的邏輯也修正為只選取當前篩選過顯示出的 Tag。

### 5. Prediction 分析介面命名 (Prediction Renaming)
- **問題**：介面名稱為 `T30/T20/T10 Prediction`，不符合規格要求的 `System Prediction`。
- **解決方案**：
  - 修改 `App.tsx` 側邊欄路由名稱。
  - 修改 `PredictionT30.tsx` 頁面主標題，統一改為 `System Prediction`。

## 系統架構 (System Architecture)
經過此階段，系統具備了真正意義上的 Local Persistence，架構更接近 Edge SCADA：
- **Data Source**: SimulatorEngine (Background auto-running)
- **Persistence**: LocalStorage Adapter in MockDatabase
- **State Management**: Zustand `useScadaStore` polling `PcwDataService`
- **UI Presentation**: Process Mimic (P&ID SVG), Trend Charts, Engineering Tables

## 使用方法 (Usage)
1. 開啟頁面後，系統自動開始模擬並產生資料，無須手動啟動 Simulator。
2. 導航至 `Live Sensor Data`，預設為 `Process View`，點擊圖元上的傳感器節點 (PT) 即可開啟側邊 Tag 詳細資料與微型趨勢圖。
3. 點擊右上角 `Table View` 可切換回舊版表格檢視。
4. 導航至 `Modbus Simulator` 內的 `Sensor Simulator` 頁籤，可以使用左側下拉選單選擇特定系統 (例如 PCW02) 進行批次注入，不會再誤觸其他系統。
5. 重新整理網頁後，切換至 `Historian Trend`，將會發現歷史趨勢完整保留，證明持久化生效。
