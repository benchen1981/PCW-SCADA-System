# Debugging Log (詳細除錯過程紀錄)

## 1. LocalStorage Quota Exceeded (Historian)
**Symptom**: Application crashing or lagging significantly after running for a while; failure to save state.
**Root Cause**: The previous historian attempted to keep 200k+ rows in a single JavaScript array, exceeding the 5MB LocalStorage limit and causing O(N) performance degradation during shift operations.
**Resolution**: Implemented a per-tag, typed-array ring-buffer in `HistorianStore.ts`. Introduced compact snapshots in `MockDatabase.ts`.

## 2. Prediction Engine Starvation
**Symptom**: Drift detection and forecast updates were erratic or skipped.
**Root Cause**: The data plane was blocked by heavy synchronous array manipulations and memory overhead in the old historian implementation.
**Resolution**: The O(1) performance of the new ring buffer and optimized state lookups freed up the main thread, allowing `DriftForecastEngine.ts` to run smoothly on minute boundaries.

## 3. False Alarms on Application Startup
**Symptom**: Starting the SCADA immediately triggered numerous drift or threshold alarms.
**Root Cause**: The system lacked historical context upon startup, causing immediate state violations based on zero or undefined initial values.
**Resolution**: Implemented noise-based backfill logic in `MockDatabase.ts` during initialization to provide a stable baseline for the engines to warm up before generating alerts.

## 4. Background Tab Throttling Issues
**Symptom**: Time skewed and analytics missed windows when the browser tab was hidden.
**Root Cause**: Browsers throttle `setInterval` for inactive tabs.
**Resolution**: Modified `SimulatorEngine.ts` to track elapsed time (staleness checks) and execute capped "catch-up" ticks when the tab regains focus, maintaining data integrity without locking the UI.

## 5. GitHub Push Failure (origin already exists)
**Symptom**: `git remote add origin` failed with "remote origin already exists" and `git push` was rejected.
**Root Cause**: The remote repository had conflicting commits (likely a README or initial commit) that were not present locally.
**Resolution**: Perform `git pull --rebase origin main` before pushing.
