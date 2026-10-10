# Web SCADA V3.2 Development Prompts & Dialogues

## User Requests
1. 生成詳細中英文readme.md, 包含所有prompt、執行步驟、系統架構、開發過程、debug記錄及使用方法
2. 詳細開發過程對話紀錄(prompt)，包含專案架構輸出為prompt xx-xxx.md 
3. 詳細除錯過程對話紀錄(prompt)輸出為debug xx-xxx.md
4. 將所有pcw 系統sumbain縮減至10組
5. Historian trend和Live Trend新增y軸zoom in/out功能
6. Modbus monitor 新增分類可選擇pt、ft、dp...... 不同類別sensor
7. Historian trend選完tag，但部份tag沒有出現trend，應該是抓不到資料
8. System Prediction新增功能開關，並且可指定單一系統或單一submain
9. 左側選單alarm狀態與實際tag讀值/警報設定不一致
10. Historian trend和Live Trendy軸與x軸一樣有卷軸可使用
11. 在最上面功能選單，新增說明按鈕，點進去可顯示System Prediction所有資料特徵處理流程及各階段模型說明
12. Modbus Simulator調整sensor Tag Injection Settings，但 Modbus monitor 看到的結果不一致
13. 目前網站無法開啟，立即重新啟動及除錯http://localhost:5173/
14. Historian trend和Live Trendy軸與x軸一樣有卷軸，這不是我想要的無法出與x軸一樣，則立即回滾到上一版再優化

## AI Responses & Actions
- **縮減 Submain 數量**: 修改了 `pcwSubmains.ts`，將每組 PCW 系統的 Submain 數量從 20 縮減至 10。
- **Modbus Monitor 分類**: 在 `ModbusMonitor.tsx` 增加了感測器類別 (PT, FT, DP) 的下拉式過濾選單，方便操作員快速篩選。
- **Historian Trend 空白問題**: 發現 Recharts 的 `<Line>` 元件遇到 `null` 值會斷線。加入了 `connectNulls={true}` 解決資料陣列中因 Ring Buffer 導致的稀疏空缺問題。
- **System Prediction 開關與過濾**: 在 Header 加入了全域的 Prediction 引擎開關，並在 Prediction 頁面加入了系統與 Submain 過濾器。
- **Alarm 狀態不一致**: 將 `SubmainDetail.tsx` 的警報判斷邏輯拆分為 `hasActiveAlarm` 與 `hasUnackAlarm`。已恢復正常的標籤 (`CLEARED_UNACK`) 改為顯示橘色 `UNACK` badge，而非紅色的 `ALARM`。
- **Prediction 說明按鈕**: 在主選單實作了 `PredictionHelpModal.tsx`，以視覺化流程圖解釋特徵工程、Isolation Forest 與 LSTM 的工作原理。
- **Modbus Simulator 同步問題**: 修復了 Vite 開發環境下 Hot Module Replacement (HMR) 導致 `MockDatabase` 產生多個記憶體實例的 Bug。透過將 `db` 掛載至 `globalThis`，確保 Simulator Engine 與 UI 讀取到同一份資料庫。
- **Y軸卷軸需求撤回 (Rollback)**: 因 Recharts 原生並不支援垂直向的 `<Brush>` 元件，而先前實作的 HTML Slider 卷軸不符合使用者期望的「與 X 軸完全一致」之視覺效果，故依照使用者要求，已將 `LiveTrend.tsx` 與 `HistorianTrend.tsx` 中的 Y 軸卷軸與動態 Zoom 邏輯**全數回滾 (Rollback)** 至預設狀態。
- **文件生成**: 產出了 `README.md`, `prompt_09-V3.2.md` 與 `debug_09-V3.2.md`。
