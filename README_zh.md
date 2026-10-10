# PCW 網頁版 SCADA 監控系統

## 專案概述
本專案為針對半導體廠製程冷卻水 (PCW) 系統設計的網頁版 SCADA。系統核心重點在於 **偏移偵測 (Drift Detection)** 與 **趨勢預測 (Forecast)**。

本系統旨在於真實工廠落地運行，並作為學術論文競賽的基礎，未來也將參與專利申請。系統採用工業級標準架構，強調高效能、確定性分析，以及符合 ISA-18.2 標準的警報管理。

## 系統架構
本應用程式完全在瀏覽器端運行，於概念驗證 (PoC) 階段使用模擬後端架構，但其設計可無縫整合真實的 PLC / OPC UA 伺服器。

1.  **資料層 (`SimulatorEngine.ts`)**:
    - 模擬 1 秒原始取樣與 1 分鐘聚合運算。
    - 整合故障注入模型 (Drift, Step, Spike, Bad Quality)。
2.  **資料持久化 (`MockDatabase.ts` & `HistorianStore.ts`)**:
    - 使用高效能、各標籤獨立的 Typed-Array 環形緩衝區來管理 LocalStorage (5MB 限制)。
    - 實作雜訊回填 (Backfilling) 與精簡快照技術。
3.  **分析核心 (`DriftForecastEngine.ts`)**:
    - 運算 N10 異常、線性預測、OLS 信心區間與風險指數 (TTL)。
4.  **警報引擎 (`AlarmEngine.ts`)**:
    - 符合 ISA-18.2 / IEC 62682 標準。處理死區 (Deadbands)、開啟延遲 (On-delays) 以及 BAD/COMM_LOSS 品質傳遞。
5.  **HMI 介面 (React Components)**:
    - 具備現代化、動態且高質感的 UI 體驗。

## 執行步驟 (使用方法)
1.  **安裝依賴套件**: `npm install`
2.  **啟動開發伺服器**: `npm run dev`
3.  **編譯生產版本**: `npm run build`
4.  **預覽生產版本**: `npm run preview`

## 文件連結
- [開發過程與對話紀錄](./prompt_dev_log.md)
- [除錯紀錄](./debug_log.md)
- [English README](./README.md)
