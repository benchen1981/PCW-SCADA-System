# 詳細開發過程對話紀錄 (Prompts) - V3.1

本文件收錄了在 V3.1 終極版開發與效能調校過程中的關鍵 AI 溝通 Prompt。

### Phase 7: Prediction Engine Tuning & P&ID Detail Integration
- **User Intent**: 
  - 驗證並確保 System Prediction 模型與 Excel 演算法完全一致，且每 1 分鐘執行一次 (`核實System Prediction模型與excel一致，並完整呈現每一輪推理給果`)
  - 要求增加預測各指標的詳細推論說明 (`prediction各指標不夠完整並需加推論說明`)
  - 調整 P&ID (Process Overview) 畫面中，DP 與 FT 感測器的位置，移至 submain 下方的 Return Main Header 處 (`Process Overview的dp和ft位置放下submain下方`)
  - 修復點擊 Submain 詳細畫面時，網頁沒有任何畫面 (白屏) 的嚴重錯誤 (`紅框中的元件點選後的網頁無任何畫面`)
  - 補足 PCW02 ~ PCW08 等系統的 Submain Process View，解除 Hardcode 限制 (`只有PCW01 的 SM Process View，其他都沒有，立即補足`)

- **Implementation Strategy**:
  - **降頻採樣 (Downsampling)**: 將 Historian 的寫入頻率從每秒 1 次降頻為「每 1 個模擬分鐘」1 次。此舉打破了原本 5 萬筆陣列大小的記憶體限制，使其能保留長達 156 分鐘的歷史足跡，滿足了 T-30 預測引擎嚴格的 70 分鐘歷史數據要求。
  - **AI 推論字串生成 (Trigger Path Builder)**: 為 `SimulatorEngine.ts` 引入了高細節的字串建立器，現在會詳細輸出如 `[Density Risk] High anomaly density (N10=3.2 > 2) and elevated value (1.64 >= 1.62)` 等人類可讀的 AI 推理依據，並在 UI 加入了缺少的 `Current Value`。
  - **SVG 座標重構**: 將 `LiveSensors.tsx` 中 Return Pipe 上的 `PTR`, `DP`, `FT` 依序於 Y=510, Y=600, Y=690 進行置中與半徑統一的垂直排列重構。
  - **狀態管理解耦防無限迴圈**: 在 `SubmainDetail.tsx` 中，將 `useScadaStore(state => state.submains.filter(...))` 這種會在 Selector 中回傳全新陣列參考的危險寫法，重構為先取得全體陣列再於元件內過濾，徹底解決了觸發 React `Maximum update depth exceeded` 的崩潰白屏。
  - **動態參數解除**: 修改 `PcwDataService.ts` 的 `getAllSubmains` 允許無參數呼叫，將全廠區的所有管線資料一次性載入前端 `scadaStore`，恢復所有系統的細節視圖。
