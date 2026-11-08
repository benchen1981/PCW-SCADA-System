# 雙層式半導體 Fab 之 PCW 監控、偏移偵測與趨勢預測研究補充說明

**文件版本：V1.0｜論文補充文件／教授 Meeting 問題回應稿**\
**研究範圍：8 套獨立 PCW 系統、Modbus 模擬資料、SCADA/Historian、Drift
Detection、Time-to-Limit Forecast**

> 文件使用原則：已知系統設定值以使用者提供資料為準；未提供的現場工程資料、設備配置、管路拓撲、工程單位及設計依據，均明確標示為「待現場文件確認」，不以假設冒充實測事實。

------------------------------------------------------------------------

# 0. 研究定位與教授問題總覽

本研究針對雙層式半導體晶圓廠（Two-level Fab）之製程冷卻水系統（Process
Cooling Water, PCW），建立一套以模擬 Sensor
時序資料為基礎的早期異常預警實驗平台。研究核心不是重新設計 PCW
水力系統，也不是開發完整商用 SCADA，而是驗證兩項分析能力：

1.  **偏移偵測（Drift Detection）：** 判斷 Sensor
    行為是否已經偏離其正常參考狀態。
2.  **趨勢／越限時間預測（Forecast / Time-to-Limit）：**
    根據近期趨勢，估計 Sensor 可能到達已設定 HI 或 LO 限值的時間。

研究採用 Modbus 模擬器產生具工程設定範圍及可控異常情境的 PT、FT、DP
資料，經 SCADA 讀取、資料庫保存，再由每分鐘排程執行模型。由於實際 Fab
生產資料受資訊安全、機密及設備連線限制，本階段不連接生產設備、不讀取真實製程資料；因此實驗結果只能證明所設計資料流程及模型在模擬情境下的可行性與性能，不能宣稱已證明真實廠區故障診斷能力或實際部署效益。

## 0.1 六項 Meeting 問題對應

  --------------------------------------------------------------------------------------
  教授問題                本文件對應章節          必須交代的證據
  ----------------------- ----------------------- --------------------------------------
  1\. Drift 與 Forecast   第 4、5 章              變數定義、公式、判定條件、邊界條件
  數學公式                                        

  2\. 資料處理與特徵工程  第 6 章                 清理、品質、視窗、特徵、資料切分

  3\. Modbus              第 3 章                 模擬器、暫存器、SCADA 輪詢、資料標示
  模擬與非真實數據                                

  4\. 雙層 Fab 與 8 套    第 1、2 章              樓層／製程／設備／供水系統的邏輯關係
  PCW                                             

  5\. HI/LO Limit         第 7 章                 現有設定表、設定來源限制、驗證程序
  設定依據                                        

  6\. Baseline 與冷卻需求 第 8 章                 PT/FT/DP
                                                  物理意義、過高過低風險、溫度差異
  --------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 1. 雙層式 Fab 的空間與製程配置

## 1.1 雙層式 Fab 的基本概念

本研究所稱雙層式
Fab，是指製程生產空間與下層廠務支援空間分層配置的建築／設施概念。典型配置可能包括：

-   **上層／Fab Level：** 晶圓製程設備、潔淨室、晶圓搬送及製程作業區。
-   **下層／Sub-fab Level：** 設備支援設施、部分
    Pump、真空、排氣、管路、閥件、配管及維修空間。
-   **Utility Area：** 中央或區域性公用系統設備，例如 PCW
    泵浦、熱交換器、過濾設備及供回水主管。其實際位置可能在
    Sub-fab、機房或其他專用空間，必須依廠房設計確認。

雙層配置的價值在於可將部分設備支援、管路及維修活動與潔淨室生產空間分離，並利用垂直管道、管廊或
Utility Chase 連接不同樓層。但不能假設所有 PCW 主機設備都一定位於
Sub-fab，也不能假設每套 PCW 僅供應單一樓層。

## 1.2 製程區域與設備分布

半導體製程設備會依製程功能、設備條件、環境需求及廠房規劃分布於不同 Bay
或區域，例如：

  ------------------------------------------------------------------------------------------------------
  製程區域                代表設備                              PCW
                                                                可能服務的設備部位（須依設備規格確認）
  ----------------------- ------------------------------------- ----------------------------------------
  Diffusion               Furnace、RTP                          電源、設備冷卻單元、熱交換器

  Etch                    Dry Etcher、Plasma Etcher             Chamber、RF Generator、Pump、電源

  Photo                   Scanner、Stepper、Coater、Developer   設備冷卻單元、熱交換器及周邊設備

  CVD                     LPCVD、PECVD                          RF、腔體周邊、Pump、電源

  PVD                     Sputter                               Cathode、電源及設備冷卻單元

  CMP                     Polisher、Cleaner                     馬達、主軸及設備冷卻單元

  Wet Process             Wet Bench、Cleaner                    化學液溫控及設備熱交換器

  Implant                 Ion Implanter                         離子源、電源、真空及設備冷卻單元
  ------------------------------------------------------------------------------------------------------

以上是製程設備與 PCW 可能關聯的功能示例，不代表每一台設備都直接使用廠務
PCW。部分設備可能使用內部
Chiller、二次側冷卻迴路或專用溫控設備；實際連接方式應以設備 Utility
Requirement、Hook-up 圖及 P&ID 為準。

## 1.3 雙層 Fab 的 PCW 垂直與水平供應概念

典型邏輯關係：

``` text
                    Fab / 生產樓層
+------------------------------------------------------+
| Diffusion Bay | Etch Bay | Photo Bay | CVD / PVD Bay |
|      |             |           |            |         |
|  Tool Branch  Tool Branch  Tool Branch  Tool Branch  |
+------|-------------|-----------|------------|---------+
       |             |           |            |
       |       Vertical Riser / Utility Chase |
=======|=============|===========|============|=========
                    Sub-fab / 支援樓層
       |             |           |            |
   Branch Header  Branch Header  Branch Header
       |             |           |            |
       +-------------+-----------+------------+
                             |
                    PCW Supply / Return
                             |
               Pump / Heat Exchanger / Filter
                    Utility Equipment Area
```

圖示為概念圖，實際 PCW 主機位置、垂直幹管、樓層分支及供回水路徑應依現場
P&ID、管路配置圖及設備 Hook-up 圖核對。

## 1.4 為何需要多套 PCW 系統？

本研究設定現場運行 8 套獨立 PCW
系統（PCW01～PCW08），各自供應不同製程區域或設備群。採用多套獨立系統可能具有下列工程目的：

1.  **負載分區：**
    不同製程設備的冷卻負載、流量與壓力需求不同，可透過分區降低單一供水系統承擔的負載範圍。
2.  **壓力與流量控制：**
    不同樓層、管路長度、高程、設備數量及壓降可能不同，分區供水可讓各系統依其設計條件控制。
3.  **製程條件隔離：**
    將不同設備群或不同需求的冷卻迴路分開管理，降低一個區域的操作變化對其他區域的影響。
4.  **維修隔離：**
    若系統設計具備適當隔離閥及備援能力，可在維修時縮小受影響範圍。
5.  **供應可靠性：**
    多套系統有機會降低單一設備或單一管路故障的影響範圍，但是否真正具備冗餘，仍須確認是否有備用
    Pump、備用熱交換器、交叉連通及備援電源。
6.  **監控可追溯性：** 每套 PCW 可建立獨立 Sensor、Baseline、Alarm
    Limit、事件及模型結果，便於異常定位。

**論文必須採取的嚴謹說法：** 本研究以現有 8 套獨立 PCW
系統作為監控對象，並以分區供應、負載管理及降低故障影響範圍作為其工程配置的合理性說明。由於目前尚未提供完整
P&ID、設備負載計算、泵浦曲線及備援設計資料，不能宣稱本研究已完成 8
套系統的最佳化設計，也不能僅憑系統數量證明其必然比單一系統安全。

