# PCW POC V1 — Layers 12–18

Extends Layers 1–11 through **SQL Result → Modbus Result Gateway → SCADA Prediction Tags → Web API/Dashboard → Heartbeat/Error Handling**. No Prediction Model is implemented.

## Install / test
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.historian.init_db
pytest -q
```

## Run (separate terminals)
```bash
python -m app.main
python -m app.scada.main
python -m app.scheduler.main
python -m app.result_gateway.main
python -m app.scada.prediction_main
python -m app.web_api.run
```

For an immediate Result row: `python -m app.scheduler.run_once`.
Web: `http://127.0.0.1:8000`.
