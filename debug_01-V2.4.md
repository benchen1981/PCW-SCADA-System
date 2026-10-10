# Web SCADA PCW POC V2.4 - Detailed Debugging Records (除錯紀錄)

## 1. Alarm Summary showing "Invalid Date"
**Issue**: The `SystemOverview.tsx` module displayed `Invalid Date` for the time column of recent alarms.
**Root Cause**: The component was trying to parse `a.timestamp`, but the actual data model uses `a.activatedAt` as the authoritative timestamp for alarms.
**Fix**: 
- Changed property access to `a.activatedAt`.
- Implemented a unified date formatting helper `formatTime(isoString)` to render reliable `YYYY/MM/DD HH:mm:ss` strings.

## 2. Live Trend Chart Not Rendering on Sensor Selection (P0)
**Issue**: When a user selects a sensor tag in `LiveTrend.tsx`, the chart remains completely blank.
**Root Cause**: Stale Closure in React `useEffect`. The effect responsible for pushing live points into the `dataRef` buffer only had `[sensors]` in its dependency array. As a result, the closure trapped `selectedTags` at its initial empty state `[]`, causing the function to silently return early on every update.
**Fix**: 
- Added `selectedTags` and `windowMin` to the `useEffect` dependency array.
- Now, when a tag is selected, the effect recalculates and begins capturing points for that specific tag.

## 3. System Overview Prediction Light Using Mock Logic
**Issue**: The status cards on `SystemOverview.tsx` evaluated prediction warnings using a mock `driftSlope > 0.05` rather than actual T-10/20/30 states.
**Root Cause**: Leftover mock code from earlier prototyping phases.
**Fix**:
- Wired `useScadaStore(state => state.predictions)` into `SystemOverview.tsx`.
- Evaluated system warning state purely based on `sysPredictions.some(p => p.state !== 'NORMAL')`.

## 4. Submains Spatial Layout Disconnected from Reality
**Issue**: `LiveSensors.tsx` grouped 20 submains into generic HTML boxes, ignoring the engineering reality of main headers and branches.
**Fix**:
- Discarded CSS flex grids for process mimic.
- Rendered a complete P&ID SVG with `x=200 + idx * 240` horizontal translation to establish spatial relationships mapped to `FAB L40 / F14` grids.
- Embedded SVG interactive elements directly mapping to `tagId`s for detail overlays.
