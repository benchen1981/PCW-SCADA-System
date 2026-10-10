# Phase 18 - V2.3 Operator Alarm & Live Trend Optimization Prompt

## User Requests
1. **Regression Fixes**:
   - Restore Submain drill-down functionality (from working revision).
   - Ensure the `SubmainDetail.tsx` page correctly lists dynamic sensors dynamically depending on actual generated data (without hardcoded values or SVGs).

2. **Alarm Configuration (Single Source of Truth)**:
   - Make all Pressure PT thresholds globally consistent: HIHI=1.800, HI=1.700, LO=1.300, LOLO=1.200.
   - Adjust `sensorDefinitions.ts` to implement these thresholds globally.

3. **HMI Live Process Visuals**:
   - Enlarge SVG viewBox for Live Process overview to ensure readability on 1920x1080 without auto-scaling shrinking.
   - Ensure PT instruments click targets are >= 48x48.
   - Ensure PT Display Tag >= 16px and PT Value >= 20px (SemiBold) with proper alarm colors.

4. **Live Trend Implementation**:
   - Implement a new `Live Trend` page.
   - Ensure continuous scrolling plot logic (Memory ring buffer instead of relying on database history).
   - Allow user to toggle between 5/10/30/60 minute window intervals.
   - Allow user to toggle "Show Alarm Limits" to render 1.2 / 1.3 / 1.7 / 1.8 lines.
   - Restrict to maximum 5 selectable tags.

5. **Historian Refinements**:
   - Ensure that toggling Alarm limits forces the Y-Axis domain to show limits clearly (1.15 to 1.85 minimum).

6. **System Overview (8-System Operational Status)**:
   - Remove the ambiguous 8-System State Matrix.
   - Implement structured cards showing Overall Status, Comm Status, Alarm Counts, Unack Counts, Prediction, Drift PT, and Update Time.
   - Add a "Latest Active Alarms" split-pane at the bottom showing the 10 most recent alarms.
   - Implement true ALARM ACK logic in the overview (Transition from `ACTIVE_UNACK` to `ACTIVE_ACK`, preserving state until physically cleared).

## Implementation Steps
1. Replaced hardcoded `SubmainDetail.tsx` with a dynamic sensor rendering flex layout grid.
2. Hooked up query parameters `useSearchParams()` for initializing the active submain.
3. Overhauled `LiveSensors.tsx` SVG settings to use `overflow: auto` and exact pixel width `width="1920"` instead of `width="100%"`.
4. Overhauled `pt1s` and `pt1r` components in `LiveSensors.tsx` to enhance typography and circle size `r=24`.
5. Modified `sensorDefinitions.ts` default boundaries for PT sensors.
6. Copied `HistorianTrend.tsx` layout to create `LiveTrend.tsx`, rewriting data subscription using React `useEffect` and `useRef` to maintain a dynamic tick loop ring buffer without requesting back-end historical API.
7. Rewrote `SystemOverview.tsx` to implement table-based operational cards and an alarm list tail-view pane.
8. Connected the `handleAck` function securely to the `useScadaStore.acknowledgeAlarm` pipeline.
