# Development Process Log (prompt 01-001)

## Architecture Overview
The system is a React + Vite + Zustand frontend application designed for Web SCADA monitoring, specifically for PCW (Process Cooling Water) systems.
It simulates real-time data using a built-in Modbus Engine (`SimulatorEngine.ts`) and presents predictive analytics through a Decision Engine (`PredictionT30.tsx`).

### Tech Stack:
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **Routing**: React Router
- **Styling**: Vanilla CSS (CSS Modules & Global Vars)

## Development Dialogue & Prompts

### Phase 1: Mismatch in Sensor Values
**User Prompt**: "System Prediction的Current Value與Modbus Simulator 的Live Value一致，立即核實除錯... Simulator的讀值是原始資料，各畫面所用到的都是同一筆原始資料，好嗎"
**Action Taken**: 
- Investigated `PredictionT30.tsx` and found it was rendering the static snapshot of `currentValue`.
- Updated the component to dynamically match the `tagId` against the global `sensors` store, rendering the live data identically to the Modbus Monitor.

### Phase 2: Simulator State Persistence
**User Prompt**: "sensor Simulator設定完後需一直套用，而不是離開此頁就立即回到預設值，立即核實除錯"
**Action Taken**:
- Moved the `SimulatorConfigs` state up to the `MockDatabase` repository.
- Implemented `localStorage` syncing so configurations survive unmounting the `ModbusMonitor.tsx` component.

### Phase 3: Simulator UI De-cluttering
**User Prompt**: "Modbus Simulator新增可指定單一系統設定其sensor value，並且新增建議baseline設定值，刪除Step Change、One-time Spike功能... Modbus Simulator畫面刪除Step Change、One-time Spike功能... 將Modbus Simulator畫面左側功能表整合右側Active Simulator Tags... 刪除Drift Slope (/tick)功能... 刪除畫面顯示Drift, Quality, Comm, Drift 欄位"
**Action Taken**:
- Removed all logic and UI fields related to `Drift`, `Quality`, `Comm Loss`, `Step Change`, and `Spike`.
- Re-architected the Layout into a strict Side-by-Side (`Left Panel = Controller`, `Right Panel = Data Table`).
- Migrated all tags filtering options into the Left Panel.
- Cleaned the right panel Table to solely display: Checkbox, Tag, Live Value, Base Setpoint, and Noise.
