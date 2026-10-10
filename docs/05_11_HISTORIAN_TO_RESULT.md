# Layers 5–11: Historian / SQL Database → Result Table

## Scope
This increment implements architecture only. `StubModelAdapter` is deliberately **not** a prediction model.

## Data path
SCADA Process Tag → SQLite Historian (`History`) → APScheduler (60 s) → MinuteProcessor → StubModelAdapter → `MinuteInput` + `PredictionResult` + `JobRun`.

## POC vs production DB
The downloadable POC defaults to SQLite so it runs without an external DB server. `sql/001_schema_sqlserver.sql` supplies the SQL Server target DDL for the Historian/MS-SQL deployment stage.

## Causality
For evaluation time `t`, `MinuteProcessor` queries `(t-1 minute, t]` only. It never reads rows after `t`.

## Run
1. `python -m app.main` — Sensor + Virtual PLC
2. `python -m app.scada.main` — SCADA polling + Historian persistence
3. `python -m app.scheduler.main` — every-minute processing
4. One-shot verification: `python -m app.scheduler.run_once`
5. DB: `data/pcw_poc.db`
