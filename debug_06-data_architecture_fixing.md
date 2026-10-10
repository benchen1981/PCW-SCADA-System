# Debug Log: Data Architecture Refactoring (Phase 6)

## Issue 1: Frontend Data Disconnect and Naming Inconsistency
**Error Description / Constraint:** As advanced predictive UI tabs were rapidly developed in earlier phases, they were wired to independent JavaScript mock generators rather than the backend APIs. This led to fragmented tag naming, duplicated state, and no true integration with the Python simulator and SQLite historian.

**Resolution:** 
1. **Single Source of Truth:** Regenerated `config/tags.yaml` with a comprehensive subset of tags that matched the physical SCADA layout (e.g., PCW mains, Submains, Tanks).
2. **Global Store Pattern:** Refactored `index.html` to instantiate a global `Store = { tags: [], history: [], results: [], alarms: [], modbus: [] }`. 
3. **API Alignment:** Added missing `/api/alarms` and `/api/modbus` endpoints to FastAPI.
4. **Data-Driven UI:** Forced all rendering blocks (SVG text updates, table generation, T30 inference mock computations) to ingest real values from `Store.tags`. This successfully bridged the gap between the Python backend simulator and the advanced SCADA HMI visualizations without sacrificing UI performance.
