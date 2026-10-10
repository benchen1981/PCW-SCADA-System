# Phase 14: Global Optimizations (SAT Evidence & Global Tag Detail)

## Objective
To fully align with the `PCW_SCADA_FULL_SYSTEM_REFACTOR_MASTER_PROMPT.md` requirements by implementing cross-page reusable UI components and automated Site Acceptance Test (SAT) evidence tracking.

## Architecture & Development Process

### 1. Global Tag Detail Panel (Section 18)
- **Requirement:** Create one reusable Tag Detail drawer/page accessible from all pages to ensure cross-page consistency.
- **Implementation:**
  - Added `selectedGlobalTag`, `openTagDetail`, and `closeTagDetail` to `scadaStore.ts` (Zustand).
  - Created `GlobalTagDetail.tsx`, a floating drawer component injected at the root level (`App.tsx`).
  - The drawer unifies: Canonical Identity, Live Value, Quality, Alarm Limits, Recent Alarms, Prediction Inference (N10/Slope), and Modbus Map Address.
  - Replaced the local detail panel in `LiveSensors.tsx` with calls to `openTagDetail()`.
  - Added SVG click handlers to the instruments (`PT1S`, `TT1S`, `PT1R`, `TT1R`) in the P&ID diagram of `SubmainDetail.tsx` to directly open the global detail drawer.
  - Added click handlers to the Tag ID column in `ActiveAlarms.tsx` to allow jumping from an alarm event directly to the sensor detail.

### 2. SAT Evidence Page (Section 14)
- **Requirement:** Provide repeatable SAT test cases (e.g., normal steady signal, high alarm, communication loss).
- **Implementation:**
  - Created `SATEvidence.tsx` as a new main navigation route (`/sat`).
  - Transformed the 5 core integration tests (Single Source of Truth, Alarm Sync, Trend Sync, Quality Loss, Multi-tenancy) into an interactive assessment matrix.
  - Implemented dynamic status badges (PENDING, PASS, FAIL) to visualize the health of the system's architecture contracts.

## System Impact
The UI is now highly interconnected. Users can trace a sensor from a global plant overview down to a specific submain diagram, click the visual gauge, examine the canonical metadata in the unified drawer, and then pivot to historical trends or simulator controls without losing context. This fulfills the strict "traceability" and "dense industrial information hierarchy" mandates of the master prompt.
