import re

template_path = "main.tex"

with open(template_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Title
content = re.sub(r'\\title\{.*?\}', lambda m: r'\title{基於預測引擎與前端串流架構之新一代程序冷卻水監控系統}', content)
content = re.sub(r'\\engtitle\{.*?\}', lambda m: r'\engtitle{Next-Generation Process Cooling Water SCADA System Based on Predictive Engine and Frontend Streaming Architecture}', content)
content = re.sub(r'\\author\{.*?\}', lambda m: r'\author{Ben Chen}', content)

zh_abstract = """
傳統程序冷卻水 (PCW) 監控系統主要依賴被動式警報，無法在設備發生嚴重故障前提供有效的預警機制。本研究提出並實作了一套具備預測引擎 (Prediction Engine) 的新一代 PCW SCADA 系統。透過歷史特徵值擷取 (如 BaseAvg60) 以及異常密度 (N10) 演算模型，本系統能有效辨識微小的飄移趨勢，並提供 T-10, T-20, T-30 提前預警。為解決大量歷史數據帶來的瀏覽器效能瓶頸，本系統實作了基於時間區段的動態降採樣 (Downsampling) 演算法。此外，在系統落地的架構轉型上，導入了 WebSocket 即時推播機制，取代傳統的前端高頻輪詢 (Polling)，顯著降低了系統延遲與伺服器負擔。
\\keywords{SCADA, 程序冷卻水, 預測引擎, 狀態監控, 降採樣}
"""
content = re.sub(r'\\begin\{zhabstract\}.*?\\end\{zhabstract\}', lambda m: f'\\begin{{zhabstract}}\n{zh_abstract}\n\\end{{zhabstract}}', content, flags=re.DOTALL)

en_abstract = """
Traditional Process Cooling Water (PCW) monitoring systems rely heavily on reactive alarms, failing to provide effective early warning mechanisms before severe equipment failures occur. This study proposes and implements a next-generation PCW SCADA system equipped with a Prediction Engine. By extracting historical features (e.g., BaseAvg60) and employing an anomaly density (N10) calculation model, this system effectively identifies minor drifting trends and provides T-10, T-20, and T-30 early warnings. To address the browser performance bottlenecks caused by massive historical data, this system implements a time-segment-based dynamic downsampling algorithm. Furthermore, during the system's production deployment transition, a WebSocket real-time push mechanism was introduced, replacing traditional frontend high-frequency polling, thereby significantly reducing system latency and server load.
\\engkeywords{SCADA, Process Cooling Water, Prediction Engine, Condition Monitoring, Downsampling}
"""
content = re.sub(r'\\begin\{enabstract\}.*?\\end\{enabstract\}', lambda m: f'\\begin{{enabstract}}\n{en_abstract}\n\\end{{enabstract}}', content, flags=re.DOTALL)

chapters_latex = """
\\chapter{緒論}
\\section{研究背景與動機}
半導體與高科技製造業對於廠務設備的穩定性要求極高。程序冷卻水 (PCW) 系統負責維持核心機台的運作溫度，若發生無預警的壓降或停機，將造成龐大損失。現行的 SCADA 系統大多停留在「數值超標後發出警報」的被動階段，缺乏防患於未然的預測能力。

\\section{研究目的}
本研究旨在建構一套具有高度互動性與預警能力的 Web SCADA 系統，結合前端現代化框架 (React) 與即時通訊技術，達成以下目的：
\\begin{enumerate}
    \\item 建立輕量化且精準的預測引擎 (Prediction Engine)。
    \\item 提供可視化的歷史趨勢分析 (Historian Trend)，方便工程師進行特徵追溯。
    \\item 建構高擴充性、高可用性的前端架構以準備進入真實落地 (Production) 階段。
\\end{enumerate}

\\chapter{系統架構設計}
\\section{整體架構}
本系統分為概念驗證 (POC) 與真實落地 (Production) 兩個階段。
在 POC 階段，透過瀏覽器內建的 SimulatorEngine 與 MockDatabase 產生擬真數據，驗證演算法可行性。進入落地階段後，透過 ApiClient 與 WebSocketClient 銜接真實工廠端 PLC 與資料庫。

\\section{前端技術選型}
\\begin{itemize}
    \\item \\textbf{核心框架}: React 18, Vite, TypeScript
    \\item \\textbf{狀態管理}: Zustand，用於管理全球警報狀態 (Alarms)、感測器數值 (Sensors) 與歷史圖表快取。
    \\item \\textbf{圖表渲染}: Recharts，用於繪製即時與歷史的趨勢圖。
\\end{itemize}

\\chapter{預測引擎與核心演算法}
\\section{異常密度演算}
系統記錄過去 60 分鐘的基礎平均值 (BaseAvg60)。
演算法定義 $M_{60}$ 為過去 60 分鐘內偏離 BaseAvg60 的採樣點數量；$M_{10}$ 為過去 10 分鐘內的偏離點數量。
異常密度 $N_{10}$ 定義為 $M_{10}$ 相對於 10 分鐘期望偏離量 $(M_{60}/6)$ 的比值：
\\begin{equation}
N_{10} = \\frac{M_{10}}{M_{60} / 6}
\\end{equation}
當 $N_{10}$ 超過使用者自訂的靈敏度閾值且同時具備持續的斜率時，系統將觸發趨勢飄移預警。

\\section{T-30 / T-20 / T-10 預測預警}
系統透過滑動視窗計算近期數值變化的斜率 (Slope)，並推論未來 10 分鐘、20 分鐘與 30 分鐘的預測值。若預測值觸及工程上下限，系統將提前發出相應的警告，供操作員應對。

\\chapter{使用者介面與歷史趨勢最佳化}
\\section{警報中心}
為確保操作一致性，警報中心移除冗餘欄位，統一採用與全域警報摘要一致的顯示標準，並整合一鍵簽核 (ACK) 功能與即時警報計數，提升維運人員的反應速度。

\\section{歷史趨勢大數據最佳化}
歷史趨勢需要處理長達 6 個月的高頻度資料。我們在前端實作了等距降採樣演算法，確保傳送至 Recharts 渲染的資料點數量控制在 2,000 點以內，從而解決了瀏覽器因記憶體超載而凍結的問題。此外，導入了強大的四層特徵篩選器，讓工程師能輕易調閱特定感測器的 $N_{10}$ 或 $BaseAvg60$ 曲線。

\\chapter{結論}
本研究成功開發並驗證了一套新一代 PCW SCADA 系統。其內建的 N10 預測引擎能有效找出潛在的異常飄移，補足了傳統系統的不足。在技術層面上，系統透過完善的前端架構設計證明了基於 Web 的大型工業監控系統不僅具有高度的可擴展性，也能提供極佳的互動效能，為工業 4.0 的廠務監控提供了一個優秀的實作範例。
"""

content = re.sub(r'(\\mainmatter).*?(\\backmatter)', lambda m: m.group(1) + '\n' + chapters_latex + '\n' + m.group(2), content, flags=re.DOTALL)

with open(template_path, 'w', encoding='utf-8') as f:
    f.write(content)
