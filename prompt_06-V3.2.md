# Web SCADA V3.2 Development Process & Prompts

## 1. Requirement Gathering & Scope
User requested several fine-tuning adjustments, bug fixes, and feature enhancements for the Web SCADA V3.1 system:
- **Performance Optimization**: Reduce the number of simulated submains per PCW system from 20 to 10.
- **Trend Visualization (Historian & Live)**: 
  - Fix issue where certain tags with sparse data points did not render trend lines.
  - Implement Y-axis zoom-in/out functionality.
  - Implement Y-axis vertical scrollbars (pan) to mirror X-axis brush behavior.
- **System Prediction (T30)**:
  - Add feature toggles (Engine ON/OFF).
  - Add filtering capability by single System or Submain.
  - Add a Help/Info button in the main header to explain the feature engineering and prediction pipeline.
- **Alarm Center & UI Inconsistency**:
  - Resolve the mismatch where the left-menu alarm badge in the Submain P&ID view showed an active 'ALARM' even when the actual tag reading had returned to normal (due to unacknowledged CLEARED_UNACK states).
- **Modbus Monitor**:
  - Add category filtering (PT, FT, DP) for easier sensor management.

## 2. Prompts & Execution Steps

### Prompt 1: Performance & Filter Enhancements
- **Goal**: Reduce submains, add Modbus filters, and prediction filters.
- **Action**: 
  - Modified `pcwSubmains.ts` to generate 10 submains instead of 20.
  - Updated `ModbusMonitor.tsx` to include a tag-type dropdown filter.
  - Updated `PredictionT30.tsx` to include an engine toggle state and a submain filter dropdown.

### Prompt 2: Trend Visualization Fixes
- **Goal**: Fix missing lines and add Y-axis zooming/panning.
- **Action**:
  - Added `connectNulls={true}` to Recharts `<Line>` components in `HistorianTrend.tsx` and `LiveTrend.tsx` to bridge missing data gaps.
  - Implemented `yScale` state with `onWheel` event listener (Shift + Wheel) for zooming.
  - Implemented `yOffsetPercent` state with a native `<input type="range" orient="vertical">` to serve as a vertical scrollbar for panning the Y-axis.

### Prompt 3: Alarm State Inconsistency Resolution
- **Goal**: Fix the confusing UX where a normal sensor reading was accompanied by an active 'ALARM' badge in the navigation tree.
- **Action**:
  - Analyzed `SimulatorEngine.ts` and `SubmainDetail.tsx`.
  - Discovered that `CLEARED_UNACK` alarms were triggering the generic `hasAlarm` boolean.
  - Separated the logic into `hasActiveAlarm` (renders red ALARM badge) and `hasUnackAlarm` (renders orange UNACK badge).

### Prompt 4: Prediction Model Documentation (Modal)
- **Goal**: Add an explanatory modal for the prediction pipeline.
- **Action**:
  - Created `PredictionHelpModal.tsx` detailing the 4-step pipeline: Historian Buffer, Feature Engineering, Linear Extrapolation, and Threshold Evaluation.
  - Hooked the modal into `App.tsx`'s `TopNavigation` with an info button.
