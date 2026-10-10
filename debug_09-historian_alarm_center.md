# Debug Log: Historian Trend & Alarm Center (Phase 9)

## Issue 1: React Crash (Black Screen) on Localhost
**Error Description:** After successfully deploying the new frontend assets into the FastAPI static directory and restarting the Python server, the browser rendered a completely black screen. The SCADA dark-theme CSS loaded (`body { background-color: #121212; }`), but the React DOM tree failed to render entirely.
**Diagnostic Process:** 
1. Verified that FastAPI was correctly returning `index.html` and serving `/assets/*.js` with a 200 OK status.
2. Attempted to run the `browser_subagent` to capture the client-side JavaScript error log, but it failed due to server capacity limits.
3. Created a quick Headless Puppeteer script to capture the browser's console logs in the background. The log revealed: `PAGE ERROR: initialPcwSubmains is not defined`.
4. Investigated `PcwDataService.ts` and discovered that a Python regex script from Phase 8 (intended to fix TypeScript verbatim imports) had aggressively replaced the import for the mock database constant `import { initialPcwSubmains }` with `import type { initialPcwSubmains }` because the string contained `PcwSubmain`.
5. Since it was marked as `type`, Vite stripped the import during the build process, resulting in `initialPcwSubmains` being undefined at runtime and crashing the app during the initial `fetchAllData` load.
**Resolution:** Reverted the faulty imports in `PcwDataService.ts` and `sensorDefinitions.ts` back to standard value imports. Re-ran `vite build` and copied the new payload to the static directory. The black screen was instantly resolved.

## Issue 2: Recharts Layout Collapse
**Error Description:** When embedding `recharts` `<ResponsiveContainer>` within Flexbox layouts, the chart can sometimes collapse to 0 height if the parent container doesn't have an explicitly defined flex allocation or absolute height.
**Resolution:** Applied `flex: 1` and `height: '100%'` to the enclosing `.card` container in `HistorianTrend.tsx` to force the grid to allocate available viewport space, allowing the chart to expand properly.

## Issue 3: Alarm State Machine Complexity
**Error Description:** The mock backend needed to differentiate between `ACTIVE_UNACK`, `ACTIVE_ACK`, `CLEARED_UNACK`, and `CLEARED_ACK`, while `getActiveAlarms` needed to correctly filter out fully cleared and acknowledged alarms.
**Resolution:** Updated `getActiveAlarms` to only return alarms where `state.startsWith('ACTIVE')` or `state.startsWith('CLEARED_UNACK')`, ensuring that only actionable or currently active alarms show up in the live queues, while `getAlarmHistory` tracks the complete lifecycle.
