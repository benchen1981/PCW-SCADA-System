# Prompt Development Record: Strict Unidirectional Data Flow Refactoring (Phase 12)

## Conversation Log

**User Prompt 1:**
> 核實資料流是否一致並依照以下單向資料流重構：
> Sensor Simulator -> Repository -> Domain Services -> Zustand Stores / Query Cache -> UI Pages
> 所有頁面不可自行產生資料。所有頁面不可互相直接讀取 React component state。所有頁面必須由同一份 repository/service 取得資料。

**Agent Action:**
1. Evaluated the existing architecture and identified that `PcwDataService.ts` was functioning simultaneously as the Simulator, the Mock Repository, and the Domain Service. Additionally, `HistorianTrend.tsx` was bypassing the Zustand store to fetch history directly from the service.
2. **Repository Layer:** Extracted the in-memory mock variables (`sensorsMock`, `historianMock`, etc.) into a dedicated `MockDatabase.ts` singleton to act as the raw data persistence layer.
3. **Simulator Layer:** Extracted the ticking logic and Alarm Engine into `SimulatorEngine.ts`, strictly isolating data generation.
4. **Domain Services:** Refactored `PcwDataService.ts` into a pure stateless Facade that only retrieves data from `MockDatabase`.
5. **Zustand Store:** Updated `scadaStore.ts` to include a `historyData` query cache and added a `fetchSensorHistory` action.
6. **UI Pages:** Stripped out direct service calls from `HistorianTrend.tsx`, forcing it to dispatch queries through the global `useScadaStore`, ensuring 100% compliance with the strict unidirectional data flow constraints.
