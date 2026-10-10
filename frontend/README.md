# PCW SCADA AI-Generated Web HMI (V2.3)

[English Translation Below](#english-version)

本專案是一個由 AI (Google Antigravity) 全自動生成的 Web SCADA HMI 雛型 (POC)。其目的是展示如何透過嚴謹的 prompt engineering 與架構規劃，自動化生成複雜的工業級控制系統 UI 與模擬後端。

## 系統架構 (System Architecture)
本系統採用 **React + TypeScript + Vite** 作為前端框架，並搭配 **Zustand** 進行全域狀態管理 (State Management)。
架構上實踐了嚴格的**單向資料流 (Unidirectional Data Flow)** 與**關注點分離 (Separation of Concerns)**：

1. **Simulator Engine (模擬引擎)**: 
   - 位於 `services/SimulatorEngine.ts`。
   - 使用純記憶體 (In-memory) 演算法模擬 8 套 PCW 系統 (共計超過 300 個 Tag)，包含常態雜訊 (Noise)、偏移 (Drift)、突波 (Spike)、通訊中斷 (Comm Loss) 等物理特性。
   - 負責每秒更新所有數值並觸發 Alarm Engine 評估。
2. **Mock Database (假資料庫)**:
   - 位於 `repositories/MockDatabase.ts`。
   - 作為資料的單一真值來源 (Single Source of Truth)，儲存了所有 Sensor 設定 (包含 Engineering Limits)、即時數值與警報歷史紀錄 (Alarm Events)。
3. **PcwDataService (資料服務層)**:
   - 位於 `services/PcwDataService.ts`。
   - 提供非同步 (Promise-based) 介面供前端狀態管理器呼叫，解耦了前端 UI 與底層資料庫。
4. **Zustand Store (狀態管理器)**:
   - 位於 `store/scadaStore.ts`。
   - 集中調度 UI 資料，支援 Polling (即時輪詢)、歷史資料請求及非同步指令下發 (例如：ACK Alarm、Shelve Alarm)。
5. **UI Pages (前端頁面)**:
   - 包含 Plant Overview、Live Sensors (SVG Process 視圖)、Historian Trend (歷史趨勢)、Live Trend (即時趨勢)、Alarms Center 與 T30 Prediction 等模組，完全專注於渲染與互動，無業務邏輯耦合。

## 開發過程與 Prompt 紀錄
專案的每一個階段都是透過明確的 Prompt 指令來引導 AI 進行開發與除錯，包含詳細的 `prompt xx-xxx.md` 和 `debug xx-xxx.md` 紀錄。

*   **Phase 1-16 (V1 & V2.1)**: 建立初始架構、狀態庫、T30 預測引擎及 Modbus 視窗。相關紀錄封存於先前的專案歷史。
*   **Phase 17 (V2.2)**: 大規模 HMI Hunks 修復、5x4 Grid 擴展、Historian limits 整合及 Simulator 效能修復。
    *   [prompt 17-v2.2-fixes.md](./prompt%2017-v2.2-fixes.md)
    *   [debug 17-v2.2-fixes.md](./debug%2017-v2.2-fixes.md)
*   **Phase 18 (V2.3)**: 強化操作員可用性，導入 1920x1080 原生視覺解析度，重新設計 Submain 鑽取 (Drill-down) 路由，建立全新的即時趨勢模組 (Live Trend)，並實作完整警報生命週期 (ACK vs Clear)。
    *   [prompt 18-v2.3-optimization.md](./prompt%2018-v2.3-optimization.md)
    *   [debug 18-v2.3-optimization.md](./debug%2018-v2.3-optimization.md)

## 執行步驟與使用方法 (How to Use)
1. **安裝依賴**: 
   請確保您的環境中已安裝 Node.js (建議版本 v18+)。
   ```bash
   npm install
   ```
2. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```
3. **功能操作說明**:
   - **Plant Overview (系統總覽)**: 透過 8 個操作狀態卡片監看全廠概況，下方提供最新 10 筆未解警報，您可以直接於此處進行 **ACK (確認)** 操作。
   - **Live Sensor Data (即時圖控)**: 以 SVG 工業管線圖呈現，支援 1920x1080 解析度原生縮放。點擊管線上的 `Submain` 文字框可鑽取進入該 Submain 之詳細點位列表 (Submain Detail)。
   - **Historian Trend (歷史趨勢)**: 選取點位後可勾選 "Show Alarm Limits" 顯示 1.2~1.8 bar 之告警上下限基準線。
   - **Live Trend (即時趨勢)**: 採用 Ring Buffer 技術獨立於 Historian 運作，支援 5~60 分鐘即時波形持續滾動。

---

# English Version

## System Architecture
This system utilizes **React + TypeScript + Vite** for the frontend, coupled with **Zustand** for global state management.
The architecture adheres to strict **Unidirectional Data Flow** and **Separation of Concerns**:

1. **Simulator Engine**: Uses in-memory algorithms to simulate 8 PCW systems (over 300 tags). Handles noise, drift, spikes, comm loss, and evaluates alarm triggers on every tick.
2. **Mock Database**: Acts as the single source of truth for the backend, storing tags, configurations, and alarm histories.
3. **PcwDataService**: Provides a Promise-based abstraction layer to decouple the UI from data fetching and simulation mechanics.
4. **Zustand Store**: Orchestrates state propagation and API polling, funneling mock-server updates into the React rendering tree.
5. **UI Pages**: Independent views such as SVG Process Maps, Recharts-based Trends, and Alarms Centers.

## Development Process & Prompts
All development phases were meticulously guided via explicit AI prompts. Development and debugging records for each phase are preserved in markdown files (`prompt xx.md` and `debug xx.md`).
- **Phase 17 (V2.2)**: Focused on rectifying HMI regression issues, expanding grid layouts, and eliminating simulator crashing bugs.
- **Phase 18 (V2.3)**: Optimized operator workflows by redesigning Submain Drill-downs, scaling the Live Process views for native 1080p rendering, introducing the standalone "Live Trend" streaming module, and formalizing Alarm ACK behaviors.

## Usage Instructions
1. **Install Dependencies**: `npm install`
2. **Start Dev Server**: `npm run dev`
3. **Interacting with HMI**: 
   - Navigate to "Plant Overview" to ACK alarms.
   - Click on the SVG "Submain" blocks in "Live Sensor Data" to drill down into localized sensor grids.
   - Utilize "Live Trend" for real-time scrolling plotting of tags up to a 60-minute interval with alarm reference limits enabled.
