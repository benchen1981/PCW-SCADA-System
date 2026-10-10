# 開發過程對話紀錄 (Development Prompts & Architecture)

本文件詳細記錄了 Web SCADA PCW PoC V1 專案從需求發想到具體功能實作的對話歷程 (Prompts)，以及針對架構所做出的決策。

## 階段一：核心框架與 UI 介面確立
**User Prompt 紀錄:**
> 「SCADA 顯示以『操作員快速辨識狀態』優先，而不是網頁視覺特效。請設計一個以深色工業風為主，搭配高對比顏色的系統介面。以 http://localhost:5173/ 為單一網站，廢棄 http://127.0.0.1:8000/。」

**Action & Architecture:**
- 確定使用 React (Vite) 作為前端框架，放棄純 Python/HTML 的前後端分離模式。
- 設計 `index.css`，採用 `--panel-bg`, `--accent`, `--danger` 等 CSS 變數，實現高對比深色工業風介面 (Dark Industrial UI)。
- 建立 `MainLayout.tsx` 導覽列以及側邊菜單。

## 階段二：Prediction Engine (預測引擎) 說明更新與開關設計
**User Prompt 紀錄:**
> 「System Prediction engine on/off 功能太廢了，這無法看出那個系統、submain、sensor Prediction功能是否已啟用，或是全局的功能是否已啟用，立即優化。」
> 「Prediction model info 改中文，且並將數學公式清楚說明，所有資料特徵也要說明，資料處理+運算流程也要說明。」

**Action & Architecture:**
- 引入了 `PredictionConfig` 結構，允許使用者以 Global, System, Submain, Sensor 四個層級單獨開關預測功能。
- 在 `PredictionT30.tsx` 中加入 Dropdown 篩選器與單獨的 Checkbox。
- 全面改寫 `PredictionHelpModal.tsx` 為繁體中文，清楚定義 `M60`, `M10`, `N10`, `BaseAvg60` 等變數，並展示數學公式 (`Forecast = Current + Slope * X`)。

## 階段三：圖表 (Trend) 操作體驗優化
**User Prompt 紀錄:**
> 「Historian trend和Live Trendy軸與x軸一樣有卷軸可使用」
> (後續修改)：「Historian trend和Live Trendy軸與x軸一樣有卷軸，這不是我想要的無法出與x軸一樣，則立即回滾到上一版再優化。Historian trend和Live Trend新增y軸zoom in/out功能」

**Action & Architecture:**
- 移除了客製化的垂直 Scrollbar (因為與 Recharts 預設行為衝突且不美觀)。
- 在 `HistorianTrend.tsx` 與 `LiveTrend.tsx` 導入了「懸浮 UI 控制面板」。
- 新增 Y 軸操作按鈕：`[▲ 平移向上]`, `[+ 放大]`, `[↺ 重置]`, `[- 縮小]`, `[▼ 平移向下]`。
- 透過動態計算 Recharts 的 `domain={[(dataMin) => calcMin, (dataMax) => calcMax]}` 實現完美的畫面縮放與平移。

## 階段四：Modbus Monitor 監控增強
**User Prompt 紀錄:**
> 「Modbus monitor新增一個欄位顯示Modbus Simulator設定後該tag顯示的讀值」
> 「sensor Simulator新增一個欄位顯示Modbus Simulator設定後該tag顯示的讀值」

**Action & Architecture:**
- 修改 `ModbusMonitor.tsx` 頁面。
- 在 MONITOR 頁籤新增 `Sim Base Setpoint` 欄位，讓使用者可以與 `Decoded (Eng)` 做比對。
- 在 SIMULATOR 頁籤新增 `Live Value` 欄位，讓使用者在調整 Base, Noise, Drift 時能即時看到變化，而不需要切換頁籤。

## 階段五：AI 模型軌跡與狀態流體驗打磨
**User Prompt 紀錄:**
> 「System Prediction的Decision Engine的Trigger Path Evidence有功能嗎? 只是看爽的嗎?如果沒有就將所有資料特徵處理流程及各階段模型說明」
> 「Modbus Simulator應該持續開啟，tag持續監控，只有有即時讀值超過hi/lo limit便觸發即時警報，Prediction應該保持每分鐘執行一次，執行雙軌預測，但我看到沒照做，立即除錯優化」

**Action & Architecture:**
- 將原先簡略的文字警告替換為完整的「**決策樹模型軌跡 (Decision Tree Model Trace)**」。將資料前處理 (Base60, M60, M10)、特徵萃取 (N10, Slope) 以及雙軌模型比對 (Forecast Limit vs Density Rules) 完全透明化，顯示在 `Trigger Path Evidence` 中。
- 分離警報職責：拔除 Prediction 引擎中的 `hardAlarm` 判斷，確保 Prediction 只專注於雙軌預期發報，而即時的硬體越限警報則完全交由 Alarm Engine 在背後每秒負責發送，滿足使用者要求的邏輯。

---
以上紀錄展示了系統功能從零到有的演進，包含介面打磨、數學模型定義、圖表互動控制以及監控工具與模型解析度的增強。
