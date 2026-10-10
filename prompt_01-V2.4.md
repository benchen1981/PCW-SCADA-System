# Web SCADA PCW POC V2.4 - Detailed Development Prompts & Architecture

## 1. Project Architecture (專案架構)
The project is built using a modern React frontend with Vite, backed by Zustand for state management and Recharts for data visualization.

### Directory Structure
```text
/frontend
  /src
    /domain
      alarmTypes.ts          # Alarm type definitions
      historianTypes.ts      # Historical data types
      sensorTypes.ts         # Tag definitions
    /store
      scadaStore.ts          # Zustand store for unified states
    /services
      PcwDataService.ts      # Mock backend API
      SimulatorEngine.ts     # Data generation & Prediction math model
    /pages
      SystemOverview.tsx     # 8-System Dashboard
      SubmainDetail.tsx      # Submain specific view
      LiveSensors.tsx        # Real PCW P&ID Layout View
      HistorianTrend.tsx     # Historical trend with zoom
      LiveTrend.tsx          # Real-time memory ring buffer chart
      ActiveAlarms.tsx       # Alarm Summary & History Filters
      PredictionT30.tsx      # System Prediction details
      ModbusMonitor.tsx      # Hardware IO simulator map
```

## 2. Development Prompts & Directives (開發過程對話紀錄與 Prompt)

### Prompt 1: UI Optimization & Architecture Fixes
**Description**: Fix bugs and align the UI with real SCADA characteristics.
**Content**:
- Fix `Invalid Date` on the Latest Active Alarms component.
- Rename `Latest Active Alarms` to `Alarm Summary` and default to `activatedAt DESC` sorting.
- Update `Active Alarms` to default load data from the last 2 hours and implement time-range filtering.
- Ensure cross-page tag value consistency.

### Prompt 2: Process Overview P&ID Layout Reconstruction
**Description**: Discard the 5x4 CSS grid layout and build a spatial layout mimicking the actual FAB floor plan.
**Content**:
- "Live Sensor / Process Overview 必須依 FAB floor layout、Submain 管路與 Instrument 實際相對位置重新設計。"
- Build a single large SVG with `SUPPLY MAIN HEADER` at the top and `RETURN MAIN HEADER` at the bottom.
- Map Submains 01-20 to floor grids (e.g., FAB L40 / F14).
- Place PT transmitters and flow direction markers exactly on the branches.

### Prompt 3: Trend Zooming Features
**Description**: Ensure operators can zoom into specific time ranges on historical and live data.
**Content**:
- "Historian Trend 與 Live Trend 都必須支援 Zoom In / Zoom Out."
- Introduce Recharts `<Brush />` component for X-axis pan and zoom.
- Ensure reference limits (Alarm Limits) persist during zoom states.

### Prompt 4: System Prediction Engine Alignment
**Description**: Align the heuristic mock engine with the provided authoritative Excel model.
**Content**:
- "Prediction Engine 固定為 每 1 分鐘執行一次。"
- Replace simple linear regression slope with `Math.max(0, (Recent5Avg - Prev5Avg) / 5)`.
- Use correct time slices: `BaseAvg60 (t-70 to t-10)`, `Prev5Avg (t-10 to t-5)`, and `Recent5Avg (t-5 to t)`.
- Reconstruct the N10 threshold trigger paths (`gate30=1.55`, `gate20=1.58`, `gate10=1.62`, `hardAlarm=1.70`).
