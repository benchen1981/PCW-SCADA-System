# 除錯過程對話紀錄 (Debugging Prompts & Troubleshooting)

本文件詳細記錄了開發 Web SCADA PCW PoC 期間遭遇的核心 Bug 及其除錯思路與解決方案 (Prompts)。

## Debug 案例一：Modbus 模擬器與前端狀態同步失敗
**User Bug Report 紀錄:**
> 「Modbus Simulator設定sensor value 與Modbus monitor 看到的結果不一致」
> 「System Prediction的Current Value與Modbus Simulator 的Live Value不一致，立即核實除錯」

**Trace & Troubleshooting:**
1. 觀察 `SimulatorEngine.ts` 是否正確將參數寫入 `db.simulatorConfigs` 與 `db.sensors`，並確認底層確實有根據設定產生新數值。
2. 檢查前端狀態管理庫 Zustand 存取 `PcwDataService.ts` 的邏輯。
3. **Root Cause**: 
   - `PcwDataService` 在抓取資料時，直接回傳了 `db.modbusRegisters`、`db.simulatorConfigs` 甚至 `db.sensors` 的記憶體參考 (Memory Reference)。
   - Zustand 在更新狀態時採用的是淺層比較 (Shallow Compare: `old === new`)。因為物件/陣列參考沒變，Zustand 判定資料未更新，導致綁定該資料的 React 元件 (包含 Modbus Monitor 與 Prediction 畫面) 直接被跳過重新渲染，畫面永遠停頓在上一刻。
4. **Resolution**: 
   - 修改 `PcwDataService.ts`，在獲取資料的函式中使用展開運算子進行淺拷貝 (Shallow Clone)，例如 `return result.map(s => ({ ...s }));` 以及 `return { ...db.simulatorConfigs }`。
   - 這強制了 Zustand 在每次 Polling 時都能感知到記憶體位置的更動，進而通知所有相關的 React Component 每秒鐘重繪畫面，解決了跳動數值不一致的問題。

---

## Debug 案例二：System Prediction 引擎長時間掛網無結果 (Browser Throttling)
**User Bug Report 紀錄:**
> 「已經將網頁持續開啟超過6小時，但System Prediction沒有結果」

**Trace & Troubleshooting:**
1. 確認 `PredictionT30.tsx` 的顯示邏輯，若資料不足 70 筆 (70 分鐘)，會顯示 `[Hold] INSUFFICIENT_DATA` 並判定為 `NORMAL`，導致畫面看似「未發報」。
2. 分析 `SimulatorEngine.ts` 寫入 `db.historian` 的機制。機制為 `iteration % 60 === 0` (也就是每 60 次 Ticks，相當於 1 分鐘，寫入一筆)。
3. **Root Cause 1 (Browser Throttling)**: 當瀏覽器將分頁放入背景 (Background Tab) 時，為了省電，會將 JavaScript 的 `setInterval(..., 1000)` 大幅降速至一分鐘才跑一次。原本預期真實世界 1 分鐘應該跑 60 次 Ticks (寫入一筆)，在降速後，真實世界的 6 小時可能只跑了不到 360 次 Ticks，導致 Historian 永遠蒐集不滿啟動引擎所需要的 70 筆資料。
4. **Root Cause 2 (Refresh Empty State)**: 當使用者發現沒結果而重新整理網頁時，Prediction Array 被強制清空或塞入假資料，導致要重新等待 60 秒才會出現第一次預測。
5. **Resolution**: 
   - **Game Loop Catch-up 機制**：在 `SimulatorEngine.ts` 每次 Tick 時計算真實時間差 `elapsed`。如果發現時間過了很久 (被背景降速)，就利用 `for` 迴圈瞬間補足失去的 Ticks 運算量，最高容許一次追趕 10 分鐘，確保模擬時間與真實時間的絕對對齊。
   - **移除假資料與持久化**：刪除資料庫初始化時塞入的垃圾假資料，並將 `pcw_predictions` 透過 `localStorage` 持久化，確保重新整理後能瞬間還原最真實的上一分鐘預測快照。

---

## Debug 案例三：離開分頁後 UI 設定看似被重置
**User Bug Report 紀錄:**
> 「sensor Simulator設定完後需一直套用，而不是離開此頁就立即回到預設值，立即核實除錯」

**Trace & Troubleshooting:**
1. **Root Cause 1 (UI Reset)**: 當使用者離開 `ModbusMonitor.tsx` 頁面再切回來時，React Component 被銷毀並重新掛載，`useState(1.5)` 將輸入框重置為預設值。當使用者重新勾選 Tag 時，程式並未去 `db.simulatorConfigs` 把該 Tag 的真實數值拉回 UI 顯示，導致使用者產生「設定不見了」的錯覺。
2. **Root Cause 2 (Refresh Reset)**: `MockDatabase.ts` 在啟動時會將所有 Simulator Config 強制洗回預設值，且沒有撰寫從 `localStorage` 讀取 `pcw_sim_configs` 的還原代碼，導致按 F5 真的會讓設定遺失。
3. **Resolution**: 
   - 補上 `localStorage.getItem('pcw_sim_configs')` 在 `MockDatabase.ts` 的還原機制，解決 F5 重置問題。
   - 在 `ModbusMonitor.tsx` 加入 Auto-populate 機制。當使用者勾選或全選 Tag 時，程式會自動抓取陣列第一筆 Tag 的參數，瞬間賦值給 `setSimBaseValue`, `setSimNoise` 等 State，確保 UI 所見即所得。
