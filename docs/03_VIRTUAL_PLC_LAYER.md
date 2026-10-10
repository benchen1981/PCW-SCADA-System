# 3. Virtual PLC Layer

## 目的
在無法使用正式 PLC 的論文 POC 環境中，以 Python Modbus TCP Server 模擬 PLC Holding Registers。

## 真實環境對應

```text
Physical Sensor → PLC AI → Scaling/Ladder → PLC Register → SCADA Driver
```

POC：

```text
Python Sensor Simulator → RegisterMap → Virtual PLC Holding Register → SCADA Driver
```

## V1 規則
- Process registers 對上層視為 read-only；只有 Simulator/Virtual PLC 內部更新。
- 秒級更新。
- 數值以 scale=1000 轉成 uint16。
- PT111S：protocol address 0 / display 40001。
- PT111R：protocol address 1 / display 40002。
- address 100 為 heartbeat。
- 不包含任何預測、分類或異常偵測邏輯。
