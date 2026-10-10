# Debug Log: Strict Unidirectional Data Flow Refactoring (Phase 12)

## Issue 1: Asynchronous Query Cache in Zustand
**Error Description:** When refactoring `HistorianTrend.tsx` to stop calling `PcwDataService.getSensorHistory` directly, the chart needed a place to hold its results. Passing large datasets through local component state is acceptable, but it violates the strict instruction that "all pages must retrieve data from the same repository/service layer" and risks losing the fetched data on unmount.
**Resolution:** Implemented a query cache inside `scadaStore.ts` named `historyData`. The `fetchSensorHistory` async action was added to the Zustand store. Now, when the user clicks "Execute Query", the component dispatches the action to the store, the store queries the Domain Service, the store pivots the data for Recharts, and finally updates the central `historyData` state. The component then simply reacts to the state change, perfectly completing the unidirectional loop.

## Issue 2: Separation of Concerns in DataService
**Error Description:** During the split, `SimulatorEngine.ts` required access to the Alarm Engine logic, but the Alarm Engine needed to mutate the Alarm Repository.
**Resolution:** Extracted `evaluateAlarms` into `SimulatorEngine.ts` as a private static method. Both the simulator and the alarm engine now safely share access to the imported `MockDatabase.ts` singleton, decoupling data mutation logic from the API delivery logic in `PcwDataService.ts`.