## 1.5 8 套 PCW 與製程區域的關係

目前已確認：

-   PCW01～PCW08 是 8 套獨立 PCW 系統。
-   每套系統供應不同區域或設備群。
-   尚未提供每套 PCW 的確切樓層、Process Area、設備清單及支管拓撲。

因此論文應先採用下列中性表示：

  PCW 系統   系統屬性   樓層     Process Area   Equipment Group
  ---------- ---------- -------- -------------- -----------------
  PCW01      獨立系統   待確認   待確認         待確認
  PCW02      獨立系統   待確認   待確認         待確認
  PCW03      獨立系統   待確認   待確認         待確認
  PCW04      獨立系統   待確認   待確認         待確認
  PCW05      獨立系統   待確認   待確認         待確認
  PCW06      獨立系統   待確認   待確認         待確認
  PCW07      獨立系統   待確認   待確認         待確認
  PCW08      獨立系統   待確認   待確認         待確認

不可自行將 PCW01 指定為 Diffusion、PCW02 指定為 Etch
等，除非有現場文件支持。

------------------------------------------------------------------------

# 2. 8 套 PCW 的資料與監控規模

## 2.1 目前研究規模

  項目                                       數量／頻率
  -------------------------------------- --------------
  獨立 PCW 系統                                    8 套
  PCW 編號                                 PCW01～PCW08
  每套規劃支管配對                             約 20 組
  支管配對總數                                約 160 組
  PT（若每組 Supply / Return 各 1 支）        約 320 支
  原始資料更新                                 每秒一次
  AI 分析排程                                每分鐘一次

**重要數量界線：** 目前 320 支 PT 是依「160 組 Supply / Return
配對，每組兩支 PT」的研究規劃計算。FT、DP Sensor
的實際總數尚未由使用者提供，不能將 320 誤稱為 PT + FT + DP 全部 Sensor
總數。正式系統應以 Tag 清冊為準。

## 2.2 參數群組

參數群組只代表目前提供的設定值相同，不代表系統之間互通或具有相同水力特性。

  群組   PCW              PT Baseline   FT Baseline   DP Baseline
  ------ -------------- ------------- ------------- -------------
  G1     PCW01、PCW02             1.5           180           0.3
  G2     PCW03、PCW04             1.9           180           0.3
  G3     PCW05、PCW06             2.5           260           0.3
  G4     PCW07、PCW08             2.2           240           0.3

所有數值的工程單位仍須由現場資料確認。

------------------------------------------------------------------------

# 3. Modbus 模擬資料、SCADA 與非真實數據說明

## 3.1 為何使用模擬數據？

本研究無法直接使用真實 Fab 生產資料，主要限制為：

-   生產設備及廠務系統涉及資訊安全與營運機密。
-   不宜為學術實驗直接連接或操作生產中的 PLC、SCADA、Sensor。
-   研究電腦不具備現場完整 SCADA、PLC 與 Historian 環境。
-   真實設備資料的取得、去識別化、授權及跨系統介接需要額外程序。

因此，本研究使用 Modbus 模擬器建立可控制的虛擬 Sensor
資料來源。資料是**模擬值（Synthetic / Simulated
Data）**，不是從真實生產設備即時擷取，也不是已驗證的現場歷史數據。

## 3.2 模擬架構

``` text
+---------------------------------------------------------+
|                 PCW Sensor Simulator                    |
|  PCW01 ... PCW08                                        |
|  PT / FT / DP values                                    |
|  Normal / Drift / Ramp / Step / Noise / Missing cases   |
+---------------------------+-----------------------------+
                            |
                       Modbus TCP
                            |
                            v
+---------------------------------------------------------+
|             Modbus Server / Slave Simulator             |
|  Holding Registers / Input Registers                    |
|  Register Map: PCW ID, Tag ID, Value, Quality, Status   |
+---------------------------+-----------------------------+
                            ^
                            | Polling / Read
                            |
+---------------------------+-----------------------------+
|                    SCADA / Modbus Client                 |
|  Device Driver -> Tags -> Live Display -> Alarm Engine  |
+---------------------------+-----------------------------+
                            |
                  Historian / SQL Database
                            |
                +-----------+------------+
                |                        |
                v                        v
          Real-time Alarm          1-minute Scheduler
                                         |
                                  Feature Engineering
                                         |
                                  Drift Detection
                                         |
                                  Time-to-Limit Forecast
                                         |
                                  Result Tables / HMI
```

此處的 Modbus Server/Slave 是資料模擬端；SCADA 端扮演 Modbus
Client/Master，定期讀取暫存器。實際 Modbus
裝置角色及功能碼應依使用的模擬器與 SCADA Driver 設定確認。

## 3.3 模擬器產生什麼資料？

每一個 Sensor Tag 產生具時間戳的數值，例如：

-   PT：壓力值。
-   FT：流量值。
-   DP：差壓值。
-   Quality：資料品質狀態。
-   Scenario：目前模擬情境。
-   Source Timestamp：模擬器產生資料的時間。

模擬資料應依各 PCW 的設定 Baseline 與 Limit 產生，而不是讓所有 Sensor
使用同一個中心值。

## 3.4 模擬情境設計

  情境             數學／資料行為          驗證目的
  ---------------- ----------------------- ----------------------
  Normal           Baseline 附近隨機波動   正常誤報率
  Slow Drift       均值逐步偏移            提前偵測漸進偏移
  Linear Ramp      數值持續上升或下降      越限時間預測
  Step Change      短時間突然跳變          突變反應能力
  Noise Increase   波動程度逐步增加        波動型異常
  Missing Data     部分時間點缺值          品質檢查與模型保護
  Stale Data       時間戳停止更新          資料逾時偵測
  Sensor Spike     單點異常尖峰            離群值處理與警報邏輯
  Recovery         異常後逐步回復          解除條件及恢復判斷

情境參數、注入起始時間、持續時間及真實標籤（Ground
Truth）必須保存，以供測試評估。若只產生隨機數據而沒有情境標籤，便難以計算偵測率、誤報率及
Lead Time。

## 3.5 模擬值的產生公式

以 Sensor (i) 在時間 (t) 的值為例：

\[ x_i(t)=B_i+d_i(t)+`\epsilon`{=tex}\_i(t) \]

其中：

-   (B_i)：該 Sensor 的設定 Baseline。
-   (d_i(t))：情境注入項，例如 Drift 或 Ramp。
-   (`\epsilon`{=tex}\_i(t))：隨機雜訊。
-   (x_i(t))：模擬 Sensor 值。

正常情境可設定：

\[
d_i(t)=0,`\quad `{=tex}`\epsilon`{=tex}\_i(t)`\sim `{=tex}`\mathcal{N}`{=tex}(0,`\sigma`{=tex}\_i\^2)
\]

漸進偏移情境可設定：

\[ d_i(t)=r_i(t-t_0),`\quad `{=tex}t`\geq `{=tex}t_0 \]

線性趨勢情境可設定：

\[ x_i(t)=B_i+b_i(t-t_0)+`\epsilon`{=tex}\_i(t) \]

其中 (r_i) 或 (b_i) 是實驗情境參數，不是現場實測故障速率。

## 3.6 Modbus 暫存器規劃示例

以下只是建議的 Register Map 示意，正式位址、資料型別、Byte Order、Word
Order、縮放倍率及功能碼必須依模擬器與 SCADA Driver 一致設定。

  Register 區段   示意內容                       資料型別
  --------------- ------------------------------ ----------------------
  0001--0008      PCW System Status              UINT16
  0101--...       Sensor Value                   FLOAT32 或縮放 INT32
  1001--...       Sensor Quality                 UINT16
  2001--...       Scenario ID                    UINT16
  3001--...       Sequence / Timestamp Counter   UINT32

