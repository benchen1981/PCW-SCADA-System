# Prompt Development Record: Modbus Simulator & P&ID Reconstruction (Phase 10 & 11)

## Conversation Log

**User Prompt 1: Modbus & Simulator Reconstruction (Phase 10)**
> 請重建 Modbus Monitor 與 Sensor Simulator，使兩者使用同一份 Modbus register map。
> 建立 Canonical Register Map (/src/data/modbusRegisterMap.ts)。每個 register 包含 registerAddress, tagId, dataType, unit, scale, min, max, access, source。
> Simulator 必須支援選擇 tags, 設定 base value, noise, drift slope, step change, spike, comm loss, update interval，並操作 start/pause/reset。
> Simulator 更新時必須同步更新 SensorRepository, ModbusRegisterRepository, Historian, AlarmEngine, Prediction, UI subscribers。
> Modbus Monitor 必須顯示 address, tag, raw/eng value, quality, source，不能顯示隨機 mock。

**Agent Action 1:**
1. Created `modbusTypes.ts` for strictly typing `ModbusRegisterDefinition`, `SimulatorConfig`, and `ModbusRegisterValue`.
2. Created `modbusRegisterMap.ts` mapping all dynamically generated `initialSensors` to float registers starting from 40001.
3. Implemented a fully functional `runSimulatorTick` inside `PcwDataService.ts`. This engine ticks every interval, applies white noise, drift, and spikes to simulated tags, logs them to Historian, triggers the Alarm Engine, updates Modbus raw bits, and broadcasts to UI.
4. Created the `ModbusMonitor.tsx` UI with two tabs: 
   - **Monitor Tab**: A fast-rendering table tracking Raw and Engineering values.
   - **Simulator Tab**: A robust control panel to manipulate tags intentionally to test SCADA resiliency.

**User Prompt 2: P&ID Reconstruction (Phase 11)**
> 請修正 PCW Submain Overview，使它成為 canonical PCW data model 的視覺化畫面。
> 預設顯示 PCW01，可切換至 PCW08，顯示該 system 的 20 個 submain，點擊顯示 sensor detail。
> P&ID 上每個儀表 (PT1S, PT1R, PDT, FT, TT) 必須綁定 canonical tagId。
> 資料必須來自 Global Store，與 Live Sensor 完全相同。無資料時顯示 BAD QUALITY 或 NO DATA 及最後更新時間，不得顯示隨機值。

**Agent Action 2:**
1. Completely rewrote `SubmainDetail.tsx`.
2. Integrated `useScadaStore` to pull centralized active `sensors`, `alarms`, and `submains`.
3. Created an interactive layout: A top System Selector, a left-side Submain Menu (with alarm notification badges), and a right-side SVG-based P&ID.
4. Implemented `renderSensorValue` to dynamically extract values from the canonical store based on exact string mapping (e.g. `PCW01.Submain02.PT1S`). It turns red on High/Low alarms, and cleanly displays `BAD QUALITY` when the simulator imposes a communication loss.
