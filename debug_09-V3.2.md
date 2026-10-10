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

## Issue 3: Modbus Simulator Injection Values Out of Sync
**Symptom**: The Modbus Simulator UI accepted new Injection Settings (e.g., Base Value 1.60), and the UI table correctly displayed the updated value. However, the Modbus Monitor Tab continued to show the old default value (1.453) generating from the Simulator Engine.
**Root Cause**: In Vite development environments, Hot Module Replacement (HMR) can cause modules to be evaluated multiple times. `MockDatabase.ts` was exporting `const db = new MockDatabase()`. Upon HMR reload, the React UI bound to a newly instantiated `db` object (which stored the 1.60 value), while the previously running `setInterval` background process for `SimulatorEngine` continued iterating over the old, detached `db` instance in memory (which still had the 1.45 value).
**Resolution**: Implemented a global singleton pattern attached to `globalThis` (`globalAny.__SCADA_DB`). This ensures that regardless of Vite HMR module re-evaluations, both the UI store and the Simulator Engine background process reference the exact same underlying in-memory database object.

## Issue 4: Y-Axis Scrollbar Rollback (Unmet Expectations)
**Symptom**: The user requested a Y-Axis scrollbar identical to the X-Axis scrollbar in the Trend charts.
**Root Cause**: Recharts natively supports horizontal zooming/panning via the `<Brush>` component, but it explicitly lacks a vertical brush counterpart. An attempt was made to simulate this using a custom HTML `<input type="range" orient="vertical">` slider and dynamic `domain` calculations on the `<YAxis>`. However, the user rejected this implementation because it did not visually match the X-axis `<Brush>`.
**Resolution (Rollback)**: Since native Recharts `<Brush>` cannot be rendered vertically, the code in `LiveTrend.tsx` and `HistorianTrend.tsx` pertaining to Y-axis scrolling (yScale, yOffsetPercent, wheel events, and the range input slider) was completely removed and rolled back to its previous state.

## Issue 5: Development Server Crash during Rollback
**Symptom**: During the rollback of the Y-axis scrollbar in `HistorianTrend.tsx`, the Vite server crashed with `[builtin:vite-transform] Adjacent JSX elements must be wrapped in an enclosing tag.`
**Root Cause**: The removal of the `<div style={{ display: 'flex'... }}>` wrapper around the chart left an orphaned `</div>` tag that inadvertently closed the parent ternary operator early, resulting in invalid JSX structure.
**Resolution**: Carefully audited the `<ResponsiveContainer>` block in `HistorianTrend.tsx`, removed the stray `</div>` tag, restored the `</ResponsiveContainer>` closing tag, and successfully verified compilation using `npm run build`.
