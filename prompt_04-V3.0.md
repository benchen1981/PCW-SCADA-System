# Development Prompts & Architecture (V3.0)

## System Architecture Overview (系統架構總覽)
The V3.0 of this PCW SCADA Frontend Application merges previously separated Python/Vue legacy systems into a unified React 19 + Vite + TypeScript application running entirely on port 5173. 
The architecture relies on:
1. **Zustand (`scadaStore.ts`)**: For centralized state management (Alarms, Sensors, Modbus settings, and Simulator configs).
2. **Recharts**: For high-performance rendering of time-series data (`LiveTrend.tsx` & `HistorianTrend.tsx`), incorporating custom cursor-anchored wheel zooming.
3. **SVG Native Graphics**: For responsive P&ID rendering in `SubmainDetail.tsx` and `LiveSensors.tsx`.

## Development History & Prompts (開發歷史與指令)

### Phase 1: Unification & Consolidation (雙平台整合)
**User Prompt:**
> 目前以http://localhost:5173/ 進行系統開發確認，http://127.0.0.1:8000/是前版，如果不再使用立即停止，並將二個網頁功能、頁面合併，以單一網站為主

**Execution:**
- The legacy `ModbusMonitor` logic (previously served by port 8000) was successfully migrated into the main React application under the `/modbus` route.
- Re-used the existing Zustand store to handle Simulator control states (START, PAUSE, RESET) and Tag Injection settings (Base, Noise, Drift, Step, Spike).

### Phase 2: Sensor Limits & Modbus Features (感測器邊界與進階控制)
**User Prompt:**
> 所有pt sensor alarm limit設定為 hihi=1.8，hi=1.7，lo=1.3，lolo=1.2
> 所有ft sensor alarm limit設定為 hihi=220，hi=200，lo=160，lolo=150
> 所有dp sensor alarm limit設定為 hihi=1，hi=0.8
> Modbus Simulator 新增分類可選擇pt、ft、dp...... 不同類別sensor

**Execution:**
- Standardized `engineeringLimits` in `sensorDefinitions.ts` for PT, FT, and PDT sensors.
- Adjusted initial simulated generation values to sit safely within the new "NORMAL" bounds to prevent alert flooding upon server startup.
- Introduced a `Measurement Type` cross-filter into `ModbusMonitor.tsx` to selectively apply noise/drift values specifically to PTs, FTs, or DPs.

### Phase 3: Alarm System Overhaul (警報系統標準化)
**User Prompt:**
> Alarm Summary和Alarm Center需要有單一ack和全部ack功能，全部unack也沒有return的功能及記錄，與現實scada不一致
> UNACKNOWLEDGED ALARM ---Go to Alarm Center，這個警報觸發功能與Alarm Summary整合，新警報觸發時，Alarm Summary無ack警報將持續閃爍到ack為止

**Execution:**
- Built `acknowledgeAllAlarms` into `PcwDataService` and the store.
- Designed a formal SCADA Alarm state machine: `ACTIVE_UNACK` -> `ACTIVE_ACK` -> `CLEARED_UNACK` -> `CLEARED_ACK`.
- Implemented visual flashing logic in `GlobalAlarmSummary` when there are outstanding unacknowledged alerts.

### Phase 4: P&ID Aesthetics (工程圖美化)
**User Prompt:**
> live sensor process view真的很醜，與真實管路圖p&id完全不一樣，立即優化
> live sensor 的SUPPLY MAIN HEADER和RETURN MAIN HEADER被元件阻擋無法完整顯示，每個submain間距再縮小，各元件上下空再調整，並且在每個元件旁放tag名稱

**Execution:**
- Replaced the initial generic lists with an immersive, horizontal-scrolling SVG canvas.
- Dynamically calculated widths, scaled component spaces down (from 190px to 120px gaps), and added explicit naming tags (e.g., `PT1S`) directly into the SVG coordinates alongside the measurement values.

### Phase 5: Historian & Layout Refinement (歷史圖表與排版優化)
**User Prompt:**
> Historian trend的Select Historian Tags，apply tags和clear放到上面
> plant overview的"8-System Operational Status"標題改all loop system Status, last update、bad quality、comm刪除

**Execution:**
- Reorganized Flexbox structures across overview dashboards to focus solely on Alarms and AI Predictions.
- Re-positioned interactive modal controllers inside the Historian Drawer to the top of the panel to drastically minimize cursor travel distance.

### Phase 6: Final Refinements (最終介面微調)
**User Prompt:**
> Historian trend的資訊跳圖整合進Query Info
> 滑鼠滾輪進行時間zoom in/out即時進行query後立即顯示
> 所有submain的SUPPLY和RETURN pt sensor改為一個
> fab tool改名稱為tool01 ~ toolxx流水號
> Process Overview刪除小圖後左移

**Execution:**
- Deleted duplicate P&ID elements (PT2S, PT2R) and equipment icons, shifted the overall layout left for better spacial usage.
- Changed FAB TOOL to dynamically generated TOOLxx series.
- Integrated the floating chart info window directly into the standard Top Bar.
- Overhauled the Historian Wheel logic to actually fire new custom-time queries debounced by 600ms.

### Phase 7: Prediction Engine Tuning & P&ID Detail Integration
- **User Intent**: 
  - Verification of the 1-minute prediction inference loop (`System Prediction沒有結果`).
  - Request for comprehensive AI inference explanation texts for predictive statuses (`prediction各指標不夠完整並需加推論說明`).
  - Request to reposition DP and FT on the main view down near the Return Main Header (`Process Overview的dp和ft位置放下submain下方`).
  - Fix crash on jumping to Submain details (`紅框中的元件點選後的網頁無任何畫面`).
  - Restore functionality for accessing Submains outside of PCW01 (`只有PCW01 的 SM Process View，其他都沒有`).
- **Implementation Strategy**:
  - Implement 1-minute downsampling for the Historian write loop, allowing 50,000 max size limits to cover 156 minutes of continuous simulated operation to meet the 70-minute predictive requirement.
  - Add highly-detailed dynamic string builders for `triggerPath` to explain anomaly density values (N10) vs mathematical trend forecasting values (Slope*h).
  - Modify `LiveSensors.tsx` SVG transforms to align the Return Pipe components (PTR, DP, FT) vertically along the bottom axis sequentially.
  - Refactor Zustand selectors within `SubmainDetail.tsx` to prevent `.filter` allocation loops and React crash.
  - Eliminate hardcoded arguments in `pcwDataService.getAllSubmains()` across the app.
