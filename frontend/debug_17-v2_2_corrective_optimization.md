# Phase 17 - V2.2 Corrective Optimization (Debug Log)

## 1. Issue: Plant System Overview Navigates to Blank Page
**Symptom**: Clicking on a PCW01 card in the Plant System Overview (`SystemOverview.tsx`) results in an empty page.
**Investigation**: 
- Examined `SystemOverview.tsx` and found it navigating to `/submain/:systemId`.
- The `/submain` route was deprecated in Phase 16 due to the 20 Submain flat structure.
**Fix**: 
- Replaced `navigate(\`/submain/\${id}\`)` with `navigate(\`/sensors?systemId=\${id}\`)`.
- Updated `LiveSensors.tsx` to read `useSearchParams` and extract `systemId` to set the `selectedPcw` initial state.

## 2. Issue: Sensor Simulator Crashes/Shows Blank Page
**Symptom**: Switching to the Sensor Simulator tab in `ModbusMonitor.tsx` causes a blank screen (React crash).
**Investigation**:
- Inspected `ModbusMonitor.tsx` and searched for variables used in rendering.
- Found that `filteredSimSensors` was used in `filteredSimSensors.map(...)` but was never declared in the file (likely lost during a previous AI replacement error).
**Fix**:
- Re-declared `const filteredSimSensors = sensors.filter(...)`.
- Expanded the logic to correctly support `System`, `Submain`, `Position`, `Quality`, and `Search` filters simultaneously.

## 3. Issue: Historian Trend Lacks Contextual Limits
**Symptom**: The chart simply plots values but doesn't convey if a value is safe or approaching a failure point.
**Investigation**:
- Engineering limits exist in `sensor.engineeringLimits` (HighHigh, High, Low, LowLow).
- Need to render them via Recharts `<ReferenceLine>`.
**Fix**:
- In `HistorianTrend.tsx`, mapped `sensor.engineeringLimits` to 4 different `<ReferenceLine>` objects colored distinctively. 
- Wrapped this block in a `showAlarmLimits` condition and limited it to single-tag or dual-tag queries to prevent overlapping lines.

## 4. Issue: Live Sensor Data P&ID SVG Too Small for 20 Submains
**Symptom**: Only the first 5 Submains were shown, and no tag IDs were present.
**Fix**:
- Enlarged SVG canvas (`1400x1800`) and mapped `sensors` into a 5x4 grid matrix (`row = Math.floor(idx / 5)`, `col = idx % 5`).
- Inserted `<text>` elements below the PT graphic explicitly bound to `pt.tagId`.
