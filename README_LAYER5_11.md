# PCW POC V1 — Layers 5–11

Implemented: Historian persistence, SQL schema, minute scheduler, TagList-driven processing, data-quality checks, Model Adapter Stub, JobRun, MinuteInput, and Result Table.

**No Prediction Model is implemented.** `PredictionResult` is an interface/result contract and stores `ModelVersion=STUB-V1`.

## Quick start
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.historian.init_db
```
Terminal A: `python -m app.main`

Terminal B: `python -m app.scada.main`

Terminal C: `python -m app.scheduler.main`

One-shot: `python -m app.scheduler.run_once`

Test: `pytest -q`

SQLite POC DB: `data/pcw_poc.db`  
SQL Server target DDL: `sql/001_schema_sqlserver.sql`
