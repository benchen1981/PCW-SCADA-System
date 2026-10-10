# 4. SCADA Process Data Layer

## Scope
This layer emulates the upper SCADA acquisition behavior only:

`Virtual PLC -> Modbus SCADA Driver -> Process Tag -> Alarm evaluation -> HMI`

Historian/database persistence is deliberately deferred to the next layer.

## Run
Terminal A:
```bash
python -m app.main
```
Terminal B:
```bash
python -m app.scada.main
```

The SCADA driver polls the Virtual PLC every second, decodes register scaling, updates process tags and evaluates HIHI/HI/LO/LOLO.

## Process tags
- `PCW01.PT111S.PV`
- `PCW01.PT111R.PV`

Alarm thresholds are POC configuration values in `config/scada.yaml`; adjust them to the approved plant/tag specification before SAT.

## Explicit boundary
No prediction model and no prediction tag are implemented here. No historian SQL write is implemented in Layer 4.
