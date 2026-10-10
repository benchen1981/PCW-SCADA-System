# Phase 17 - V2.2 Corrective Optimization (Prompt & Development Log)

## 1. User Prompt (Requirements)

**User Provided Prompt:**
`PCW_SCADA_V2_2_CORRECTIVE_OPTIMIZATION_PROMPT.md` and `PCW_SCADA_Immediate_Fix_and_Optimization_Prompt.md`

**Core Objectives (P0/P1):**
1. **Plant System Overview**: Fix blank page/data loss on click. Must correctly route to the Live Sensor Process HMI for the corresponding system.
2. **Sensor Simulator**: Fix the blank page (React render crash) caused by undefined variables. Roll back to the working UI layout (Engine Control, Tag List, Injection Controls) and add fine-grained filters: System, Submain, Measurement, Quality, and Tag Search.
3. **Live Process HMI (Live Sensor Data)**: Expand the P&ID SVG to display the full 20 Submains (4x5 or 5x4 matrix). Ensure every PT bubble displays the full canonical tag underneath it (e.g., `PCW01.Submain01.PT1S`).
4. **Historian Trend**: Add Alarm Limits (`LL`, `L`, `H`, `HH`) into the Recharts trend lines. Include a toggle to show/hide limits, and only display limits for hovered/selected tags when multiple tags are selected.
5. **System Prediction**: Ensure the system filter includes `All Systems` and `PCW01` through `PCW08`, rather than just the first two.

## 2. Development Process & Implementation Details

### Step 1: Fix Plant System Overview Navigation
*   **Action**: Updated `SystemOverview.tsx`
*   **Details**: The `onClick` event on the system cards previously attempted to navigate to `/submain/:systemId` which was incompatible with the new 20 Submain flat structure. Changed navigation to `navigate(\`/sensors?systemId=\${id}\`)`.

### Step 2: Live Process HMI Topology & Tag Display
*   **Action**: Refactored SVG in `LiveSensors.tsx`
*   **Details**: 
    *   Increased SVG `viewBox` dimensions to `1400 1800`.
    *   Implemented a Grid math calculation (`row = Math.floor(idx / 5)`, `col = idx % 5`) to lay out all 20 Submains in a 5x4 format.
    *   Added `<text>` elements below each SVG circle to render `pt.tagId` (the canonical tag).

### Step 3: Historian Trend Limits
*   **Action**: Modified `HistorianTrend.tsx`
*   **Details**: 
    *   Added state `showAlarmLimits`.
    *   Added a UI checkbox for toggling limits.
    *   Added 4 `<ReferenceLine>` components for `lowLow`, `low`, `high`, and `highHigh` using `var(--info)`, `#3b82f6`, `var(--warning)`, and `var(--danger)`.

### Step 4: System Prediction Filters
*   **Action**: Updated `PredictionT30.tsx`
*   **Details**: Expanded the hardcoded HTML `<select>` options to map over an array of `['PCW01', ..., 'PCW08']`.

### Step 5: Simulator Crash Fix & Filters
*   **Action**: Fixed and enhanced `ModbusMonitor.tsx`
*   **Details**: 
    *   Defined the missing `filteredSimSensors` variable that caused a `ReferenceError`.
    *   Added states for `simSubFilter`, `simMeasFilter`, `simQualityFilter`, and `simSearchFilter`.
    *   Added corresponding `<select>` and `<input>` UI elements above the Simulator tag table.
    *   Wrote the filter logic inside `filteredSimSensors` to apply these filters dynamically.

## 3. Project Architecture Update

*   **UI Components**: `LiveSensors.tsx` now handles query parameter parsing via `react-router-dom` `useSearchParams` to act as the landing page for `SystemOverview`.
*   **State Management**: `scadaStore` remains untouched, strictly adhering to the single-source-of-truth requirement.
*   **Data Pipeline**: Unchanged. `MockDatabase` -> `PcwDataService` -> `Zustand` -> `UI Pages`.
