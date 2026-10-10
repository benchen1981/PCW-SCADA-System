# Factory Acceptance Test (FAT)

Scope: architecture/data-path verification only; no prediction-model validation.

| ID | Test | Pass criterion |
|---|---|---|
| FAT-01 | Sensor simulator | 1-second values with timestamp/quality |
| FAT-02 | Process Modbus | configured registers readable |
| FAT-03 | SCADA process tags | register scaling/tag mapping correct |
| FAT-04 | Historian | second-level records queryable |
| FAT-05 | Minute job | repeatable RunID and status |
| FAT-06 | Stub result | result contract persisted, ModelVersion=STUB-V1 |
| FAT-07 | Result gateway | SQL result mapped to result registers |
| FAT-08 | Web/health | health and data endpoints respond |
| FAT-09 | Restart | services recover without corrupting history |
| FAT-10 | Multi-tag | one tag failure does not stop all tags |
