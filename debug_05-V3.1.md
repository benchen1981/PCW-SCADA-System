# 詳細除錯過程對話紀錄 (Debug Logs) - V3.1

本文件收錄了在 V3.1 終極版開發與效能調校過程中的關鍵系統層級 Bug 與修復紀錄。

### System Prediction 架構除錯與記憶體問題 (Phase 7)

- **現象描述 (Issue)**: 
  系統持續運轉 (掛機) 長達 6 小時，但 `System Prediction` 演算法始終未產生結果，頁面中所有推論皆顯示 `NORMAL` 與 `INSUFFICIENT_DATA`。同時，使用者點擊 Submain P&ID (Live Sensors) 中的元件（如 Valve 或 Tool）時，跳轉至 `/submain/:systemId` 頁面會引發白畫面（完全無渲染）。另外，Submain Detail 視圖僅能顯示 `PCW01` 的內容。

- **根本原因 (Root Cause)**: 
  1. **Historian 記憶體溢出與資料截斷限制**: 
     `db.historian` 原本採用每秒全體寫入 (全廠 320 個 Tags * 1次/秒)，為了保護瀏覽器記憶體，設有 `50,000` 筆的陣列長度限制。這導致歷史庫在短短 2.6 分鐘內即遭塞滿並開始覆蓋舊資料。但預測模型要求長達 70 分鐘的歷史數據才能啟動分析，這使得啟動條件在數學上永遠無法滿足。
  2. **React 無限迴圈渲染 (Infinite Re-render Loop)**: 
     在 `SubmainDetail.tsx` 中，錯誤地使用了 Zustand Store 的內聯過濾器：`useScadaStore(state => state.submains.filter(...))`。由於 `Array.prototype.filter()` 每次執行都會配置並回傳全新的記憶體位址 (Reference)，導致 Zustand 的嚴格相等檢查 (Strict Equality Check) 判定狀態發生了改變。這觸發了重新渲染，渲染後又重新呼叫 Selector，引發了死循環，最終導致 React 拋出 `Maximum update depth exceeded` 錯誤而崩潰白屏。
  3. **資料層 Hardcode 缺陷**: 
     在 `scadaStore.ts` 初始化時，呼叫了 `pcwDataService.getAllSubmains('PCW01')` 並寫死了參數，導致其餘 PCW02~PCW08 系統在全域狀態中形同隱形。

- **解決方案與優化成果 (Solution)**:
  1. **導入模擬器降頻採樣**: 將 Historian 的寫入與預測檢查降頻至「每 1 個模擬分鐘 (Simulated Minute)」執行一次。如此一來，相同的 5 萬筆記憶體上限，現在可完美容納長達 156 分鐘的長效歷史足跡，不但解決了預測不啟動的問題，更大幅節省了前端的記憶體開銷。
  2. **狀態選擇器安全化**: 將 `.filter()` 操作移出 Zustand 的 Selector 內部，改為從 Store 取得單純的 Reference (完整陣列) 後，再於 Local Component 內進行資料過濾，成功打破無限渲染迴圈。
  3. **解除資料存取限制**: 修改 API `getAllSubmains` 支援無參數呼叫，將所有系統資料一次載入前端緩存，恢復全廠房所有 Submain 管線的監控能力。
