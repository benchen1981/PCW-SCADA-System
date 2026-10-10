# Phase 18 - V2.3 Optimization Debug Logs

## Issue 1: HMI Process Visual Shrinking and Readability
- **Symptom**: Previously, the 5x4 Grid containing all submains in `LiveSensors.tsx` used `width="100%" height="100%" preserveAspectRatio="xMidYMid meet"`, which caused the browser to scale the massive 1800px SVG view box down to fit the height of the user's viewport, rendering the text illegible.
- **Root Cause**: Reliance on SVG viewport scaling rather than setting explicit dimensions coupled with CSS overflow styling.
- **Resolution**: Changed the container to `style={{ overflow: 'auto' }}` and forced the SVG width to `1920` and height to `1800` explicitly.

## Issue 2: Submain Detail Routing and Static Render
- **Symptom**: `SubmainDetail.tsx` contained static P&ID rendering (`PT1S`, `TT1S`, `FT1`, etc.) which lacked dynamic capabilities to render all real sensors returned by the database. Moreover, navigation parameters were hardcoded.
- **Root Cause**: During V1 layout phase, a static mock SVG layout was created and never updated to accommodate the dynamic layout requirements introduced in later V2 phases.
- **Resolution**: Eliminated the static SVG. Implemented an `auto-fill` CSS grid layout dynamically mapping over `sensors.filter(s => s.submainId === activeSubmainId)`. Used React Router `useSearchParams` to retrieve `?submainId=` correctly for initializing state.

## Issue 3: Alarm State Synchronization
- **Symptom**: Alarm logic required that an alarm must stay active (but acknowledged) when the operator clicks `ACK` if the physical condition is still out-of-bounds.
- **Investigation**: Checked `SimulatorEngine.ts` `evaluateAlarms()` implementation.
- **Findings**: The `SimulatorEngine` already correctly checks for conditions, and if out of limits, ensures it stays active. `acknowledgeAlarm()` solely updates the state from `ACTIVE_UNACK` to `ACTIVE_ACK`, bypassing deletion. No additional corrections were necessary once `SystemOverview.tsx` properly hooked into `acknowledgeAlarm` correctly.

## Issue 4: Historian Trend Limits
- **Symptom**: While `<ReferenceLine>` components for limits were present, zooming/auto-ranging could inadvertently exclude limits from being visible if the sensor values hovered close to the nominal value without hitting limits.
- **Resolution**: Set Recharts `<YAxis />` domain properties conditionally via callback. Specifically: `domain={[(dataMin) => showAlarmLimits ? Math.min(dataMin, 1.15) : 'auto', (dataMax) => showAlarmLimits ? Math.max(dataMax, 1.85) : 'auto']}`.

## Verification
- Checked compiler logs `npm run build`: Success.
- Validated application layout updates visually in code.
