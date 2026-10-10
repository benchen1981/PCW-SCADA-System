# PCW Web SCADA - 開發對話與架構紀錄 (Prompt 01-002)

## 1. 開發任務摘要 (Development Task Summary)
本階段接續先前的 SCADA 介面清理與重構，專注於 **Modbus & Simulator Center 的進階控制與動態安全閥值 (Alarm Limits) 設定**，並全面連動至系統的決策引擎與 UI 顯示。

## 2. 系統架構調整 (System Architecture Updates)

### 2.1 底層資料結構 (Domain & Repository)
*   `SensorTag` 內的 `EngineeringLimits` 介面新增了 `baseline` 屬性。
*   在 `sensorDefinitions.ts` 中，依據不同 PCW 系統 (PCW01 ~ PCW08) 與感測器型別 (PT, FT, DP) 動態賦予對應的初始 Baseline 與 H/HH/L/LL Alarm Limits。
*   `scadaStore.ts` 與 `PcwDataService.ts` 新增 `updateSensorLimits` 邏輯，允許全域動態更新 Sensor 警報閥值。

### 2.2 預測決策引擎升級 (System Prediction Engine)
*   **動態門檻 (Dynamic Thresholds)**：修正 `SimulatorEngine.ts` 原先寫死 1.70 作為高壓報警的邏輯。全面改寫為讀取各感測器的 `engineeringLimits.high` 屬性。
*   **觸發軌跡 (Trigger Path Evidence)**：預測引擎的 Trigger Path 現在會根據該系統自訂的閥值來進行 T-10/T-20/T-30 的智慧預測，使每一套系統都能擁有準確的預防保養依據。

### 2.3 使用者介面 (UI / UX)
*   **ModbusMonitor.tsx** 介面更新：
    *   面板名稱更正：`Engine Control` ➝ `PCW Loop Simulator Center`，`System-Wide Override` ➝ `Default Loop Settings`。
    *   新增 **預覽動態面板**：在選擇目標系統時，動態顯示該系統 PT/FT/DP 的 Baseline 與 HH/H/L/LL Limits 預覽。
    *   新增 **一鍵復原**：`Apply Suggested Baselines` 按鈕同時連動 Baseline 與 H/HH/L/LL 的還原。
    *   新增 **手動設定欄位**：在 "Inject Values" 區塊新增 High-High, High, Low, Low-Low 輸入框。
    *   新增 **右側資訊欄位**：在 Active Simulator Tags 表格中新增 `Limits (HH/H/L/LL)` 欄位，並套用紅/藍警示色。

## 3. 開發過程與 Prompt 紀錄 (Development Process & Prompts)

**User Prompts:**
1. "將上一階段所有pcw系統的pt、ft、dp sensor baseline設定值設為預設值，並顯示於Modbus Simulator畫面，並可讓使用者直接套用"
2. "Modbus & Simulator Center的'Engine Control'改名稱為'PCW Loop Simulator Center', 'System-Wide Override'改名稱為'Default Loop Settings'"
3. "所有pcw系統的pt、ft、dp sensor 預設baseline設定值需顯示在Modbus & Simulator Center，以提醒按下Apply Suggested Baselines按鈕後是套用什麼設定值"
4. "alarm limit設定也要顯示在Modbus & Simulator Center，無論是自動或手動"
5. "Modbus & Simulator Center新增可設定所有sensor H/HH/L/LL alarm limit 各別單一設定，在Default Loop Settings的Target System可以直接套 Default baseline H/HH/L/LL alarm limit"
6. "Modbus & Simulator Center右側視窗需新增顯示各sensor H/HH/L/LL alarm limit 設定值"
7. "所有任務都完成了嗎？檢查計劃並確認所有項目都已落實。"

**Agent Actions:**
*   修改 `sensorTypes.ts` 新增 `baseline` 屬性。
*   修改 `sensorDefinitions.ts` 為系統寫入預設閥值。
*   大幅修改 `ModbusMonitor.tsx`，加入狀態勾選邏輯、 Limits 動態生成面板、右側表格欄位，以及實作 `Apply` 按鈕的邏輯連動。
*   修改 `scadaStore.ts` 與 `PcwDataService.ts` 擴充狀態管理。
*   修改 `SimulatorEngine.ts` 進行預測引擎的核心參數動態化。
