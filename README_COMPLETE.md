# PCW POC V1 — Complete Architecture Prototype

This package completes the architecture-first POC. No prediction model is implemented.

## Quick start (macOS/Linux)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
bash scripts/start_all.sh
bash scripts/status.sh
```

Web: `http://127.0.0.1:8000`

Run one minute job manually:

```bash
python -m app.scheduler.run_once
```

Tests:

```bash
bash scripts/run_fat.sh
bash scripts/run_sat.sh
```

Stop:

```bash
bash scripts/stop_all.sh
```

## Ports

- Process Modbus TCP: 1502
- Result Modbus TCP: 1503
- Web API/Dashboard: 8000

## Boundary

`model_adapter/stub_model.py` is a deterministic stub used only to verify I/O. It must not be interpreted as a prediction model or prediction accuracy evidence.
