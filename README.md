# PCW SCADA System

## Overview
This project is a web-based SCADA system designed for monitoring Process Cooling Water (PCW) systems in semiconductor fabrication plants. The core focus of the system lies in **Drift Detection** and **Trend Forecasting**. 

The system is engineered to be deployed on real factory floors, serve as the foundation for academic thesis submissions/competitions, and contribute to future patent applications. It is built with industrial-grade standards, focusing on high performance, deterministic analytics, and ISA-18.2 compliant alarm management.

## System Architecture
The application runs entirely within the browser, utilizing a mock backend architecture for the PoC phase, but designed for seamless integration with real PLCs/OPC UA servers.

1.  **Data Plane (`SimulatorEngine.ts`)**: 
    - Simulates 1-second raw sampling ticks and 1-minute aggregation ticks.
    - Integrates fault injection schemas (Drift, Step, Spike, Bad Quality).
2.  **Persistence (`MockDatabase.ts` & `HistorianStore.ts`)**: 
    - Manages LocalStorage constraints (5MB limit) using a highly efficient per-tag, typed-array ring-buffer historian.
    - Implements noise-based backfilling and compact snapshotting.
3.  **Analytics Core (`DriftForecastEngine.ts`)**: 
    - Computes N10 anomalies, linear forecasts, OLS confidence intervals, and Risk Indices (TTL).
4.  **Alarm Engine (`AlarmEngine.ts`)**: 
    - ISA-18.2 / IEC 62682 compliant. Handles deadbands, on-delays, and BAD/COMM_LOSS quality propagation.
5.  **HMI Layer (React Components)**: 
    - Features a premium, dynamic, and responsive UI (GlobalTagDetail, PredictionT30, GlobalAlarmSummary, etc.).

## Execution Steps (Usage)
1.  **Install Dependencies**: `npm install`
2.  **Start Development Server**: `npm run dev`
3.  **Build for Production**: `npm run build`
4.  **Preview Production Build**: `npm run preview`

## Documentation Links
- [Development Process & Prompts](./prompt_dev_log.md)
- [Debugging Log](./debug_log.md)
- [Chinese README](./README_zh.md)
