# PCW SCADA V2.5.2 - 開發過程對話紀錄與 Prompt (Development Process & Prompts)

## 1. 專案背景與 Prompt 來源 (Project Background & Prompts)
在 V2.5.1 Build Recovery 成功之後，我們進入了 V2.5.2 的優化階段。使用者提供了多份核心 Prompts，要求進行系統優化：
1. `PCW_SCADA_V2_5_2_SUBMAIN_HISTORIAN_MOUSE_ZOOM_PROMPT.md`
2. `PCW_SCADA_Submain_Render_Historian_Query_WheelZoom_Fix_Prompt.md`
3. `PCW_SCADA_FAB_Layout_PID_99pct_Reconstruction_Prompt.md`

### 核心目標 (Core Objectives)：
1. **Submain P&ID Reconstruction**: 將 `SubmainDetail.tsx` 的右側畫面從舊版的卡片清單 (Card List) 徹底改寫為原生的 SVG P&ID 流程圖 (Process Display)，並重現 Supply Header, Return Header, Valve, Flow Meter, 以及 FAB Load 等結構。
2. **Historian Trend UX Optimization**: 重新設計 `HistorianTrend.tsx` 的操作邏輯。移除佔用空間的區塊，改用緊湊型 Toolbar，並為 Tag Drawer 加入「Draft State」與「Apply Tags」的機制，使用者必須明確點擊 `QUERY TREND` 才會觸發 API 查詢，徹底解決 UX 盲點。
3. **Mouse-Wheel Time Zoom**: 針對 `HistorianTrend.tsx` 與 `LiveTrend.tsx` 加入滑鼠滾輪縮放 (Wheel Zoom) 功能。以使用者的滑鼠游標為中心 (Zoom Anchor)，向上滾動為 Zoom In (0.85)，向下為 Zoom Out (1.15)，並綁定 Recharts Brush 的 `startIndex` 與 `endIndex` 改變可視範圍 (Visible Range)，避免重複呼叫 API。

## 2. 開發架構輸出 (System Architecture Output)

### Frontend Architecture:
- **Framework**: React 19 + TypeScript + Vite 8
- **State Management**: Zustand (`scadaStore.ts`)
- **Charting**: Recharts (`LiveTrend.tsx`, `HistorianTrend.tsx`)
- **P&ID Engine**: 原生 SVG (`SubmainDetail.tsx`)

### 關鍵元件開發紀錄 (Component Implementation Details):
1. **`SubmainDetail.tsx`**:
   - 移除 `display: grid` 與 Card rendering。
   - 導入 `<svg viewBox="0 0 600 800">`。
   - 繪製 `#2F91D1` 的 Supply 管線與 `#D45A4A` 的 Return 管線。
   - 將 PT1S, PT1R, FT 等感測器動態 mapping 至畫面上。未包含 Tag 的靜態管線強制套用 `pointer-events: none;`，以避免干擾感測器的 `onClick={openTagDetail}`。

2. **`HistorianTrend.tsx`**:
   - 加入 `draftTags` 陣列。
   - 實作 `handleWheel`，攔截 `onWheel` 事件，根據 `hoverIndex` (由 `onMouseMove` 從 `activeTooltipIndex` 取得) 計算新的 `startIndex` 與 `endIndex`。
   - 將圖表的 `XAxis` 和 `Brush` 與 `visibleRange` 狀態同步。

3. **`LiveTrend.tsx`**:
   - 複用 HistorianTrend 的滾輪縮放邏輯。
   - 處理 Real-time Data 的 Edge case：當新的即時資料進入 Ring Buffer (`trendData`) 時，若目前處於「未縮放且追蹤最新資料」的狀態，則自動滑動 `visibleRange`；若使用者已鎖定觀察過去的區段，則保持當前的 `visibleRange` 錨點不變。

## 3. 開發過程總結 (Development Summary)
1. **讀取與分析**: 詳細閱讀了 `PCW_SCADA_V2_5_2` 的 Prompt，確保每一個 UX 需求都被記錄。
2. **逐步重構**: 採用增量式修改 (Incremental Edits)。先修改 `SubmainDetail.tsx` 的 SVG 佈局，確認正確後，再進行 `HistorianTrend.tsx` 的 Drawer 與 State 重構，最後實作最複雜的 Mouse Wheel Zoom 數學邏輯。
3. **Build 驗證**: 在所有修改完成後，執行 `npm run build` 確認 `tsc` 與 Vite 產出正常 (Exit code 0)，確保零 Syntax Error 或 Type Mismatch。
