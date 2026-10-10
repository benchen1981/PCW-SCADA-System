# Site Acceptance Test (SAT)

For each case preserve: condition, timestamps, SQL evidence, Modbus evidence, SCADA/Web screenshot, logs, result.

| ID | Scenario | Evidence |
|---|---|---|
| SAT-01 | Normal end-to-end operation | History + JobRun + Result + registers |
| SAT-02 | SQL interruption/recovery | error log + recovery timestamp |
| SAT-03 | Modbus interruption/recovery | quality/status transition |
| SAT-04 | missing/stale data | BAD/STALE/NO_DATA status |
| SAT-05 | service restart | heartbeat loss/recovery |
| SAT-06 | long-running test | duration, row count, missed-run count |
