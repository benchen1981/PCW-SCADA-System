# Debug Log: React UI Completion & FastAPI Integration (Phase 8)

## Issue 1: TypeScript Verbatim Module Syntax Error
**Error Description:** During the Vite build (`tsc -b && vite build`), the TypeScript compiler threw multiple `TS1484` errors stating that types like `PcwSystem` and `SensorTag` must be imported using a type-only import (`import type`) when `verbatimModuleSyntax` is enabled.
**Resolution:** 
Ran a Python script across `frontend/src` to systematically convert standard imports to `import type { ... }` for all canonical domain interfaces (`PcwSystem`, `PcwSubmain`, `SensorTag`, `AlarmEvent`, `HistorianRecord`, `PredictionResult`).

## Issue 2: Invalid Canonical Type Assignment
**Error Description:** The `tsc` compiler caught a strict typing error where `'UNACKNOWLEDGED'` was passed to an alarm status that only accepted `'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED'`.
**Resolution:** Corrected the hard-coded mock data in `PcwDataService.ts` to use the strictly valid `'ACTIVE'` string, proving the value of the new Canonical TypeScript architecture.

## Issue 3: FastAPI Client-Side Routing (SPA) 404 Errors
**Error Description:** Once the compiled React app was served via FastAPI's `StaticFiles`, refreshing the browser on a client-side route like `http://127.0.0.1:8000/sensors` resulted in a FastAPI 404 error because the Python backend didn't recognize the route.
**Resolution:** Rewrote the FastAPI static mount in `main.py`. Defined an explicit `/assets` route for JS/CSS files, and added a catch-all route `@app.get("/{full_path:path}")` that falls back to serving `index.html` for any unmatched paths (excluding `/api/`), effectively offloading routing logic to React Router.
