# Prompt Development Record: Historian Trend & Alarm Center (Phase 9)

## Conversation Log

**User Prompt 1:**
> http://127.0.0.1:8000/ 無法開啟並完整重建 Historian Trend 功能。
> 提供 tag selector，支援單一 tag、多個 tag、搜尋 canonical tag、最近使用 tag、全選 / 清除。
> 支援時間區間：Last 5 minutes, 15m, 1h, 6h, 24h, Custom start datetime, Custom end datetime。
> 圖表顯示 cursor tooltip、顯示 alarm limit lines、無資料時顯示真正的查詢條件與原因、支援匯出 CSV。
> Historian Trend 必須使用 HistorianService.getSensorHistory，不得在 Component 中自行產生隨機資料。

**Agent Action:**
1. Installed `recharts` for the frontend to handle advanced, high-performance charting.
2. Created `HistorianTrend.tsx` with a multi-tag selector, multi-line interactive charting, dynamic alarm limit reference lines (HI, HIHI) for single tags, and query metadata summaries.
3. Implemented frontend CSV export functionality that pivots the queried data into a spreadsheet format.
4. Updated `App.tsx` router and rebuilt the frontend, deploying it to the FastAPI static folder.

**User Prompt 2:**
> http://127.0.0.1:8000/  即時與歷史警報除錯
> 請建立完整的 Alarm Center，不可只在頁面頂端顯示一個紅色文字。
> Alarm 必須分成 Active Alarm、Unacknowledged Alarm、Acknowledged Alarm、Cleared Alarm、Historical Alarm。
> 每筆 alarm 必須包含：alarmId, tagId, systemId, submainId, alarmType, priority, state, message, value, limit, unit, activatedAt, acknowledgedAt, clearedAt...
> 功能：Active / Historical tab、多重篩選器、Acknowledge button、Shelve button、Alarm detail、匯出 CSV。
> Active alarm 必須與 System Overview、PCW P&ID、Live Sensor 同步。Alarm banner 顯示最高優先級未確認警報。

**Agent Action:**
1. Rewrote the `AlarmEvent` canonical type in `alarmTypes.ts` to fully support the requested industrial SCADA alarm schema (`ACTIVE_UNACK`, `ACTIVE_ACK`, `CLEARED_UNACK`, `CLEARED_ACK`, `SHELVED`).
2. Updated `PcwDataService.ts` and `scadaStore.ts` with `acknowledgeAlarm` and `shelveAlarm` actions.
3. Completely rebuilt `ActiveAlarms.tsx` into a robust Alarm Center with Data Grid, Drill-down Detail Panel, CSV Export, and action buttons that instantly mutate the global state.
4. Enhanced `App.tsx` with a global Alarm Banner that persists across all pages, extracting the highest priority unacknowledged alarm.

**User Prompt 3:**
> http://127.0.0.1:8000/ 無法開啟，立即重新啟動專案程式及網頁

**Agent Action:**
1. Ran `stop_all.sh` to kill any orphaned background workers and zombie Python processes holding ports 8000/5020.
2. Ran `start_all.sh` to fully restart the backend system.
3. After the user reported a black screen (React crash), investigated the issue and found a build failure caused by a previous script. Rebuilt and redeployed.
