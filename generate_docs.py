import json
import os

transcript_path = "/Users/benchen1981/.gemini/antigravity-ide/brain/e2d8da10-2c1f-4d47-810a-14493dcd7112/.system_generated/logs/transcript.jsonl"
output_dir = "/Users/benchen1981/Downloads/Web SCADA/Code/pcw-poc-v1_merged"

prompts = []
debug_logs = []

with open(transcript_path, 'r') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("type") == "USER_INPUT":
                prompts.append(entry.get("content", ""))
            elif entry.get("type") in ["PLANNER_RESPONSE", "MODEL_RESPONSE"]:
                if "error" in entry.get("content", "").lower() or "debug" in entry.get("content", "").lower():
                    debug_logs.append(entry.get("content", ""))
        except:
            pass

with open(os.path.join(output_dir, "prompt_logs.md"), 'w') as f:
    f.write("# Development Prompts (開發過程對話紀錄)\n\n")
    for idx, prompt in enumerate(prompts):
        f.write(f"## Prompt {idx + 1}\n\n```\n{prompt}\n```\n\n")

with open(os.path.join(output_dir, "debug_logs.md"), 'w') as f:
    f.write("# Debug Logs (除錯過程對話紀錄)\n\n")
    for idx, log in enumerate(debug_logs):
        f.write(f"## Debug Event {idx + 1}\n\n```\n{log}\n```\n\n")

readme_content = """# PCW SCADA System

## English Description
This project is a Web-based Supervisory Control and Data Acquisition (SCADA) system for PCW (Process Cooling Water) monitoring. It features real-time sensor data visualization, alarm management, historical trends, and an early-warning prediction engine. Originally a Proof of Concept (POC), the system is now transitioning to a production-ready ("real landing") state.

## 中文說明 (Chinese Description)
本專案為一個基於 Web 的程序冷卻水 (PCW) 監控與資料擷取 (SCADA) 系統。其具備即時感測器數據視覺化、警報管理、歷史趨勢分析以及預警預測引擎等功能。本系統最初為概念驗證 (POC)，目前正進入真實落地 (Production) 階段。

## 系統架構 (System Architecture)
- **Frontend**: React + Vite, TypeScript, Zustand (State Management), Recharts (Data Visualization)
- **Backend / Data Source**: Currently uses an in-memory `MockDatabase` and `SimulatorEngine` for POC. For production, this will be replaced with real API calls to a historian database (e.g., InfluxDB) and PLC/Modbus gateways.
- **Predictive Engine**: Analyzes N10 (Anomaly Density) and moving averages to provide T-10, T-20, and T-30 warnings before values breach safety limits.

## 執行步驟 (Execution Steps)
1. Ensure Node.js is installed.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.
4. Run `npm run build` to build for production.

## 開發過程與 Debug 紀錄 (Development & Debugging Logs)
- For a detailed list of all prompts used during development, see [prompt_logs.md](./prompt_logs.md).
- For a detailed log of debugging steps and model responses related to errors, see [debug_logs.md](./debug_logs.md).
"""

with open(os.path.join(output_dir, "README.md"), 'w') as f:
    f.write(readme_content)

print("Documentation generated successfully.")
