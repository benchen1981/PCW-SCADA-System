# Prompt Development Record: Canonical Data Model & React Migration (Phase 7)

## Conversation Log

**User Prompt 1:**
> 根據剛才的分析，請建立 PCW SCADA 的 canonical data model... 所有 tag 必須使用以下唯一格式：PCW{systemNo}.Submain{submainNo}.{measurement}{position}... 建立資料層架構：domain, data, services, store, selectors。React page 不可直接讀取 mock JSON。

**Agent Action:**
1. Acknowledged the shift back towards a structured React/TypeScript frontend.
2. Created a Python generator script to scaffold the entire Canonical Data Model inside `src/`.
3. Generated strict TypeScript interfaces (`pcwTypes`, `sensorTypes`, etc.) in `src/domain/`.
4. Generated mock data arrays spanning 8 PCW systems and 160 submains in `src/data/`, adhering strictly to the `PCW01.Submain01.PT1S` naming convention.
5. Scaffolded unified service, store, and selector files.

**User Prompt 2:**
> 是，立即執行

**Agent Action:**
1. Initialized a Vite + React-TS project in the `frontend/` directory to avoid legacy Tailwind conflicts.
2. Migrated the generated `src/` Canonical Data Model into `frontend/src/`.
3. Ran `npm install`.

**User Prompt 3:**
> 請建立唯一的 PcwDataService，作為所有頁面的資料入口。必須提供以下方法：getAllSystems... getLatestSensorValues... getModbusRegisters...

**Agent Action:**
1. Authored `PcwDataService.ts` mapping all required async methods directly to the in-memory mock repositories from `src/data/`.
2. Ensured strict decoupling: UI only talks to the Service, and the Service acts as a future-proof boundary for real API integration.

**User Prompt 4:**
> 建構狀態管理層和完善頁面都要

**Agent Action:**
1. Installed `zustand` and `react-router-dom`.
2. Implemented `scadaStore.ts` using Zustand to poll `PcwDataService` every 3 seconds.
3. Built `App.tsx` containing the React Router and Sidebar navigation.
4. Refactored the `LiveSensors.tsx` list and the `SystemOverview.tsx` SVG P&ID diagram to be pure React components driven entirely by deterministic `useScadaStore` selectors.
