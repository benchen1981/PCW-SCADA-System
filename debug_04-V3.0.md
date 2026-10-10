# Debugging Logs (V3.0)

This document tracks the primary bugs encountered during the V3.0 refactor, their root causes, and the applied solutions.

## Issue 1: Event Bubbling on SVG Tag Details
**Symptom:**
> User: "live sensor 每個submain的元件圖示，點擊後完全無畫面http://localhost:5173/submain/PCW01?submainId=Submain01"

**Root Cause:**
In `SubmainDetail.tsx` and `LiveSensors.tsx`, the SVG `<g>` groups wrapping the sensor tags (like PT, FT) had an `onClick={() => openTagDetail(...) }` handler. However, because elements like `<text>` inside the group were the actual target of the click, browsers often initiated text-selection behavior or bubbled the click up to parent wrappers that lacked interactive contexts, dropping the React click intent entirely.

**Resolution:**
Injected `e.preventDefault()` and `e.stopPropagation()` deeply into every SVG interaction handler to strictly enforce the Drawer API call.
```tsx
onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pt1s.tagId); }}
```

---

## Issue 2: Broken Recharts Wheel Zoom on Historian Trend
**Symptom:**
> User: "Historian trend和Live Trend一樣無法以滑鼠滾輪進行時間zoom in/out"

**Root Cause:**
In Recharts, using a `<Brush>` automatically synchronizes the active X-Axis domain. When passing the absolute `historyData` array directly into the `LineChart`, the hover tooltip indices (`activeTooltipIndex`) inherently map back to the *absolute* position in the full array.
Our custom wheel event logic in `HistorianTrend` was mistakenly adding the current visible window start index (`currentStart`) to the tooltip index, expecting the tooltip to only be relative to the sliced view (like it was in Live Trend). This caused exponential calculation drift upon scrolling.

**Resolution:**
Removed the offset addition logic inside the `handleWheel` function:
```tsx
// Before (Bugged):
const anchorIndex = hoverIndex !== null ? currentStart + hoverIndex : Math.floor((currentStart + currentEnd) / 2);

// After (Fixed):
const anchorIndex = hoverIndex !== null ? hoverIndex : Math.floor((currentStart + currentEnd) / 2);
```

---

## Issue 3: Historian Chart Blank Output & Disappearance 
**Symptom:**
> User: "選擇tag再按apply tags後沒區線產生，再按query trend後也無畫面"

**Root Cause:**
The issue was entirely unrelated to the data query logic. The React UI fragment `return (<> ... </>)` for `HistorianTrend.tsx` rendered the top control bar (dashboard-section) and the chart wrapper as siblings. However, the top bar was hardcoded to `height: '100%'`. Because the router's container view enforces overflow constraints, the 100% height pushed the sibling chart component entirely off-screen, rendering it invisible to the operator.

**Resolution:**
Refactored the sibling `<>` fragment into a unified flex column `<div>` container. This allowed the top bar to take its natural `auto` height, letting the chart expand into the remaining `flex: 1` space.

---

## Issue 4: Truncated SVG Mimic Headers
**Symptom:**
> User: "live sensor 的SUPPLY MAIN HEADER和RETURN MAIN HEADER被元件阻擋無法完整顯示"

**Root Cause:**
The `<svg>` container utilized `preserveAspectRatio="xMidYMid meet"`, which forces the browser to shrink the 4200px wide SVG to perfectly fit the user's viewport width. This visual down-scaling made it appear as if the background elements were overlapping or cut off.

**Resolution:**
Removed the `preserveAspectRatio` property and strictly applied inline constraints: `style={{ minWidth: '2700px' }}`. This successfully invoked native horizontal scrollbars via the parent container's `overflow: auto`, ensuring a 1:1 crisp display of the P&ID.

## Issue 5: Historian Trend Wheel Query Refetching
**Symptom:**
> User: "Historian trend和Live Trend以滑鼠滾輪進行時間zoom in/out，也就是query時間放大或縮小，即時進行query後立即顯示"

**Root Cause:**
Initially, zooming with the mouse wheel only filtered the data array locally on the client using Recharts `visibleRange`. It did not trigger a new API call to the backend. If the user zoomed out beyond the time frame they originally queried, the zoom would simply stop, forcing them to manually change the dropdown and click "Query Trend" again.

**Resolution:**
Rewrote the `handleWheel` logic in `HistorianTrend.tsx` to automatically calculate the new boundary timestamps based on the zoom ratio. Applied these timestamps directly to the custom input forms and initiated a `debounced` (600ms) automatic API `executeQuery()` call to fetch older data seamlessly.

## Issue 6: P&ID Component Clutter
**Symptom:**
> User: "將所有submain的SUPPLY和RETURN pt sensor改為一個. Process Overview刪除小圖後左移"

**Root Cause:**
The canvas was overly dense with redundant redundant sensors (`PT1S`, `PT2S`, `PT1R`, `PT2R`), shared headers, and static `FAB TOOL` names, making the HMI visually overwhelming.

**Resolution:**
Purged the extra `<g>` tags and simplified the backend state definitions in `pcwSubmains.ts` to only track `PTS` and `PTR`. Translated all submain X-coordinates (`xBase`) leftwards by 150px and dynamically mapped equipment text using the index (e.g. `TOOL01`, `TOOL02`).

### System Prediction 架構除錯與記憶體問題 (Phase 7)
- **問題描述 (Issue)**: 系統持續掛機長達 6 小時，但 `System Prediction` 演算法始終未產生結果，頁面中所有推論皆顯示 `NORMAL` 與 `INSUFFICIENT_DATA`。同時，使用者點擊 Submain P&ID (Live Sensors) 中的元件（如 Valve 或 Tool）時，跳轉至 `/submain/:systemId` 頁面會引發白畫面（完全無渲染）。另外，Submain Detail 視圖僅能顯示 `PCW01` 的內容。
- **根本原因 (Root Cause)**: 
  1. **Historian 記憶體溢出上限限制**: `db.historian` 原本採用每秒全體寫入 (320 個 tags * 1次/秒)，且受到 50,000 筆陣列長度保護限制，導致資料在 2.6 分鐘內即遭覆蓋。但預測模型要求長達 70 分鐘的歷史分析，這使得條件永遠無法滿足。
  2. **React 無限迴圈渲染 (Infinite Re-render)**: 在 `SubmainDetail.tsx` 中，從 Zustand Store 中使用內聯過濾器 `useScadaStore(state => state.submains.filter(...))`。Zustand 因 `.filter()` 每次回傳全新陣列參考，誤判狀態更新而陷入無限重新渲染迴圈 (Maximum update depth exceeded)，導致 React 崩潰。
  3. **資料層 Hardcode**: `scadaStore.ts` 呼叫 `pcwDataService.getAllSubmains('PCW01')` 寫死參數，導致其餘 PCW02~PCW08 無法加載。
- **解決方案 (Solution)**:
  1. 將 Historian 寫入與預測檢查降頻至「每 1 個模擬分鐘 (Simulated Minute)」執行一次，使得 5 萬筆上限可容納長達 156 分鐘的歷史足跡，滿足 70 分鐘預測需求。
  2. 將 `.filter()` 操作移出 Zustand 的 Selector 內部，從 Store 取得完整陣列後再進行 Local filtering。
  3. 修改 `getAllSubmains` 支援無參數呼叫，將所有系統資料一次載入前端。
