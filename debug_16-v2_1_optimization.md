# Phase 16: Debug Log & Fixes (V2.1 Optimization)

## Issue 1: `LiveSensors.tsx` JSX Nesting & Syntax Error
- **Symptom**: During the rewrite of `LiveSensors.tsx` to include the Process Mimic toggle, the Vite build failed with `[builtin:vite-transform] Expected corresponding JSX closing tag for 'table'`.
- **Root Cause**: The original code structure heavily nested HTML `table` inside multiple `div`s. When injecting the ternary operator `{viewMode === 'TABLE' ? ( ... ) : ( ... )}`, a closing `</div>` tag for `className="card table-container"` was accidentally omitted, causing the subsequent tags (like `</tbody>`) to lose their matching elements in the AST.
- **Resolution**: 
  - Restored the missing `</table>` and `</div>`.
  - Thoroughly verified the closing tag stack inside the JSX ternary expression to ensure both `PROCESS` and `TABLE` views result in a syntactically valid DOM structure.

## Issue 2: Modbus Simulator Tag Injection Filter Issue
- **Symptom**: The Modbus Simulator page required a PCW System dropdown to selectively apply injections (e.g., drift, spikes, noise) to a specific system, avoiding unintended cross-system mock data.
- **Root Cause**: The dropdown state `simSysFilter` was added, but the table rendering still iterated over the complete `sensors` array directly instead of applying a filter logic.
- **Resolution**:
  - Implemented a `filteredSimSensors` computed array inside `ModbusMonitor.tsx` that checks `simSysFilter`.
  - Replaced the `sensors.map` loop with `filteredSimSensors.map`.
  - Crucially, updated the logic of the "Select All" checkbox in the table header to check against `filteredSimSensors.length`, ensuring users only select visible tags.

## Issue 3: Persistent Database (LocalStorage) Lifecycle
- **Symptom**: After adding `localStorage` into `MockDatabase.ts`, the application would correctly preserve `historian` arrays across reloads. However, we needed to ensure the interval-driven `SimulatorEngine` auto-started efficiently without circular dependencies.
- **Root Cause**: Directly starting `setInterval` inside `MockDatabase`'s constructor creates architectural coupling and makes testing difficult.
- **Resolution**:
  - Maintained the single source of truth in `MockDatabase` via `simulatorStatus.isRunning`.
  - Leveraged `App.tsx`'s `useEffect` boot sequence. We simply dispatch `useScadaStore.getState().setSimulatorControl('START', 1000)` upon app load. 
  - Throttled the `localStorage.setItem` call in `SimulatorEngine` by persisting every 5 iterations (`iteration % 5 === 0`) to avoid potential frontend thread stuttering from writing large arrays into local storage too frequently.
