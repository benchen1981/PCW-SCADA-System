# Phase 15: V2 Deep Optimization (Architecture & Data Consistency)

## Objective
To rapidly implement the strict backend architecture requirements defined in `PCW_SCADA_V2_AI_CODE_OPTIMIZATION_GUIDE.md`, shifting the focus from UI design to true system traceability and strict Single Source of Truth (SSOT).

## Architecture & Development Process

### 1. Topology & Assertion Enforcement (P0 - Section 1, 2, 3)
- **Requirement:** Ensure exactly 8 PCWs, 160 Submains, and exactly 320 PTs (1 Supply + 1 Return per Submain). No duplicate tags.
- **Implementation:**
  - Audited and updated `pcwSubmains.ts` to only generate `PT1S` and `PT1R` per submain loop.
  - Removed `PT2S` and `PT2R` to prevent topology ballooning.

### 2. Plant Overview Aggregation Fix (P0 - Section 6)
- **Requirement:** System overview must show aggregated statistics (`min/max/avg`) for Supply Pressure, Return Pressure, and DP. It cannot show single mock values.
- **Implementation:**
  - Refactored `PcwSystem` domain types in `pcwTypes.ts` to replace flat number fields with `{ min, max, avg }` objects.
  - Rewrote the Submain/System aggregation block in `SimulatorEngine.ts` to dynamically calculate real statistical values across all 40 sensors per PCW.
  - Updated `SystemOverview.tsx` to display these derived statistical objects.

### 3. Alarm Consistency (P0 - Section 5)
- **Requirement:** Live Sensor and Plant Overview must show exact state derived from the Alarm Engine. No page-local or detached state allowed.
- **Implementation:**
  - Modified `SimulatorEngine.evaluateAlarms()` to force-sync the active state from `db.alarms` directly back to `sensor.alarmState` and `sensor.status` on every tick.
  - Ensured UI elements natively reflect the `ACTIVE` vs `NORMAL` status reliably.

### 4. Modbus Float32 Decode UI (P0/P1 - Section 12)
- **Requirement:** Modbus Monitor must show true engineering decode, including Address Ranges, multiple Registers, and Raw Hex representation.
- **Implementation:**
  - Rewrote the Modbus Monitor table rendering in `ModbusMonitor.tsx`.
  - Injected an `ArrayBuffer` and `DataView` conversion block into the render cycle to physically convert the Float32 `rawValue` back into two 16-bit registers (Reg1, Reg2) and construct the `Raw Hex` representation (`0xXXXX 0xYYYY`).

### 5. True Historian-based Prediction (P1 - Section 14)
- **Requirement:** Remove hardcoded Math.random slopes. Prediction must calculate its N10/M10 and Slope strictly from historical data arrays.
- **Implementation:**
  - Rewrote the Prediction injection loop in `SimulatorEngine.ts`.
  - Implemented dynamic Linear Regression (`sumXY`, `sumX2`) over the trailing 60 samples in `db.historian` to extract real Slope (`bar/min`).
  - Added a strict guard: if historical data is less than 30 samples, return `INSUFFICIENT_DATA`.

### 6. Ramp Physical Accumulation (P1 - Section 13)
- **Requirement:** Ramp / Drift must use standard engineering units (`bar/min`), not `bar/tick`.
- **Implementation:**
  - Modified `SimulatorEngine.ts` to calculate `ticksPerMin` based on the configured `updateIntervalMs`.
  - Restructured the drift accumulator to properly add time-based fractional drift (`driftPerTick`) natively into `conf.baseValue`.
