# Web SCADA PCW POC V2.5 - Detailed Debugging Records (除錯紀錄)

## 1. Missing Equipment on P&ID Process View (P0)
**Issue**: Only PT1S (PT) sensors were clickable and rendering. Submains lacked pumps, filters, heat exchangers, valves, and advanced instrumentation (PDT, FT, TT).
**Root Cause**: The original V2.4 SVG mock mapping only iterated through tags filtering for `position === 'SUPPLY'` and returning generic elements, missing strict parsing for specific instrument prefixes.
**Fix**:
- Replaced the simple filter with precise parsing for `PT1S`, `PT2S`, `PT1R`, `PT2R`, `PDT`, `FT`.
- Hardcoded Supply/Return Main Header equipment (Pump P-1, FLT, HX-1) to match the provided SCADA blueprint.
- Handled empty sensor bounds gracefully by rendering dashed-line placeholders with `NO DATA` instead of collapsing the entire component layout.

## 2. LiveTrend State Desync (Blank Chart on Startup)
**Issue**: When opening Live Trend, users had to wait for new points to arrive before the line started drawing.
**Root Cause**: Live Trend was strictly a forward-looking subscription buffer (`dataRef.current.push(newPoint)`), it had no lookback window.
**Fix**:
- Implemented `isPreloading` state.
- Upon tag selection, explicitly queried `pcwDataService.getSensorHistory` for `(Date.now() - 30 mins)`.
- Reconstructed the `dataRef.current` array using a pivot structure to map historical rows to the line chart format.

## 3. Historian Tag Selector Overcrowding
**Issue**: The fixed left sidebar for Tag Selection compressed the main Chart width significantly on smaller resolutions.
**Root Cause**: Fixed flex-basis width (`300px`) in the `HistorianTrend.tsx` panel structure.
**Fix**:
- Transformed the Tag Selector into a `position: absolute` sliding Drawer.
- Created a compact toolbar showing the summary (e.g. `Selected: 3`) above the chart, allowing the chart `ResponsiveContainer` to occupy 100% of the screen width.