若使用 32-bit 浮點數，通常需要佔用兩個 16-bit
Register；必須確認高低字順序。也可使用整數縮放，例如將 1.523 bar 轉成
1523，縮放倍率為 1000，但此處僅為示例，不能在工程單位未確認前固定採用。

## 3.7 論文中應如何描述「非真實數據」

建議使用下列正式文字：

> 受限於半導體生產環境之資訊安全、設備連線權限及營運資料保密要求，本研究未直接連接實際生產線
> PLC、SCADA 或現場 Sensor，亦未取得可供本研究使用之完整真實 PCW
> 歷史資料。因此，本研究建置 Modbus 通訊模擬環境，依據研究設定之 PCW
> 系統參數、Sensor Baseline、Alarm Limit
> 與可控異常情境，產生合成時序資料。模擬資料經 SCADA
> 通訊介面讀取後，寫入歷史資料庫，再供偏移偵測及越限時間預測模型分析。此方法用於驗證資料流、系統整合、模型計算及預警邏輯，不代表模擬數據等同於實際生產設備量測值。模型於真實
> Fab 的泛化能力，仍須待取得經授權之現場資料後進行外部驗證。

------------------------------------------------------------------------

# 4. 模型一：Drift Detection（偏移偵測）

## 4.1 模型目的

Drift Detection 要回答：

**「Sensor 的目前行為是否已經偏離原本正常運轉的參考狀態？」**

它不等同於 HI/LO Alarm。Sensor 可能尚未超過 HI 或
LO，但其平均水準、波動或趨勢已經逐步改變，因此有機會在即時警報觸發前提供預警。

本研究 V1.x
採統計式候選模型，使用歷史參考視窗與近期觀測視窗比較中心位置及波動程度。模型輸出是行為偏移訊號，不直接診斷設備故障原因。

## 4.2 變數定義

令：

-   (x_t)：時間 (t) 的有效 Sensor 觀測值。
-   (W_r)：歷史參考視窗（Reference Window）。
-   (W_c)：近期觀測視窗（Current Window）。
-   (m_r)：歷史參考視窗中位數。
-   (MAD_r)：歷史參考視窗的 Median Absolute Deviation。
-   (`\epsilon`{=tex})：避免分母為零的極小正數。
-   (D_t)：標準化中心偏移分數。
-   (R_t)：近期波動程度相對歷史波動程度的比值。
-   (b_t)：近期趨勢斜率。

## 4.3 歷史參考中心與尺度

歷史參考中位數：

\[ m_r=`\operatorname{median}`{=tex}(W_r) \]

歷史 MAD：

\[
MAD_r=`\operatorname{median}`{=tex}(\|x_j-m_r\|),`\quad `{=tex}x_j`\in `{=tex}W_r
\]

以常態分布一致性係數轉換為穩健尺度估計：

\[ s_r=1.4826`\times `{=tex}MAD_r \]

若 (s_r) 太小或為 0，使用經驗證的下限 (`\epsilon`{=tex})：

\[ s_r\^{\*}=`\max`{=tex}(1.4826MAD_r,`\epsilon`{=tex}) \]

(`\epsilon`{=tex}) 必須依 Sensor
解析度、工程單位及正常波動設定，不應任意套用一個適用所有 Sensor 的數值。

## 4.4 中心偏移分數

近期視窗中位數：

\[ m_t=`\operatorname{median}`{=tex}(W_c) \]

標準化偏移分數：

\[ `\boxed{
D_t=\frac{|m_t-m_r|}{\max(1.4826MAD_r,\epsilon)}
}`{=tex} \]

解讀：

-   (D_t) 越大，代表近期中心位置相對歷史正常狀態偏移越明顯。
-   絕對值使模型可偵測正向與負向偏移。
-   偏移方向另外計算：

\[ Direction_t=`\operatorname{sign}`{=tex}(m_t-m_r) \]

其中 +1 表示正向偏移，-1 表示負向偏移，0 表示中心位置無差異。

## 4.5 波動變化分數

近期 MAD：

\[
MAD_t=`\operatorname{median}`{=tex}(\|x_j-m_t\|),`\quad `{=tex}x_j`\in `{=tex}W_c
\]

波動比值：

\[ `\boxed{
R_t=\frac{MAD_t+\epsilon}{MAD_r+\epsilon}
}`{=tex} \]

-   (R_t\>1)：近期波動程度高於歷史參考。
-   (R_t\<1)：近期波動程度低於歷史參考。
-   (R_t`\approx 1`{=tex})：波動程度接近歷史參考。

若歷史 MAD 非常接近零，應改用經過校正的尺度下限或 Sensor
解析度，不宜單靠比值判斷。

## 4.6 趨勢斜率特徵

在近期視窗中，對時間索引與 Sensor 數值執行線性最小平方法：

\[ x_j=`\alpha`{=tex}\_t+b_t`\tau`{=tex}\_j+e_j \]

其中：

-   (`\tau`{=tex}\_j)：相對時間（建議使用秒或分鐘）。
-   (b_t)：近期趨勢斜率，單位為工程單位／秒或工程單位／分鐘。
-   (e_j)：殘差。

斜率公式：

\[ `\boxed{
b_t=
\frac{\sum_j(\tau_j-\bar{\tau})(x_j-\bar{x})}
{\sum_j(\tau_j-\bar{\tau})^2}
}`{=tex} \]

正斜率代表數值上升，負斜率代表數值下降。斜率必須與 Sensor
物理意義及目標限值方向一起解讀。

## 4.7 Drift 判定規則

可採用多條件候選規則：

\[ Candidate_t= (D_t\>`\theta`{=tex}\_D)
`\lor`{=tex}(R_t\>`\theta`{=tex}\_R) \]

再加入持續性條件：

\[ DriftFlag_t= `\mathbb{1}`{=tex} `\left[
\sum_{k=0}^{K-1}Candidate_{t-k}\geq K_{min}
\right]`{=tex}\]

其中：

-   (`\theta`{=tex}\_D)：中心偏移門檻。
-   (`\theta`{=tex}\_R)：波動比值門檻。
-   (K)：觀察最近幾次模型執行。
-   (K\_{min})：至少需符合幾次才正式標記 Drift。
-   (`\mathbb{1}`{=tex}\[`\cdot`{=tex}\])：條件成立為 1，否則為 0。

這些參數應透過 Training / Validation 資料選定，不能直接把 HI、LO Alarm
Limit 當作 (`\theta`{=tex}\_D) 或 (`\theta`{=tex}\_R)。

## 4.8 Drift 輸出欄位

  欄位               意義
  ------------------ --------------
  drift_flag         是否判定偏移
  drift_score        (D_t)
  volatility_ratio   (R_t)
  direction          正向／負向
  slope              近期趨勢斜率
  reference_window   參考視窗設定
  current_window     近期視窗設定
  quality_status     資料品質狀態
  model_version      模型版本
  valid_until        結果有效期限

## 4.9 Drift 模型限制

-   中位數與 MAD 對離群值較穩健，但無法保證所有非平穩製程均適用。
-   參考視窗若混入異常或警報後資料，可能污染正常基準。
-   漸進偏移與正常操作模式切換可能難以區分。
-   單一 Sensor 的 Drift 不足以診斷設備故障。
-   Sensor 品質不佳時應輸出 `UNKNOWN` 或
    `INSUFFICIENT_DATA`，不能硬判為正常。

------------------------------------------------------------------------

# 5. 模型二：Forecast / Time-to-Limit（趨勢與越限時間預測）

## 5.1 模型目的

Forecast 要回答：

**「依照目前有效趨勢，Sensor 可能還要多久到達已設定的 HI 或 LO
限值？」**

