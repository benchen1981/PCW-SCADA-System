# Debug Log - Phase 15: V2 Deep Optimization (Architecture & Data Consistency)

## 1. Modbus Table Header Alignment
**Issue:** When extending `ModbusMonitor.tsx` to include `UnitId`, `Address Range`, `Reg 1`, `Reg 2`, and `Raw Hex`, the table headers desynchronized with the row bodies, causing layout breaking and type errors when mapping standard arrays.
**Resolution:** Explicitly matched `<th>` definitions to `<td>` outputs. Utilized native JavaScript `ArrayBuffer` and `DataView` interfaces to inject floating point to 16-bit word decomposition directly in the frontend render loop, avoiding heavy re-architecture of the `db.modbusMap` storage.

## 2. Simulator Ramp Rate (bar/min) Accumulation
**Issue:** The `SimulatorEngine.ts` calculated drift via `driftSlope * db.simulatorStatus.iteration`. When the user activated a ramp, the value would immediately jump to an abnormally high value if the engine had been running for thousands of iterations.
**Resolution:** Refactored the calculation to use incremental accumulation: `conf.baseValue += driftPerTick`. Calculated `driftPerTick` cleanly by dividing the engineering `bar/min` by the real `updateIntervalMs`.

## 3. Simulator Prediction Math.random Issue
**Issue:** Section 14 demanded that T10/T20/T30 inference models must use past-only historian data and NOT `Math.random()`.
**Resolution:** Extracted the last 60 objects from `db.historian`. Used linear regression (`sumXY / sumX2`) to mathematically calculate the historical slope, and evaluated `M60` / `M10` deviation ratios against an aggregated 30-sample historical baseline. 
