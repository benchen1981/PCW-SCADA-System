# Prompt Development Record: Data Architecture Refactoring (Phase 6)

## Conversation Log

**User Prompt 1:**
> 你現在不要新增漂亮 UI，也不要重新設計顏色。請先對目前整個 PCW SCADA 專案進行「資料架構與功能一致性重構」。目前專案存在嚴重問題：各頁面使用不同 mock data... 找出重複資料、命名不一致、斷開的資料流... 請先等待我確認分析結果。

**Agent Action:**
1. Halted UI modifications and executed a deep analysis of `app/web_api/static/index.html`, `config/tags.yaml`, and FastAPI routes.
2. Identified critical "Frontend Silos": SVG graphics, Early Warning, and T30 tabs were disconnected from the Python backend simulator and relied on local JS `Math.random` loops.
3. Identified broken naming conventions across the stack (`PT111S` vs `PCW01.Submain01.S_PT`).
4. Identified missing API endpoints (`/api/alarms`, `/api/modbus`).
5. Presented a detailed architectural critique and proposed a 4-step Store-like refactoring plan.

**User Prompt 2:**
> 1234全部執行並優化

**Agent Action:**
1. Unified `config/tags.yaml` to represent a coherent PCW01 system layout (`PCW01.S01.PT_S`, `TK-501_L`, `P-101A`).
2. Added mock endpoints for `/api/alarms` and `/api/modbus` to `app/web_api/main.py`.
3. Completely rewrote `app/web_api/static/index.html`:
   - Eliminated all local `Math.random` loops.
   - Built a global `Store` object updated by a single `Promise.all` fetch loop (`fetchAllData()`).
   - Mapped all UI components (SVG P&ID, Tables, T30 logic) to render deterministically from `Store.tags`.
4. Added UI controls (Historian Trend Dropdown, Simulator drift button skeleton) and restarted backend services to apply the unified tags.
