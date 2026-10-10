# PCW SCADA System - NextGen Predictive Maintenance (POC ➔ Production)

## 📖 專案簡介 (Project Overview)
**[中文]**
本專案為新一代「程序冷卻水 (PCW) 監控與資料擷取 (SCADA) 系統」。有別於傳統 SCADA 僅提供即時告警，本系統搭載了獨家開發的「預測引擎 (Prediction Engine)」，能透過歷史特徵值 (BaseAvg60, M60, M10) 計算出異常密度 (N10) 與斜率 (Slope)，並提前在事件發生前發出 T-30, T-20, T-10 的預警信號。目前專案已從概念驗證 (POC) 階段升級為可落地 (Production-Ready) 架構，前端已整合 WebSocket 接收即時資料流。

**[English]**
This project is a Next-Generation Process Cooling Water (PCW) SCADA system. Unlike traditional SCADA systems that only provide reactive alarms, this system incorporates a proprietary Prediction Engine. By analyzing historical features (BaseAvg60, M60, M10), it calculates anomaly density (N10) and slopes to issue early warnings (T-30, T-20, T-10). The project has transitioned from a Proof of Concept (POC) to a Production-Ready architecture, featuring a WebSocket-integrated frontend for real-time data streaming.

---

## 🏗️ 系統架構 (System Architecture)
- **Frontend Framework**: React 18 + Vite, TypeScript
- **State Management**: Zustand (Global state for Alarms, Sensors, and UI configuration)
- **Data Visualization**: Recharts (Dynamic downsampling for handling 6-month historical data without UI freezing)
- **Data Layer (POC)**: `SimulatorEngine.ts` & `MockDatabase.ts` running inside the browser to simulate physical PLC and Database.
- **Data Layer (Production)**: `ApiClient.ts` (RESTful) & `WebSocketClient.ts` (Real-time pub/sub push updates). Configurable via `.env` (USE_MOCK).
- **Styling**: Pure CSS (`index.css`) optimized for high-performance, dark-themed industrial SCADA HMI.

---

## ⚙️ 執行步驟與使用方法 (Execution Steps & Usage)

### 1. 安裝與執行 (Installation & Run)
```bash
# 1. 進入前端專案目錄 / Enter frontend directory
cd frontend

# 2. 安裝依賴套件 / Install dependencies
npm install

# 3. 啟動開發伺服器 / Start dev server (POC 模式預設開啟)
npm run dev

# 4. 編譯打包 (Production Build)
npm run build
```

### 2. 使用方法 (Usage Methods)
- **系統總覽 (System Overview)**: 查看 PCW01 - PCW08 等系統的健康度與即時水壓/水流速。
- **預測引擎設定 (Prediction Settings)**: 透過直覺的樹狀選單，針對不同系統、子系統 (Submain) 甚至是特定感測器類型 (PT/FT/DP)，微調靈敏度 (Sensitivity) 與異常密度閥值 (N10 Threshold)。
- **歷史趨勢 (Historian Trend)**: 使用左側 Drawer 的四層過濾器 (System -> Submain -> Sensor Type -> Feature) 精準選出特定感測器的推論特徵 (e.g. BaseAvg60, N10, Fcst30)，並點擊「一鍵全選 (Select All)」進行圖表疊加分析。
- **警報中心 (Alarm Center)**: 查看即時警報與預警 (T-10/20/30)，並支援一鍵單筆簽核 (ACK) 功能。

---

## 🛠️ 開發過程 (Development Process)
本專案開發採用 Agentic AI 輔助配對程式設計 (Pair Programming) 模式，經歷了多次迭代：
1. **Initial MVP**: 建置 React 基礎版面與假資料。
2. **Prediction Engine**: 實作 `SimulatorEngine.ts` 寫入核心 N10 演算邏輯。
3. **UI/UX Refinement**: 重構 `PredictionT30` 成為樹狀結構，提升 HMI 使用者體驗。
4. **Performance Tuning**: 對 `HistorianTrend.tsx` 加入資料動態降採樣 (Downsampling)，解決瀏覽器記憶體爆量問題。
5. **Production Transition**: 建置 API & WebSocket 層架構，準備與真實後端串接。

詳細的所有 Prompt (指示與對話紀錄) 已全數匯出至 `prompt_001-197.md`。

---

## 🐛 除錯紀錄 (Debug Records)
開發期間遇到的核心問題與解法紀錄：
- **QuotaExceededError**: 解決了 `localStorage` 容量限制問題，改採 72 小時滑動視窗 (Sliding Window) 寫入策略，其餘存放於記憶體 `db.historian`。
- **React Render Loop**: 解決了 `SimulatorEngine` 與 Zustand 之間不當觸發 UI 重繪的問題。
- **Historian Tag Limit**: 解決了選擇特徵時被 `slice(0, 100)` 卡住的問題，導入 `Select All` 與分類篩選器 (Sensor Type)。

詳細的報錯紀錄與除錯步驟，已匯出至 `debug_001-050.md`。
