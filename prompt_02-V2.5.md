# Web SCADA PCW POC V2.5 - Detailed Development Prompts & Architecture

## 1. Project Architecture (專案架構)
The project structure remains a React frontend (Vite) with a Zustand store. The V2.5 iteration significantly refines the UI layout and component interactions.

### Component Structure Changes
```text
/frontend
  /src
    App.tsx                # Added GlobalClock and updated Title to "PCW SCADA"
    /pages
      LiveSensors.tsx      # SVG engine upgraded to render full Submain P&ID (Pumps, Filters, Valves, HX)
      HistorianTrend.tsx   # Refactored to Compact Toolbar + Collapsible Drawer + Brush Zoom
      LiveTrend.tsx        # Refactored to Hierarchical Selector + 30m Historian Preload
```

## 2. Development Prompts & Directives (開發過程對話紀錄與 Prompt)

### Prompt 1: UI Layout Re-architecture & Global Header
**Description**: Change the global application headers and create strict P&ID mappings.
**Content**:
- "全站標題從 `Web SCADA HMI` 改為 `PCW SCADA`。"
- "標題下方新增目前時間，格式為 `yyyy:mm:dd hh:mm:ss`。"
- "各 PCW system 的 Submain 必須以真正的管路圖/P&ID 表示，不可只修 PT click。"
- Required Equipment rendering: Pump, Filter, Valve, Heat Exchanger, PT1S, PT2S, PT1R, PT2R, PDT, FT.

### Prompt 2: Historian Trend Zoom & Collapsible Drawer
**Description**: Enhance the historian UI to maximize chart area.
**Content**:
- "Historian Trend 必須支援 zoom in、zoom out、pan、reset。"
- "Tag Selector 重新排版，避免佔用過大左側空間，改為 compact filter toolbar + collapsible drawer。"

### Prompt 3: Live Trend Hierarchical Selector & Preloading
**Description**: Combine Submain and Tag selection into a single tree and enforce a 30-minute fixed window.
**Content**:
- "Live Trend 的 Submain 與 Select Tags 合併成更有效率的選擇器，允許使用者一次選取多個 sensor (Max 8)。"
- "Live Trend 移除 Window 選項，固定預設顯示最近 30 分鐘。"
- "選 tag 後先載入最近 30 分鐘 Historian，再訂閱 live updates，無資料時必須顯示 Diagnostics。"
