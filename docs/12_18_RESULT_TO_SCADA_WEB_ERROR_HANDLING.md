# Layers 12–18 — Result Gateway / SCADA Prediction Tags / Web / Error Handling

**No Prediction Model is implemented.** `PredictionResult` remains a contract populated by `STUB-V1`.

## 12 SQL → Modbus Result Gateway
`python -m app.result_gateway.main` exposes result registers on TCP 1503. This is deliberately separate from process-data Virtual PLC port 1502.

Per tag: `ResultCode, EngineStatus, X1*1000, Y*1000, N*1000, AgeSeconds, Quality`. Stale data is explicitly marked.

## 13 SCADA Prediction Tags
`python -m app.scada.prediction_main` polls the result gateway and maintains research/result tags separately from Process Tags.

## 14–15 Web API / Dashboard
`python -m app.web_api.run`, then browse to `http://127.0.0.1:8000`. APIs: health, tags, history, minute-input, results, jobs, audit.

## 16–17 Logging / Heartbeat
`SystemHealth` records heartbeat/status/latency/error. Existing Python logging remains the service log mechanism.

## 18 Error Handling
DB/Modbus failures are caught at service boundaries. Result quality uses GOOD/STALE/NO_DATA/BAD; stale or unavailable results are never silently shown as fresh. Gateway errors are written to `AuditLog` where DB access remains available.
