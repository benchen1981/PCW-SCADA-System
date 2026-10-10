# PCW-POC 整合測試與頁面驗收清單

為了確保單向資料流架構（Simulator → Repository → Zustand Store → UI Pages）的正確性與各模組間的一致性，請依序執行以下五項情境測試。所有的驗收項目都必須 100% 通過，不可出現資料延遲或數值不一致的情況。

## 測試 1：單一來源數值一致性 (Single Source of Truth)
**測試步驟：**
1. 前往 `Modbus & Simulator Center`。
2. 選擇 `PCW01.Submain01.PT1S`。
3. 將其 Simulator 的 `Base Value` 從目前值 (例如 1.45) 更改為 `1.80`，並點擊 `Apply to Selected Tags`。
4. 啟動 Simulator 引擎。

**驗收條件：**
- [ ] **Process HMI (P&ID)**: `PCW01` -> `Submain01` 畫面中的 `PT1S` 數值必須立刻跳轉為 1.80 (加上微小雜訊)。
- [ ] **System Overview**: `PCW01` 的相關統計或儀表若有顯示最高壓力，應反映此數值。
- [ ] **Live Sensor Data**: 該 Tag 的列表數值應為 1.80 左右，且右側一小時內 Sparkline 趨勢瞬間飆高。
- [ ] **Historian Trend**: 當下時間點的最新一筆資料必須準確對應 1.80。
- [ ] **Alarm Center**: 該 Tag 的警報狀態中的 `value` 欄位必須顯示為 1.80。
- [ ] **Modbus Monitor**: 該 Tag 對應的 Address (例如 `40001`) 其 `Current (Eng)` 欄位顯示 1.80，且 `Raw Value` 正確反應 Scale 後的數值。

---

## 測試 2：警報引擎連動性 (Alarm Engine Synchronization)
**測試步驟：**
1. 承接測試 1，由於 1.80 已經超過了 `HIGH` (1.50) 與 `HIGH_HIGH` (1.70) 的 Alarm Limit。
2. 讓引擎運轉數秒。

**驗收條件：**
- [ ] **P&ID 儀表變色**: `Submain01` 的 `PT1S` 數值字體變為紅色 (CRITICAL) 警告，且左側 Submain 列表的 `Submain01` 亮起紅色 ALARM 標籤。
- [ ] **Active Alarm 出現**: 在 `Alarm Center` 的 `Active Alarms` 頁籤中，必須出現該 Tag 的 `HIGH_HIGH` 事件，狀態為 `ACTIVE_UNACK`。
- [ ] **System Overview 狀態**: 首頁的 `PCW01` 卡片狀態從 `HEALTHY` 變為 `ALARM` 或 `WARNING`，且 Active Alarm Count 必須 +1。
- [ ] **Live Sensor 狀態**: `PCW01.Submain01.PT1S` 的 Status 與 Alarm 欄位應顯示警告標章。
- [ ] **Alarm Banner 顯示**: 整個系統畫面最上方的全局 Alarm Banner 必須跑馬燈顯示該筆警報，並且發出紅光。
- [ ] **Alarm History 寫入**: 當該警報被 Acknowledge 或降回正常後，`Alarm History` 頁籤中必須完整紀錄這一筆事件的發生時間與解除時間。

---

## 測試 3：歷史趨勢繪圖正確性 (Historian Trend Validation)
**測試步驟：**
1. 導航至 `Historian Trend` 頁面。
2. 左側 Tag Selector 勾選：
   - `PCW01.Submain01.PT1S`
   - `PCW01.Submain01.PT1R`
3. 將 Time Range 設定為 `Last 1 hour`，並點擊 `Execute Query`。

**驗收條件：**
- [ ] 圖表成功繪製兩條曲線。
- [ ] 圖表的 X 軸時間範圍起訖點，必須嚴格符合查詢時間 (Now - 1 hour) 到 (Now)。
- [ ] `PT1S` 的曲線上應能明顯看見剛才測試 1 造成的數值爬升至 1.80 的軌跡。
- [ ] 圖表中應出現 `PT1S` 的 1.50 (HI) 與 1.70 (HIHI) 警報參考線 (Reference Line)。

---

## 測試 4：異常品質與通訊中斷 (Quality & Comm Loss)
**測試步驟：**
1. 前往 `Modbus & Simulator Center` 的 `Sensor Simulator` 頁籤。
2. 選擇 `PCW01.Submain01.PT1S`。
3. 點擊 `Sim Comm Loss` (通訊中斷) 按鈕。

**驗收條件：**
- [ ] **Live Sensor Data**: 該 Tag 的 Quality 欄位變為紅色的 `BAD`，且數值停止跳動。
- [ ] **Process HMI (P&ID)**: 該 Tag 的位置不再顯示數值，而是直接顯示紅色的 `BAD QUALITY`，並附帶最後一筆正常資料的時間戳記。不可顯示隨機亂數或預設的假數值。
- [ ] **Modbus Monitor**: 該 Register 的 Quality 欄位顯示 `BAD`。
- [ ] 歷史紀錄與預警中心不得將中斷時的數值視為正常營運的即時值進行斜率預測。

---

## 測試 5：系統隔離性 (System Multi-Tenant Validation)
**測試步驟：**
1. 前往 `Process HMI` (SubmainDetail)。
2. 從頂部的下拉選單將系統從 `PCW01` 切換至 `PCW02` (甚至切換至 PCW08)。

**驗收條件：**
- [ ] 左側的 Submain 清單必須刷新為該 System 的 Submain 列表。
- [ ] P&ID 上所有儀表的資料讀取都必須映射到對應的 System，例如 `PCW02.Submain01.PT1S`。
- [ ] **絕對不可混用**：在 `PCW02` 的畫面上，絕對不能出現 `PCW01` 的 Sensor 數值，也不能出現 `PCW01` 的警報狀態。
- [ ] `System Overview` 與 `Live Sensor` 中進行系統過濾時，資料集必須完全吻合，沒有跨區串聯。