本研究 V1.x
採近期視窗線性趨勢模型作為基準方法。模型以目前時間點的估計值與趨勢斜率，計算到達目標限值的理論時間。

此模型是短期局部外推，不代表長期製程預測，也不代表一定會發生越限。

## 5.2 線性回歸模型

對近期視窗資料建立：

\[ `\boxed{x(\tau)=a+b\tau}`{=tex} \]

其中：

-   (x(`\tau`{=tex}))：時間 (`\tau`{=tex}) 的估計 Sensor 值。
-   (a)：截距。
-   (b)：斜率。
-   (`\tau`{=tex})：時間，建議統一使用秒或分鐘。

以最小平方法估計：

\[ b=`\frac{\sum_j(\tau_j-\bar{\tau})(x_j-\bar{x})}`{=tex}
{`\sum`{=tex}\_j(`\tau`{=tex}\_j-`\bar`{=tex}{`\tau`{=tex}})\^2} \]

\[ a=`\bar`{=tex}{x}-b`\bar`{=tex}{`\tau`{=tex}} \]

當前時間點的預測起點應使用模型在當前時間的估計值，或明確定義為最新有效量測值。實作時兩者必須固定，避免時間計算不一致。

## 5.3 預測 HI 越限時間

若目標為 HI，且趨勢斜率 (b\>0)，表示數值正往高限移動：

\[ x(t)=x_0+bt \]

令 (x(t)=HI)：

\[ HI=x_0+bt \]

因此：

\[ `\boxed{T_{HI}=\frac{HI-x_0}{b},\quad b>0,\ HI>x_0}`{=tex} \]

## 5.4 預測 LO 越限時間

若目標為 LO，且趨勢斜率 (b\<0)，表示數值正往低限移動：

\[ LO=x_0+bt \]

因此：

\[ `\boxed{T_{LO}=\frac{LO-x_0}{b},\quad b<0,\ LO<x_0}`{=tex} \]

因分子與分母皆為負值，結果為正時間。

## 5.5 預測有效性條件

必須同時檢查：

1.  Sensor 資料品質足夠。
2.  視窗內有效資料點數達到最低要求。
3.  回歸斜率方向確實朝向目標限值。
4.  目標限值尚未被目前數值越過；若已越限，應回報現況警報，不應輸出負的預測時間。
5.  擬合品質達到驗證後的最低標準。
6.  預測時間落在設定的有效預測範圍內。
7.  趨勢持續性足夠，且不是單一尖峰造成。

若斜率方向背離目標限值，輸出 `NO_VALID_APPROACH`，而不是無限大或負時間。

若目前已達或超過目標限值，輸出 `ALREADY_CROSSED`，並交由即時 Alarm
Engine 處理。

## 5.6 回歸品質

可使用決定係數：

\[ R\^2=1-`\frac{\sum_j(x_j-\hat{x}_j)^2}`{=tex}
{`\sum`{=tex}\_j(x_j-`\bar`{=tex}{x})\^2} \]

但 (R\^2) 不應單獨作為預測可信度。當資料變異很小或趨勢非線性時，(R\^2)
可能產生誤導。建議同時檢查：

-   有效資料點數。
-   斜率標準誤。
-   殘差尺度（RMSE 或 MAE）。
-   斜率方向及穩定性。
-   預測時間是否超出合理 horizon。
-   最近視窗與前一視窗斜率是否劇烈變動。

## 5.7 預測輸出

  欄位                      說明
  ------------------------- ----------------------
  target_limit              HI / LO
  target_limit_value        目標門檻數值
  current_value             當前量測或模型起點
  slope                     斜率
  prediction_seconds        預測秒數
  predicted_crossing_time   預測越限時間
  fit_quality               回歸品質指標
  confidence_status         可用／低信心／不可用
  quality_status            Sensor 資料品質
  model_version             模型版本
  valid_until               預測結果有效期限

## 5.8 DP 的預測限制

目前 DP 僅提供 HIHI=0.6、HI=0.5、Baseline=0.3，未提供 LO、LOLO。因此：

-   可評估朝 HI 或 HIHI 的高限預測。
-   不可自行產生低限預測。
-   低限目標應標示 `NOT_CONFIGURED`。
-   DP 是否需要低限，須由實際系統功能及工程設計確認。

------------------------------------------------------------------------

# 6. 資料處理與特徵工程（Feature Engineering）

## 6.1 資料處理流程

``` text
Modbus Raw Registers
        |
        v
Decode / Scale / Unit Conversion
        |
        v
Timestamp Alignment
        |
        v
Quality Check
        |
        v
Missing / Duplicate / Stale Handling
        |
        v
Sensor-specific Time Series
        |
        v
Rolling Window Construction
        |
        +---------------------------+
        |                           |
        v                           v
Drift Features               Forecast Features
        |                           |
        v                           v
Drift Detection              Linear Trend Regression
        |                           |
        +-------------+-------------+
                      |
                      v
              Result Validation
                      |
                      v
                SQL Result Tables
```

## 6.2 資料品質檢查

每筆資料至少檢查：

-   Tag ID 是否存在於 Sensor 清冊。
-   PCW ID 是否與 Tag 對應。
-   時間戳是否有效、是否重複。
-   Modbus 解碼及縮放是否正確。
-   數值是否為 NaN、Inf 或超出儀表工程量程。
-   Quality Flag 是否有效。
-   是否超過資料逾時門檻。
-   是否出現不合理的瞬間跳變。

**不要將所有超出 HI/LO 的值直接刪除。**
真正越限的數據是重要事件證據，應保留原始值並標記 Alarm
狀態。只有確認為通訊錯誤、解碼錯誤或無效量測的資料，才依規則排除模型計算。

## 6.3 缺值與資料中斷

建議分別處理：

  狀況           建議處理
  -------------- ----------------------------------------
  單筆短暫缺值   保留缺值標記；是否插值須依模型用途
  長時間缺值     不產生新的有效預測
  重複時間戳     依來源序號或收件時間處理
  時間戳亂序     排序並保留原始來源時間
  通訊中斷       記錄 Data Quality Event
  資料恢復       標記恢復時間，檢查是否補資料及重複寫入

對 Forecast
而言，不應將長時間缺值以線性插值補成連續趨勢，否則可能製造不存在的斜率。

## 6.4 時間視窗

建議至少定義兩種視窗：

-   Reference Window：用於建立正常行為參考。
-   Current Window：用於計算目前偏移與趨勢。

視窗長度應依取樣頻率、製程變化速度與驗證結果選擇。每秒資料並不代表所有模型都必須使用固定相同的秒數視窗。可透過實驗比較不同視窗長度對偵測延遲、誤報率與預測誤差的影響。

