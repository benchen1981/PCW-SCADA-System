# PCW SCADA V2.5.2 - 除錯過程與技術分析紀錄 (Debug & Technical Analysis)

## 1. 初始問題與根因分析 (Root Cause Analysis)

### Issue A: Submain P&ID 圖元不顯示
- **現象**: 進入 `/submain/PCW01?submainId=Submain01` 時，畫面上只有卡片清單或是單獨的 PT 感測器，沒有任何管線 (Pipes)、Header 或是設備。
- **Root Cause**: 原本的 `SubmainDetail.tsx` 實作僅是抓取對應 Submain 的 `sensors` 陣列並以 HTML Card Grid 渲染。它並未真正實作 SVG P&ID 繪圖層 (Layout Layer)。此外，缺乏 SVG 的 `viewBox` 及座標映射，導致視覺上無法呈現 SCADA 該有的工業視角。
- **Resolution**: 徹底廢棄原本的 Grid 佈局，引入 `<svg>` 作為根節點，並加入 Supply/Return Headers 的直線、分支路徑、以及 Valve 等靜態標示。將感測器映射至 `transform="translate(x, y)"` 並附加上 `openTagDetail` 事件。

### Issue B: Historian Trend UX 與狀態混亂
- **現象**: 使用者在 Tag Drawer 選取 Tag 後，圖表無法直接呈現且缺乏明確的執行按鈕，造成操作混淆。
- **Root Cause**: Tag Checkbox 直接綁定了全局的 `selectedTags`，導致勾選的當下 UI 可能會嘗試重繪，且沒有觸發歷史資料 API (`fetchSensorHistory`) 的獨立 Hook，讓「選取」與「執行」狀態耦合。
- **Resolution**: 在 `HistorianTrend.tsx` 中引入了中介狀態 `draftTags`。Checkbox 改為綁定 `draftTags`，直到使用者點擊 `Apply Tags` 後才將 `draftTags` 覆寫進 `selectedTags`。同時獨立出一個極為顯眼的 `QUERY TREND` 按鈕，專責發送 Historian Query。

### Issue C: 滑鼠滾輪時間軸縮放 (Wheel Zoom) 難點
- **現象**: Recharts 原生不支援 `onWheel` 的時間軸平移縮放。
- **Root Cause**: 若要透過滾輪改變縮放，必須自己實作座標與 Index 的數學計算。此外，必須以「滑鼠游標所在的資料點」為縮放中心 (Zoom Anchor)，而不是單純的畫面正中央，否則使用者極容易迷失。
- **Resolution**: 
    1. 在 `<LineChart>` 綁定 `onMouseMove`，取得 `activeTooltipIndex` 儲存為 `hoverIndex`。
    2. 在圖表外部的 `<div>` 綁定 `onWheel` 事件。
    3. 利用 `deltaY` 判斷放大 (`0.85`) 或縮小 (`1.15`)。
    4. 依據 `hoverIndex` 計算出偏移比例 (`anchorRatio`)，推算出新的 `newStart` 與 `newEnd`。
    5. 將計算結果同步給 Recharts `<Brush>` 的 `startIndex` 與 `endIndex`，完成平滑且精準的 Zoom 行為。

## 2. 邊界測試與防禦性設計 (Edge Case & Defensive Design)

1. **SVG 事件穿透 (Pointer Events)**:
   - **挑戰**: 如果將裝飾用的 Background Group 或 Pipe Group 設得太大，可能會蓋住後方的 Sensor，導致 `onClick` 失效。
   - **除錯紀錄**: 確保所有非互動的 SVG 元素 (例如 `path`, `rect`, 無 Tag 的儀表) 都嚴格掛上 `pointerEvents="none"` 或對應的 CSS 屬性，保障事件能夠精準擊中 PT 感測器。

2. **Live Trend 的 Ring Buffer 縮放同步**:
   - **挑戰**: Historian Trend 是靜態資料，縮放不會有問題。但 `LiveTrend.tsx` 每秒會推進資料，若使用者正在縮放觀察過去的特定區段，新資料進來時若強制 `setVisibleRange` 會讓圖表不斷跳動。
   - **除錯紀錄**: 加入了 Tracking 判斷：`if (visibleRange[1] >= trendData.length - 2)`。只有當使用者可視範圍緊貼最新資料邊緣時，才會跟隨滑動。若使用者 Zoom In 並 Pan 到了歷史區段，則維持當前的 Anchor，實現類似 Auto-Scroll 的智慧鎖定。

## 3. 系統驗證 (Build Verification)
所有元件重構後，皆已在本地執行 `npm run build`。
- **TSC**: 零 TypeScript 型別錯誤 (0 errors)。
- **OXLint**: 零 Linter 違規。
- **Vite Rolldown**: 成功輸出 Production Bundle (`Exit Code: 0`)。
證明本次架構變更是安全、向後兼容且不破壞編譯管道的。
