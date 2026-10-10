# Debug Log: Canonical Data Model & React Migration (Phase 7)

## Issue 1: Escaping the "Frontend Silo" Trap
**Error Description / Constraint:** Previous iterations created visually rich but architecturally broken "Frontend Silos" (e.g., Early Warning tab generating its own `Math.random` tags like `S PCW011S`, while the Historian used `PT111S`).
**Resolution:** 
1. Enforced a **Canonical Data Model** using strict TypeScript interfaces (`SensorTag`).
2. Established a Single Source of Truth via `PcwDataService`. If a tag isn't returned by `getLatestSensorValues()`, it cannot be rendered on the UI.
3. Hard-coded the SVG P&ID text nodes to map exactly to the canonical IDs (e.g., `PCW01.Submain01.PT1S`), forcing the UI to align with the data dictionary.

## Issue 2: Tooling Conflicts with Vite Initialization
**Error Description / Constraint:** `npm create vite` prompts interactively for framework and linter choices, which stalls background agent tasks.
**Resolution:** Bypassed interactive prompts by piping default confirmations (`yes '' | npm create vite@latest frontend -- --template react-ts`), ensuring an uninterrupted automated project scaffold.