## 6.5 建議特徵清單

  特徵                 公式／定義                 用途
  -------------------- -------------------------- ------------------
  raw_value            (x_t)                      原始值
  baseline_deviation   (x_t-B_i)                  相對設定基準偏移
  relative_deviation   ((x_t-B_i)/`\max`{=tex}(   B_i
  rolling_mean         視窗平均                   中心變化
  rolling_median       視窗中位數                 穩健中心
  rolling_std          視窗標準差                 波動程度
  rolling_MAD          視窗 MAD                   穩健波動尺度
  slope                線性回歸斜率               上升／下降趨勢
  delta                (x_t-x\_{t-1})             瞬時變化
  rate_of_change       單位時間變化率             變化速度
  D_score              標準化中心偏移             Drift
  volatility_ratio     近期／歷史 MAD 比值        波動變化
  distance_to_HI       (HI-x_t)                   距離高限
  distance_to_LO       (x_t-LO)                   距離低限
  quality_ratio        有效資料比例               模型可用性

注意：若 Baseline 為 0 或非常接近
0，相對偏移特徵需使用適當分母下限；不能直接除以零。

## 6.6 Supply / Return 配對特徵

僅在確認兩支 PT 確實屬於同一支管路的供回水配對後，才建立：

\[ `\Delta `{=tex}P_t=P\_{supply,t}-P\_{return,t} \]

可計算：

-   Supply 壓力相對自身 Baseline 的偏移。
-   Return 壓力相對自身 Baseline 的偏移。
-   (`\Delta `{=tex}P) 的變化趨勢。
-   兩側偏移方向是否一致。
-   供回水時間戳是否對齊。

(`\Delta `{=tex}P)
是壓力差，不是流量，也不能單獨證明堵塞、洩漏或水力失衡。不同獨立 PCW
系統之間不可因為 Tag 名稱相似而配對。

## 6.7 資料切分與避免洩漏

採時間序列切分，而非隨機打散：

``` text
Earlier Time                         Later Time
|----------- Train -----------|-- Gap --|-- Validation --|-- Gap --|--- Test ---|
```

-   Training：建立參考基準、初步選擇模型參數。
-   Validation：選擇
    (`\theta`{=tex}\_D)、(`\theta`{=tex}\_R)、視窗長度、持續性條件及預測品質門檻。
-   Test：只在模型與參數固定後進行最終評估。
-   Gap：至少涵蓋會造成重疊的最大特徵視窗，避免相鄰資料跨集合洩漏。

正常參考資料應來自經確認的正常時段。若研究規則要求只使用正常狀態與即時警報前的資料，則即時警報後直到恢復正常的區段應排除於正常參考建構之外。訓練、驗證、測試的標籤定義需一致。

------------------------------------------------------------------------

# 7. PT / FT / DP 的 HI / LO Alarm Limit 設定

## 7.1 現有設定值

以下數值忠實沿用目前系統提供設定，並非本研究自行推導的半導體產業標準值。工程單位尚待確認。

### G1：PCW01、PCW02

  Sensor     HIHI    HI   Baseline       LO     LOLO
  -------- ------ ----- ---------- -------- --------
  PT          1.8   1.7        1.5      1.3      1.2
  FT          220   200        180      160      150
  DP          0.6   0.5        0.3   未提供   未提供

### G2：PCW03、PCW04

  Sensor     HIHI    HI   Baseline       LO     LOLO
  -------- ------ ----- ---------- -------- --------
  PT          2.2   2.1        1.9      1.7      1.5
  FT          220   200        180      160      150
  DP          0.6   0.5        0.3   未提供   未提供

### G3：PCW05、PCW06

  Sensor     HIHI    HI   Baseline       LO     LOLO
  -------- ------ ----- ---------- -------- --------
  PT          2.8   2.7        2.5      2.3      2.2
  FT          300   280        260      240      230
  DP          0.6   0.5        0.3   未提供   未提供

### G4：PCW07、PCW08

  Sensor     HIHI    HI   Baseline       LO     LOLO
  -------- ------ ----- ---------- -------- --------
  PT          2.5   2.4        2.2      2.0      1.9
  FT          280   260        240      220      200
  DP          0.6   0.5        0.3   未提供   未提供

## 7.2 Limit 設定依據應如何交代？

正式工程警報限值通常應依據多項資料決定：

1.  設備供應商的 Utility Requirement 與允許工作範圍。
2.  製程設備入口／出口的最低及最高壓力、流量、差壓要求。
3.  PCW Pump、Heat Exchanger、Valve、管路及儀表的設計能力。
4.  P&ID、設備 Hook-up 圖及管路水力計算。
5.  正常操作歷史資料及不同設備負載情境。
6.  製程工程師、廠務及設備供應商核准的 Alarm Philosophy。
7.  儀表量程、精度、校正及警報遲滯設定。

本研究目前取得的是系統現行設定數值，尚未取得上述完整工程文件。因此論文應說明「模型沿用既有設定值作為警報參考與模擬情境參數」，不可宣稱已重新計算或證明這些值是最佳工程限值。

## 7.3 HIHI、HI、LO、LOLO 的意義

-   HIHI：高高限，通常代表更嚴重的高側異常狀態。
-   HI：高限，代表數值超過正常操作上界。
-   LO：低限，代表數值低於正常操作下界。
-   LOLO：低低限，通常代表更嚴重的低側異常狀態。

警報門檻應依系統工程規格定義觸發、延遲、遲滯、解除及鎖存邏輯。不同系統可有不同限值，不應為了模型方便而統一成同一組數值。

## 7.4 Alarm Limit 與 Drift Threshold 不同

  項目                         依據                     功能
  ---------------------------- ------------------------ ------------------
  HIHI / HI / LO / LOLO        工程設計與設備操作限制   即時警報
  Baseline                     正常操作參考             參考中心
  Drift Threshold              Training / Validation    統計偏移判斷
  Forecast Quality Threshold   Validation               預測結果可用性
  Forecast Horizon             研究目的與驗證           限制預測時間範圍

------------------------------------------------------------------------

# 8. Baseline 與 PCW 冷卻水供應的工程意義

## 8.1 先區分三種量測物理量

本研究目前提供的 Baseline：

-   PT：壓力基準。
-   FT：流量基準。
-   DP：差壓基準。

這些數值**不是冷卻水溫度設定值**。若要說明 PCW
供水溫度，必須另有供水溫度與回水溫度 Sensor（例如
TT），以及設備允許的溫度範圍。

PCW
的冷卻效果取決於流量、供回水溫度差、設備熱負載、熱交換器效率及設備內部流道等條件。單靠
PT、FT、DP Baseline 不能完整證明冷卻能力。

## 8.2 PT Baseline：壓力

PT Baseline 代表指定量測位置在參考操作條件下的壓力中心值。

若壓力過低，可能的工程疑慮包括：

-   設備入口壓力不足。
-   供水末端或高程較高區域壓力不足。
-   管路流量可能下降（但壓力本身不能直接等同流量）。
-   某些設備內部控制閥或熱交換器可能無法在規格條件下運作。
-   若低壓伴隨補水不足、漏水或泵浦異常，可能影響供水穩定性。

若壓力過高，可能的工程疑慮包括：

-   超出設備或管路允許工作壓力。
-   閥件、接頭、軟管及密封件承受較高機械負荷。
-   可能產生較高流速、噪音或控制閥調節問題，實際結果取決於管路阻力與控制方式。

因此 PT 的 HI/LO 必須依量測位置及設備允許壓力確認。主管 PT 與設備入口 PT
不應在未校正位置差異前直接比較。

## 8.3 FT Baseline：流量

FT Baseline 代表指定量測點的參考流量。

流量過低可能造成：

-   設備熱量帶走能力不足。
-   熱交換器或設備冷卻通道冷卻效果下降。
-   設備溫度上升或溫控偏離。
-   部分設備觸發低流量保護或停止製程。

流量過高可能造成：

-   超出設備、閥件或管路設計流量。
-   壓降、泵浦負載及能耗增加。
-   流速、振動、噪音或侵蝕風險可能提高，需依管材與設計條件評估。
-   控制閥調節範圍或設備內部流道可能不符合設計條件。

但流量過高不必然代表冷卻效果更好；需搭配供回水溫差、熱負載及設備廠商規格判斷。

## 8.4 DP Baseline：差壓

DP 代表兩個取壓點間的壓力差。

差壓過高可能與下列情況有關，但不能僅憑 DP 直接診斷：

-   濾網、熱交換器或流道阻力增加。
-   閥件開度或管路配置改變。
-   流量增加造成壓降上升。
-   取壓管或儀表本身異常。

差壓過低可能代表：

-   流量不足或泵浦壓差不足。
-   閥件狀態改變。
-   旁通路徑或管路配置改變。
-   儀表取壓或感測器故障。

DP 的意義取決於取壓點。若 DP
是濾網前後差壓，解讀方式與供回水主管差壓不同。現有系統只提供 DP
高限，低限是否必要須依量測目的確認。

## 8.5 冷卻能力的基本熱平衡

水側移除熱量的基本關係：

\[ `\boxed{\dot Q=\dot m c_p(T_{return}-T_{supply})}`{=tex} \]

其中：

-   (`\dot `{=tex}Q)：水側移除熱功率（W）。
-   (`\dot `{=tex}m)：質量流率（kg/s）。
-   (c_p)：水的比熱容（J/(kg·K)）。
-   (T\_{return})：回水溫度。
-   (T\_{supply})：供水溫度。

若使用體積流率：

\[ `\dot `{=tex}m=`\rho `{=tex}`\dot `{=tex}V \]

所以：

\[ `\dot `{=tex}Q=`\rho`{=tex}`\dot `{=tex}V c_p`\Delta `{=tex}T \]

此公式說明冷卻能力不只取決於壓力，還與流量及供回水溫差有關。若本研究沒有
TT 溫度資料，就不能計算實際熱移除量，也不能只用 PT/FT/DP
宣稱已驗證設備冷卻能力。

## 8.6 為什麼供水規格不能任意過高或過低？

PCW
的供水規格是壓力、流量、溫度及水質等條件的組合，應滿足設備供應商要求及系統設計範圍。

-   壓力過低：可能無法滿足末端設備所需壓力及流量。
-   壓力過高：可能超出元件承壓或控制閥工作範圍。
-   流量過低：可能無法帶走設備熱負載。
-   流量過高：可能增加壓降、泵浦能耗及機械負荷。
-   供水溫度過高：冷卻溫差與可用冷卻能力可能不足，且設備溫控可能超規。
-   供水溫度過低：可能造成設備溫控不穩、局部結露或超出設備允許溫度範圍；實際風險須依環境露點、管路保溫與設備規格判斷。

**重要：** 本研究目前沒有提供 PCW 供水溫度規格，不能將 PT、FT、DP 的
Baseline
直接解讀為「冷水溫度」。若論文要回答「水太冷或太熱有何疑慮」，應明確說明溫度是另一個量測維度，並列為後續可擴充的
TT 感測資料。

## 8.7 目前 Baseline 的研究用途

  ------------------------------------------------------------------------------
  Sensor                   目前 Baseline 可用於研究的意義     不能單獨證明
  ---------------- --------------------- -------------------- ------------------
  PT                 依 PCW 群組為 1.5 / 壓力相對參考值偏移   設備實際冷卻能力
                         1.9 / 2.5 / 2.2                      

  FT                 依 PCW 群組為 180 / 流量相對參考值偏移   熱移除功率
                         180 / 260 / 240                      

  DP                                 0.3 差壓相對參考值偏移   堵塞或故障原因
  ------------------------------------------------------------------------------

工程單位未確認前，這些數字只能作為無單位標示的設定數值或待確認工程值，不應在論文中擅自加上
bar、L/min 或其他單位。

------------------------------------------------------------------------

# 9. 程式實作畫面與核心程式範例

以下程式片段是論文可展示的演算法核心示意，不代表已連接現場 PLC、真實
SCADA
或生產設備。實際專案應補上資料庫介面、錯誤處理、設定載入、日誌、版本管理與測試。

## 9.1 程式模組建議

``` text
pcw_early_warning/
|
+-- app.py
+-- config/
|   +-- pcw_systems.yaml
|   +-- sensor_limits.yaml
|   +-- modbus_register_map.yaml
|
+-- simulator/
|   +-- sensor_generator.py
|   +-- modbus_server.py
|   +-- scenario_injector.py
|
+-- acquisition/
|   +-- modbus_client.py
|   +-- tag_processor.py
|   +-- quality_check.py
|
+-- features/
|   +-- window_builder.py
|   +-- feature_engineering.py
|
+-- models/
|   +-- drift_detection.py
|   +-- time_to_limit.py
|   +-- validation.py
|
+-- database/
|   +-- schema.sql
|   +-- repository.py
|
+-- dashboard/
|   +-- overview.py
|   +-- sensor_detail.py
|   +-- event_history.py
|
+-- tests/
|   +-- test_drift.py
|   +-- test_forecast.py
|   +-- test_data_quality.py
|
+-- docs/
    +-- README.md
    +-- SAT.md
```

## 9.2 Sensor 設定資料示意

``` python
PCW_CONFIG = {
    "PCW01": {
        "group": "G1",
        "PT":  {"baseline": 1.5, "hihi": 1.8, "hi": 1.7,
                "lo": 1.3, "lolo": 1.2},
        "FT":  {"baseline": 180, "hihi": 220, "hi": 200,
                "lo": 160, "lolo": 150},
        "DP":  {"baseline": 0.3, "hihi": 0.6, "hi": 0.5,
                "lo": None, "lolo": None},
    },
    "PCW03": {
        "group": "G2",
        "PT":  {"baseline": 1.9, "hihi": 2.2, "hi": 2.1,
                "lo": 1.7, "lolo": 1.5},
        "FT":  {"baseline": 180, "hihi": 220, "hi": 200,
                "lo": 160, "lolo": 150},
        "DP":  {"baseline": 0.3, "hihi": 0.6, "hi": 0.5,
                "lo": None, "lolo": None},
    },
    # PCW02、04、05、06、07、08 依正式設定表補齊
}
```

正式程式應將完整 8 套設定存放於 YAML、JSON
或資料庫設定表，並加入工程單位、版本、生效時間及 Tag
ID。示意片段不是完整設定檔。

## 9.3 Drift Detection 核心程式

``` python
import numpy as np

def drift_features(reference, current, eps=1e-6):
    reference = np.asarray(reference, dtype=float)
    current = np.asarray(current, dtype=float)

    reference = reference[np.isfinite(reference)]
    current = current[np.isfinite(current)]

    if len(reference) < 20 or len(current) < 10:
        return {"quality_status": "INSUFFICIENT_DATA"}

    ref_med = np.median(reference)
    cur_med = np.median(current)

    ref_mad = np.median(np.abs(reference - ref_med))
    cur_mad = np.median(np.abs(current - cur_med))

    scale = max(1.4826 * ref_mad, eps)
    drift_score = abs(cur_med - ref_med) / scale
    volatility_ratio = (cur_mad + eps) / (ref_mad + eps)

    direction = int(np.sign(cur_med - ref_med))

    return {
        "quality_status": "VALID",
        "reference_median": float(ref_med),
        "current_median": float(cur_med),
        "drift_score": float(drift_score),
        "volatility_ratio": float(volatility_ratio),
        "direction": direction,
    }
```

此程式示範中心偏移與波動比值計算。`eps`、最少資料點、視窗長度及判定門檻應由
Sensor 解析度與 Validation
結果決定。正式版還要加入時間戳檢查、資料品質、持續性判斷與設定版本。

## 9.4 Forecast 核心程式

``` python
import numpy as np

def time_to_limit(values, timestamps_seconds, target,
                  direction, min_points=10):
    x = np.asarray(values, dtype=float)
    t = np.asarray(timestamps_seconds, dtype=float)

    valid = np.isfinite(x) & np.isfinite(t)
    x, t = x[valid], t[valid]

    if len(x) < min_points:
        return {"status": "INSUFFICIENT_DATA"}

    order = np.argsort(t)
    x, t = x[order], t[order]

    # 使用相對時間，避免大時間戳造成數值問題
    tau = t - t[-1]

    slope, intercept = np.polyfit(tau, x, 1)
    current_estimate = intercept

    if direction == "HI":
        if current_estimate >= target:
            return {"status": "ALREADY_CROSSED"}
        if slope <= 0:
            return {"status": "NO_VALID_APPROACH"}

    elif direction == "LO":
        if current_estimate <= target:
            return {"status": "ALREADY_CROSSED"}
        if slope >= 0:
            return {"status": "NO_VALID_APPROACH"}

    else:
        return {"status": "INVALID_DIRECTION"}

    seconds = (target - current_estimate) / slope

    if not np.isfinite(seconds) or seconds <= 0:
        return {"status": "INVALID_PREDICTION"}

    predicted_time = t[-1] + seconds

    return {
        "status": "VALID_CANDIDATE",
        "slope_per_second": float(slope),
        "prediction_seconds": float(seconds),
        "predicted_crossing_timestamp": float(predicted_time),
    }
```

這是數學概念的最小示範。正式模型需再加入 R²、RMSE、斜率標準誤、預測
Horizon、趨勢持續性、資料品質及有效期限。若模型擬合品質不足，應回傳
`LOW_CONFIDENCE` 或 `UNAVAILABLE`，而不是強制提供預測時間。

## 9.5 HMI 畫面規劃

### 畫面 A：Fab PCW Overview

``` text
+---------------------------------------------------------------+
| FAB PCW EARLY WARNING OVERVIEW                                |
+---------------------------------------------------------------+
| PCW01 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
| PCW02 | NORMAL | Drift: 1 | Forecast: 1 | Data: OK             |
| PCW03 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
| PCW04 | ALARM  | HI: 1    | Forecast: 2 | Data: OK             |
| PCW05 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
| PCW06 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
| PCW07 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
| PCW08 | NORMAL | Drift: 0 | Forecast: 0 | Data: OK             |
+---------------------------------------------------------------+
| Real-time Sensor Trends | Alarm Events | AI Prediction Events |
+---------------------------------------------------------------+
```

以上為畫面欄位示意，不代表目前已實際發生任何警報。

### 畫面 B：Sensor Detail

``` text
+---------------------------------------------------------------+
| PCW04 / PT Tag Detail                                         |
+---------------------------------------------------------------+
| Current Value: [simulated value]   Baseline: [configured]     |
| HIHI: [config]  HI: [config]  LO: [config]  LOLO: [config]     |
+---------------------------------------------------------------+
| Historical Trend                                              |
|                                                               |
|     Sensor Value                                              |
|          ^                                                    |
| HIHI ----|------------------------------------------------    |
| HI   ----|-----------------------------------------------     |
| Base ----|------------------ reference ------------------     |
| LO   ----|-----------------------------------------------     |
| LOLO ----|------------------------------------------------    |
|          +---------------------------------------------> Time |
+---------------------------------------------------------------+
| Drift Score | Direction | Slope | Forecast to HI/LO           |
| Quality Status | Model Version | Valid Until                  |
+---------------------------------------------------------------+
```

HMI 應明確標示 `SIMULATED DATA`，不可讓使用者誤認為真實廠務量測。

------------------------------------------------------------------------

# 10. 模型驗證與評估指標

## 10.1 Drift Detection 指標

  指標                    定義／目的
  ----------------------- -----------------------------------
  Detection Rate          已注入偏移事件中成功偵測比例
  Miss Rate               未偵測到的偏移事件比例
  False Alarm Rate        正常期間誤判偏移的頻率
  Detection Delay         偏移開始至模型首次有效偵測時間
  Lead Time               模型預警早於實際 HI/LO 越限的時間
  Event-level Precision   偵測事件中真正對應注入異常的比例

建議以事件為單位計算，不要只把每秒樣本當成獨立事件，否則會高估有效樣本量。

## 10.2 Forecast 指標

對有實際注入越限時間的情境：

\[ Error_i=`\hat{T}`{=tex}\_i-T_i \]

\[
MAE=`\frac{1}{N}`{=tex}`\sum`{=tex}\_{i=1}\^{N}\|`\hat{T}`{=tex}\_i-T_i\|
\]

\[ MedianAE=`\operatorname{median}`{=tex}(\|`\hat{T}`{=tex}\_i-T_i\|) \]

\[
Bias=`\frac{1}{N}`{=tex}`\sum`{=tex}\_{i=1}\^{N}(`\hat{T}`{=tex}\_i-T_i)
\]

其中：

-   (`\hat{T}`{=tex}\_i)：模型預測越限時間。
-   (T_i)：模擬情境實際越限時間。
-   正 Bias 表示平均預測時間較晚；負 Bias
    表示平均預測時間較早（須確認誤差定義）。

若情境沒有實際越限，不能計算該事件的越限時間
MAE；應另評估模型是否產生不必要預測。

## 10.3 比較基準

至少比較：

1.  純 HI/LO 即時警報（無提前預測）。
2.  Drift Detection 單模型。
3.  Linear Time-to-Limit 單模型。
4.  Drift + Forecast 組合方案。

可再比較不同視窗長度、不同持續性條件與不同資料品質門檻，評估誤報、漏報、偵測延遲及預測誤差的取捨。

------------------------------------------------------------------------

# 11. 系統與模型優化

## 11.1 資料流優化

-   每秒原始資料寫入與每分鐘 AI 計算分離。
-   SCADA 負責 Modbus 輪詢、Tag 顯示及即時警報。
-   Historian/SQL 保存原始時序資料及事件。
-   AI 排程程序獨立執行，不將大量模型計算放在 SCADA 輪詢循環中。
-   每次模型執行記錄 Job ID、開始／結束時間、資料截止時間及結果狀態。
-   使用唯一鍵或冪等寫入，避免排程重複造成重複結果。
-   中斷恢復後先檢查資料缺口，再決定是否補算；不得把過期預測當作即時結果。

## 11.2 模型優化

-   以 Median / MAD 降低離群值對參考統計的影響。
-   以持續性條件降低單點雜訊誤報。
-   對不同 PCW、Sensor Type、Tag 建立各自參考基準。
-   對資料不足、品質不良或趨勢方向不符的情況回傳 UNKNOWN / UNAVAILABLE。
-   以 Validation 選擇視窗與門檻，不用 Test 集調參。
-   保存模型與設定版本，確保結果可重現。
-   監控參考分布是否長期改變；若要更新
    Baseline，必須經核准並建立新版本。

## 11.3 工程資訊優化

若要讓模型從統計預警進一步接近物理狀態分析，後續可補充：

-   TT：供水與回水溫度。
-   Pump Run Status、Pump Speed。
-   Valve Position。
-   Filter / Heat Exchanger Differential Pressure。
-   設備運轉／待機狀態。
-   設備冷卻需求或負載資訊。
-   管路位置、樓層、高程與支管拓撲。

這些資料可協助區分「負載變動」、「正常模式切換」與「真正異常」，但不屬於目前僅有
PT、FT、DP 的 V1.x 已完成能力。

------------------------------------------------------------------------

# 12. 模型演進路線

## V1.x --- 統計式早期預警（本研究核心）

**Drift Detection** - Historical Reference Window。 - Median / MAD。 -
Standardized Drift Score。 - Volatility Ratio。 - Rolling Slope。 -
Persistence Rule。

**Forecast** - Rolling Linear Regression。 - HI / LO Time-to-Limit。 -
Fit Quality Check。 - Prediction Horizon。 - Quality Status。

定位：可解釋、低複雜度、可重現的統計基準模型。論文應以實驗結果驗證其效果，不應在未完成驗證前宣稱已達到最佳效能。

## V1.1 --- 穩健性與操作可靠性改善

-   更完整的缺值、離群值及資料品質處理。
-   不同視窗長度的系統化比較。
-   斜率穩定度及預測區間評估。
-   事件層級持續性與遲滯條件。
-   模型過期、排程重複與中斷恢復管理。

## V2.0 --- Machine Learning

可評估：

-   Isolation Forest：無監督異常偵測。
-   One-Class SVM：正常行為邊界建模。
-   Random Forest / XGBoost：若具備可靠標籤，可做異常分類或風險估計。
-   Gradient Boosting
    Regression：若有足夠代表性資料，可預測剩餘時間或越限時間。

前提：需有足夠且具代表性的正常／異常資料，並嚴格按時間切分。不得把模擬資料訓練出的表現直接宣稱為真實
Fab 泛化效能。

## V3.0 --- Deep Learning / Multivariate / Ensemble

可評估：

-   LSTM / GRU：序列趨勢建模。
-   Temporal Convolutional Network：時間序列特徵學習。
-   Transformer-based Time Series：較長序列與多變量關係。
-   Multivariate Anomaly Detection：整合 PT、FT、DP、TT 及設備狀態。
-   Ensemble：統計模型與 ML/DL 模型融合。

前提：資料量、標籤品質、跨設備／跨 PCW
泛化驗證及可解釋性均需達到要求。V2.0、V3.0
是未來研究方向，不是目前已完成成果。

------------------------------------------------------------------------

# 13. 論文章節整合建議

  -------------------------------------------------------------------------------------
  論文章節                            建議納入內容
  ----------------------------------- -------------------------------------------------
  第 1 章 緒論                        Fab 冷卻需求、研究問題、資訊安全限制、研究目的

  第 2 章 文獻探討                    PCW、SCADA/Modbus、時序異常偵測、Forecast 方法

  第 3 章 研究方法                    雙層 Fab 配置假設、8 套
                                      PCW、模擬資料架構、資料處理、特徵工程、數學模型

  第 4 章 系統實作                    Modbus Simulator、SCADA
                                      Tag、SQL、Scheduler、HMI、程式流程

  第 5 章 實驗與結果                  情境設計、資料切分、Drift 指標、Forecast
                                      指標、消融與參數比較

  第 6 章 結論與未來工作              模擬實驗限制、真實資料外部驗證、V2/V3 演進
  -------------------------------------------------------------------------------------

若原論文只有五章，可將系統實作整合至研究方法，並將結論與限制整合至最後一章。

------------------------------------------------------------------------

# 14. 教授 Meeting 建議回答稿

## Q1：為什麼要做 Drift Detection 和 Forecast 兩個模型？

Drift Detection 用來判斷 Sensor 是否已偏離正常參考行為，即使尚未觸發傳統
HI/LO Alarm，也可能提前發現變化。Forecast 則利用近期趨勢斜率，估計
Sensor 到達 HI 或 LO
限值所需的時間。前者回答「現在是否已經偏移」，後者回答「若趨勢持續，可能多久後越限」，兩者功能互補。

## Q2：資料處理及特徵工程做了什麼？

先將 Modbus 暫存器轉換為工程數值，完成 Tag
對應、時間戳、資料品質、缺值與重複資料檢查，再依 Sensor
建立歷史參考視窗及近期觀測視窗。特徵包含中位數、MAD、標準化偏移分數、波動比值、趨勢斜率、距離
HI/LO 的差值及資料品質指標，分別供 Drift 與 Forecast 模型使用。

## Q3：為什麼不使用真實生產數據？

生產資料涉及資訊安全、設備連線權限及營運機密，研究階段無法直接連接真實生產系統。因此以
Modbus 模擬器產生具 Baseline、Limit 與異常情境的合成資料，經 SCADA
讀取及 Historian
保存後進行模型驗證。此研究驗證的是系統流程與模型在模擬條件下的可行性，不宣稱已完成真實生產環境驗證。

## Q4：為什麼需要 8 套 PCW？

研究對象的 Fab
採雙層式配置，製程設備依製程類型、設備群、區域及樓層分布。不同區域可能有不同冷卻負載、壓力、流量及管路條件，因此以
8 套獨立 PCW 作為現有供水系統的監控單位，分別管理其
Sensor、Baseline、Alarm Limit 及異常事件。8
套系統的實際管路供應範圍與備援關係，仍以現場 P&ID 和設備清冊為準。

## Q5：HI/LO Limit 的設定依據是什麼？

目前沿用系統提供的 PT、FT、DP HIHI、HI、LO、LOLO 及 Baseline
設定，作為模擬資料生成、即時警報及 Forecast
目標門檻。正式工程限值應由設備供應商規格、PCW
設計條件、P&ID、儀表量程及現場工程核准決定。本研究不宣稱已重新計算或驗證這些設定值為最佳工程值。

## Q6：Baseline 代表什麼？冷卻水太高或太低有什麼問題？

PT Baseline 代表指定位置的參考壓力；FT Baseline 代表參考流量；DP
Baseline
代表兩個取壓點間的參考差壓。壓力過低可能使設備入口壓力或供水能力不足，壓力過高可能超出管路或設備允許範圍；流量過低可能無法帶走設備熱量，流量過高則可能增加壓降及機械負荷。真正的冷卻能力還需要供回水溫度與熱負載資訊，因此目前
PT、FT、DP Baseline 不能直接代表水溫規格。

------------------------------------------------------------------------

# 15. 研究限制與必須補齊的證據

  ------------------------------------------------------------------------------------
  項目                    目前狀態                後續必要工作
  ----------------------- ----------------------- ------------------------------------
  雙層 Fab                已知為研究背景          補樓層配置圖或概念圖來源

  8 套獨立 PCW            已確認                  補每套系統 P&ID

  PCW 與 Process Area     尚未逐套對照            補設備清冊及管路對照

  PT Baseline / Limits    已提供                  確認工程單位、量測位置及核准來源

  FT Baseline / Limits    已提供                  確認工程單位及量測位置

  DP Baseline / Limits    已提供高限              確認取壓點、正負方向及低限是否需要

  水溫規格                未提供                  若要討論冷卻溫度，補 TT
                                                  與設備溫度規格

  Modbus 模擬             研究架構                補實際 Register
                                                  Map、輪詢週期及通訊紀錄

  SCADA                   研究架構                補 Tag 畫面、趨勢、事件及資料庫證據

  Drift 模型              V1.x 候選方法           完成參數 Validation 與 Test

  Forecast 模型           V1.x 線性基準           完成預測誤差與有效性驗證

  真實場域驗證            尚未完成                未來取得授權資料後進行外部驗證
  ------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 16. 最終研究主張

本研究提出一套以雙層式 Fab 之 8 套獨立 PCW
系統為背景的早期異常預警實驗架構。透過 Modbus 模擬器產生 PT、FT、DP
時序資料，經 SCADA 通訊介面與 Historian 保存，再由統計式 Drift Detection
及線性 Time-to-Limit Forecast 模型進行分析。

Drift Detection 以歷史正常參考視窗的中位數與 MAD
建立穩健偏移分數，並搭配近期波動比值、趨勢斜率及持續性條件，判斷 Sensor
是否偏離正常行為。Forecast 則以近期線性回歸估計斜率，計算朝向 HI 或 LO
限值的理論剩餘時間，並以資料品質及擬合品質決定結果是否可用。

研究將原始即時警報與 AI 預測預警分離，並由單點 Sensor、Supply/Return
支管配對及 PCW
系統聚合三個層級呈現結果。由於資料為模擬值，研究結論限於模擬環境中的系統流程、模型計算及預警效能；真實
Fab
的工程適用性與泛化能力，仍需透過現場文件、設備規格及經授權的實際歷史資料進一步驗證。

**最重要的論文界線：** 本研究不是宣稱已建立真實 Fab
的故障診斷系統，而是建立一個工程參數可追溯、資料流可驗證、數學模型可解釋、預測結果可評估的
PCW 早期預警 POC。

------------------------------------------------------------------------

**文件狀態：** 論文補充技術稿 V1.0。數學公式與程式為 V1.x
候選實作基礎；實際參數、工程單位、Tag
數量、管路拓撲及模型績效須以後續設定與實驗結果確認。
