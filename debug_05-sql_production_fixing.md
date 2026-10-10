# Debug Log: V1 SQL Production Architecture Implementation (Phase 5)

## Issue 1: Visualizing Hysteresis (Anti-Chatter) in Real-Time
**Constraint:** The V1 plan introduces a hysteresis band (`N_ON`, `N_OFF`) to prevent alarm chatter near threshold boundaries. Visualizing this temporal accumulation process on a static web interface is challenging.

**Resolution:** 
1. Designed a simulated timeline tied to a `freshnessCounter` loop in JavaScript.
2. Created distinct mock tags representing different phases of the hysteresis lifecycle: 
   - A tag accumulating towards `N_ON` (`isChattering`)
   - A tag waiting to drop below `N_OFF` to recover (`isRecovering`)
   - A tag in a stable Warning state (`isWarning`)
   - A tag in a Hard Alarm state (`isAlarm`)
3. This frontend simulation effectively demonstrates the decoupling of the base model threshold crossing (`X_t`) from the final SCADA `Early Warning State`, providing a clear visual proof-of-concept for the SQL stored procedure logic.
