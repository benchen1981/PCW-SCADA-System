# 開發過程與 Prompt 紀錄 (Development Prompts)

本文件記錄了系統開發與整併過程中所使用的核心指令 (Prompts)。

## 1. 專案整併與架構審查 (Project Merge & Review)

**User Prompt:**
> 立即執行計畫並將以所有的code重新審查合併後實施專案@[Code] @[PCW_POC_系統架構開發_執行計畫_V1.0.md]

**AI Agent Action:**
- 讀取了系統架構計畫 (`PCW_POC_系統架構開發_執行計畫_V1.0.md`)。
- 使用 `rsync` 腳本，將 `pcw-poc-v1` 到 `pcw-poc-v1 5` 五個歷史版本的程式碼提取並合併至新的 `pcw-poc-v1_merged` 資料夾，以最新修改時間覆蓋舊檔。
- 生成了 `goal_execution_plan.md` 以追蹤 1 到 15 層 (Layers) 的實作進度。

## 2. 深度自主執行 (Autonomous Execution)

**User Prompt:**
> /goal (選擇：全部重新審查，並建立一個全新的 pcw-poc-v1_merged 資料夾作為最終專案)

**AI Agent Action:**
- AI 進入自主運行模式 (Agentic Goal Mode)。
- 建立 Python 虛擬環境 (`venv`) 並執行 `pytest` 來審查各層架構合約與資料流。
- 補齊了 Web API 靜態路由 (FastAPI StaticFiles)。
- 開發了具備 Glassmorphism (毛玻璃) 質感的 Vanilla JS/CSS Dashboard 儀表板，替換原先簡易的 HTML 字串，並包含 Chart.js 圖表。

## 3. 架構驗證 (Architecture Output / Prompt)

**Agent Self-Prompt (系統架構輸出與檢查指令):**
> 檢查 `app/simulator/sensor_simulator.py` 是否支援 `base_value` 與 `noise_std`。
> 檢查 `app/virtual_plc/modbus_server.py` 是否正確掛載 Modbus Registers。
> 檢查 `app/web_api/main.py` 的 API endpoints 是否與 Dashboard JS fetch 相符 (`/api/health`, `/api/history`, 等)。
