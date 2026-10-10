# Web SCADA V3.2 Debug & Troubleshooting Record

## Issue 1: Trend Charts Not Displaying Lines for Certain Tags
**Symptom**: After selecting a tag in the Historian Trend or Live Trend, the chart occasionally appeared blank, even though the info bar showed data points were retrieved.
**Root Cause**: The SCADA historian writes data points using a dynamic ring buffer. If a tag's data is sparse or sampled out of sync with other tags, Recharts encounters `null` or `undefined` values for that tag at specific X-axis ticks, causing the SVG `<path>` to break and not render the line.
**Resolution**: Added the `connectNulls={true}` prop to the Recharts `<Line>` components in both `LiveTrend.tsx` and `HistorianTrend.tsx`. This instructs the charting library to interpolate across missing data points, successfully rendering continuous lines.

## Issue 2: Left Navigation Menu Alarm Inconsistency
**Symptom**: User reported: "Left menu alarm state is inconsistent with the actual tag reading / alarm setting." The P&ID mimic showed a normal tag value, but the left Submain menu still highlighted an 'ALARM' badge.
**Root Cause**: In `SubmainDetail.tsx`, the `hasAlarm` variable checked if ANY alarm for the submain existed in the global alarm store (including both `ACTIVE` and `CLEARED_UNACK` states). When a tag's value returned to normal, its alarm state transitioned to `CLEARED_UNACK`. However, the left menu still interpreted this as a full alarm and rendered the red `ALARM` badge, confusing operators who saw a normal live reading.
**Resolution**: Refactored the `hasAlarm` boolean into two distinct states:
1. `hasActiveAlarm` (Checks for `ACTIVE_UNACK` or `ACTIVE_ACK`) -> Displays a red `ALARM` badge.
2. `hasUnackAlarm` (Checks for `CLEARED_UNACK`) -> Displays an orange `UNACK` badge.
This accurately reflects the physical state of the equipment while still notifying the operator of pending acknowledgments.

## Issue 3: Y-Axis Scrollbar Missing
**Symptom**: User requested vertical scrollbars for the Y-axis to match the X-axis `Brush` behavior.
**Root Cause**: Recharts natively supports horizontal zooming/panning via the `<Brush>` component, but it explicitly lacks a vertical brush counterpart.
**Resolution**: 
1. Implemented a custom `yScale` state to handle zoom amplitude.
2. Embedded a native HTML `<input type="range" orient="vertical">` to the right of the `ResponsiveContainer`.
3. Mapped the slider's value (-100 to 100) to a `yOffsetPercent` state.
4. Dynamically calculated the Y-Axis `domain` by shifting the `center` point based on the `yOffsetPercent` multiplied by the `scaledSpan`. This successfully simulated a native vertical scrollbar.

## Issue 4: Modbus Simulator Injection Values Out of Sync
**Symptom**: The Modbus Simulator UI accepted new Injection Settings (e.g., Base Value 1.60), and the UI table correctly displayed the updated value. However, the Modbus Monitor Tab continued to show the old default value (1.453) generating from the Simulator Engine.
**Root Cause**: In Vite development environments, Hot Module Replacement (HMR) can cause modules to be evaluated multiple times. `MockDatabase.ts` was exporting `const db = new MockDatabase()`. Upon HMR reload, the React UI bound to a newly instantiated `db` object (which stored the 1.60 value), while the previously running `setInterval` background process for `SimulatorEngine` continued iterating over the old, detached `db` instance in memory (which still had the 1.45 value).
**Resolution**: Implemented a global singleton pattern attached to `globalThis` (`globalAny.__SCADA_DB`). This ensures that regardless of Vite HMR module re-evaluations, both the UI store and the Simulator Engine background process reference the exact same underlying in-memory database object.

## Issue 5: Development Server Crash (http://localhost:5173/ unable to open)
**Symptom**: The user reported that the website could not be opened and needed to be restarted and debugged.
**Root Cause**: During the implementation of the Y-Axis scrollbar in `LiveTrend.tsx`, a duplicate state declaration (`const [yOffsetPercent, setYOffsetPercent] = useState<number>(0);`) was accidentally introduced. This caused a strict parsing error in Vite's compiler (`[PARSE_ERROR] Identifier 'yOffsetPercent' has already been declared`), resulting in the crash of the development server.
**Resolution**: Accessed `LiveTrend.tsx`, removed the duplicated variable declaration on line 27, verified successful compilation via `npm run build`, and safely restarted the Vite server via `npm run dev`.
