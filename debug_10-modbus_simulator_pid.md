# Debug Log: Modbus Simulator & P&ID Reconstruction (Phase 10 & 11)

## Issue 1: Simulator Global State Hydration
**Error Description:** When separating the Modbus UI and the Simulator control, the simulator configurations (such as drift slope and base value) needed to persist across React component unmounts. If placed directly inside `ModbusMonitor.tsx`, switching routes to check the Historian would destroy the simulator engine context.
**Resolution:** The Simulator Engine (`runSimulatorTick`) was placed deep inside `PcwDataService.ts` acting as the mock backend singleton. The interval timer is held in memory, meaning even if the React UI unmounts, the data continues to drift, spike, and trigger alarms. The `scadaStore` simply polls the resulting canonical data layer, ensuring perfect state retention.

## Issue 2: P&ID SVG Text Layout and Dynamic Widths
**Error Description:** In `SubmainDetail.tsx`, replacing static values with dynamic strings (which could be `BAD QUALITY`) caused text overlap within the tight SVG constraints, particularly when alarms triggered.
**Resolution:** Created a dedicated `renderSensorValue` rendering function for SVG `<g>` elements. It dynamically adjusts font size, color, and applies a secondary `<text>` node for the `last updated` timestamp. If `BAD QUALITY` is detected via the global state's `quality` flag, the entire bounding box safely wraps the error message without spilling over pipe schematics.
