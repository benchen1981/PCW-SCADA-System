# 半導體 Fab 八套獨立 PCW 系統最佳配置建議

**文件版本：V1.0**\
**配置依據：使用者提供之 PCW01～PCW08 Sensor Alarm Limit 與 Baseline**\
**用途：論文研究、POC 系統設計、資料庫建模、HMI 監控及 SAT 驗證**

------------------------------------------------------------------------

## 1. 配置決策摘要

### 1.1 已確認的系統前提

-   Fab 目前運行 **8 套獨立 PCW 系統**：PCW01～PCW08。
-   每套 PCW 各自供應不同製程區域或設備群。
-   每套系統目前規劃約 20 組 Supply / Return 支管配對。
-   若每組配對配置 1 支 Supply PT 與 1 支 Return PT，則每套約 40 支
    PT，8 套合計約 320 支 PT。
-   研究資料更新頻率：原始 Sensor 資料每秒更新；預測模型每分鐘執行一次。
-   本文件所列數值為目前系統設定值，不代表所有半導體廠通用的工程標準值。

### 1.2 最佳配置原則

建議採用「**8 套獨立 PCW 系統 + 4 組參數設定群組 + 3 種 Sensor 類型 + 3
層異常分析**」架構。

  層級               配置內容            管理原則
  ------------------ ------------------- ------------------------------------
  PCW System         PCW01～PCW08        各系統獨立識別、獨立監控
  Parameter Group    G1～G4              每組包含兩套參數相同的 PCW
  Sensor Type        PT、FT、DP          不同物理量分開設定
  Sensor Tag         各系統個別 Tag      不共用 Tag ID 或歷史序列
  Analysis Level 1   Individual Sensor   單點行為偏移及越限預測
  Analysis Level 2   Branch Pair         Supply / Return 配對分析（適用時）
  Analysis Level 3   PCW System          系統內多支 Sensor 異常聚合

**重要：** 參數群組只代表目前設定值相同，不代表兩套 PCW
在水力上互相連通，也不代表兩套系統可以合併成同一個分析母體。

------------------------------------------------------------------------

## 2. 八套 PCW 系統分組

  參數群組   PCW 系統         PT Baseline   FT Baseline   DP Baseline
  ---------- -------------- ------------- ------------- -------------
  G1         PCW01、PCW02             1.5           180           0.3
  G2         PCW03、PCW04             1.9           180           0.3
  G3         PCW05、PCW06             2.5           260           0.3
  G4         PCW07、PCW08             2.2           240           0.3

> 單位尚未由使用者提供。正式資料字典應補上 PT、FT、DP
> 的工程單位，並確認量測位置、量程、精度及訊號縮放方式。以下數值均沿用原始設定，不自行推定單位。

### 2.1 參數群組與製程區域的關係

目前已知 PCW01～PCW08 是 8 套獨立系統，但尚未提供每套 PCW
實際供應的製程區域。因此：

-   不應直接指定 PCW01 = Diffusion、PCW02 = Etch 等對應。
-   建議以 `process_area_mapping` 對照表記錄實際供應區域。
-   對照依據應為 P&ID、Utility Layout、設備 Hook-up
    圖或經廠務確認的管路清冊。
-   一套 PCW 若供應多個製程區域，應允許一對多關係。
-   同一製程區域若由多套 PCW 供應，應允許多對多關係。

建議先使用中性名稱 `PCW01`～`PCW08`，待管路資料確認後再填入
`process_area`，避免將假設誤寫成現場事實。

------------------------------------------------------------------------

## 3. Sensor Alarm Limit 與 Baseline 正式設定表

### 3.1 G1：PCW01、PCW02

  Sensor Type     HIHI    HI   Baseline       LO     LOLO
  ------------- ------ ----- ---------- -------- --------
  PT               1.8   1.7        1.5      1.3      1.2
  FT               220   200        180      160      150
  DP               0.6   0.5        0.3   未提供   未提供

### 3.2 G2：PCW03、PCW04

  Sensor Type     HIHI    HI   Baseline       LO     LOLO
  ------------- ------ ----- ---------- -------- --------
  PT               2.2   2.1        1.9      1.7      1.5
  FT               220   200        180      160      150
  DP               0.6   0.5        0.3   未提供   未提供

### 3.3 G3：PCW05、PCW06

  Sensor Type     HIHI    HI   Baseline       LO     LOLO
  ------------- ------ ----- ---------- -------- --------
  PT               2.8   2.7        2.5      2.3      2.2
  FT               300   280        260      240      230
  DP               0.6   0.5        0.3   未提供   未提供

### 3.4 G4：PCW07、PCW08

  Sensor Type     HIHI    HI   Baseline       LO     LOLO
  ------------- ------ ----- ---------- -------- --------
  PT               2.5   2.4        2.2      2.0      1.9
  FT               280   260        240      220      200
  DP               0.6   0.5        0.3   未提供   未提供

### 3.5 原始設定資料品質檢查

使用者原始敘述中 `PCW0\3` 視為 `PCW03` 的文字輸入錯字，依上下文整理為
PCW03；正式匯入前仍應核對來源設定檔。

所有已提供 PT、FT 門檻均符合： `HIHI > HI > Baseline > LO > LOLO`。

DP 目前符合： `HIHI > HI > Baseline`。

DP 沒有提供低限值，因此資料庫應將 `LO`、`LOLO` 設為 `NULL` 或
`NOT_CONFIGURED`，不可設為 0，也不可把 0.3 Baseline 誤當成 LO。

------------------------------------------------------------------------

## 4. 最佳系統配置架構

### 4.1 邏輯架構

``` text
FAB
|
+-- PCW01 (Independent System) -- G1
|   +-- PT Sensors
|   +-- FT Sensors
|   +-- DP Sensors
|   +-- Branches / Equipment Groups
|
+-- PCW02 (Independent System) -- G1
|   +-- PT Sensors
|   +-- FT Sensors
|   +-- DP Sensors
|   +-- Branches / Equipment Groups
|
+-- PCW03 (Independent System) -- G2
|   +-- PT Sensors
|   +-- FT Sensors
|   +-- DP Sensors
|   +-- Branches / Equipment Groups
|
+-- PCW04 (Independent System) -- G2
|
+-- PCW05 (Independent System) -- G3
|
+-- PCW06 (Independent System) -- G3
|
+-- PCW07 (Independent System) -- G4
|
+-- PCW08 (Independent System) -- G4
```

### 4.2 建議的資料流

``` text
PT / FT / DP Sensors
        |
        v
Data Acquisition (1 sample/sec)
        |
        v
Raw Sensor Time-series Database
        |
        +------------------------------+
        |                              |
        v                              v
Real-time Alarm Engine          1-minute Scheduler
        |                              |
        v                              v
HIHI / HI / LO / LOLO           Feature & Quality Check
        |                              |
        v                              v
Raw Alarm Event                 Drift Detection Model
                                       |
                                       v
                                Time-to-Limit Model
                                       |
                         +-------------+-------------+
                         |                           |
                         v                           v
                  Drift Result Table         TTE Result Table
                         |                           |
                         +-------------+-------------+
                                       |
                                       v
                              Web HMI / Dashboard
```

即時警報與 AI 預測結果必須分開保存、分開呈現。AI
預測警告不能覆蓋或取代原始 HIHI、HI、LO、LOLO 警報。

------------------------------------------------------------------------

## 5. Sensor 分類與物理意義

### 5.1 PT --- Pressure Transmitter

PT 用於量測指定位置的壓力。若 PT 分布在 Supply 與 Return：

-   `Supply PT`：供水側指定量測點壓力。
-   `Return PT`：回水側指定量測點壓力。
-   每支 PT 都必須有自己的 Tag ID、位置、量程、Baseline 與 Alarm Limit。
-   不同 PCW 的 PT Baseline 不可直接共用。

### 5.2 FT --- Flow Transmitter

FT 用於量測指定管路的流量。

-   必須確認量測單位，例如 L/min、m³/h 或其他工程單位。
-   必須記錄量測位置及是否為總管、分區管或設備支管。
-   不可將不同單位的 FT 數值直接比較。
-   若一個 FT 量測總管流量，不能把它當成每一設備支管的流量。

### 5.3 DP --- Differential Pressure

DP 用於量測兩個壓力取壓點之間的差壓。它與由兩支 PT
計算的壓差不是必然相同的量測配置：

-   DP Transmitter：單一差壓儀表，兩端接不同取壓點。
-   PT-based Delta-P：以兩支 PT 量測值相減計算。
-   必須記錄 DP 的 High-side、Low-side 取壓位置及正負方向。
-   DP 的正負號、取壓點及單位必須固定定義。

若計算 `Delta_P = P_supply - P_return`，必須確認兩支 PT
的位置、單位及時間戳一致。不得直接將 DP Sensor 與 PT 計算差壓視為同一個
Tag。

------------------------------------------------------------------------

## 6. Alarm Limit 與 Baseline 的使用規則

### 6.1 Baseline 不等於 Alarm Limit

Baseline 是正常狀態的參考中心值；HIHI、HI、LO、LOLO
是即時警報門檻。兩者用途不同：

  類別                    用途
  ----------------------- ------------------------------
  Baseline                正常行為參考值、偏移分析基準
  HIHI                    高高限即時警報
  HI                      高限即時警報
  LO                      低限即時警報
  LOLO                    低低限即時警報
  AI Drift Threshold      統計模型判定行為偏移的門檻
  AI Prediction Warning   預測未來可能越限的提前警告

不得把 Baseline 當作警報門檻，也不得將 AI 統計偏移門檻直接設成 HI 或
LO。

### 6.2 即時警報狀態

對已設定上下限的 PT、FT，建議採用以下狀態邏輯：

-   `NORMAL`：數值位於 HI 與 LO 之間。
-   `HI`：數值達到或超過 HI，但未達 HIHI。
-   `HIHI`：數值達到或超過 HIHI。
-   `LO`：數值低於或等於 LO，但高於 LOLO。
-   `LOLO`：數值低於或等於 LOLO。
-   `BAD_QUALITY`：感測器品質不良或資料無效。
-   `STALE`：資料超過允許更新時間仍未更新。

實際警報應另定義遲滯（Hysteresis）、延遲（On-delay）、解除條件（Clear
condition）及事件鎖存（Latch）規則，避免門檻附近反覆跳動。這些參數目前尚未提供，不應自行假設。

DP 目前只有高限設定，因此只可依已核准的 HI、HIHI
執行高差壓警報；低差壓警報應標示 `NOT_CONFIGURED`。

------------------------------------------------------------------------

## 7. AI 早期異常偵測的最佳建議

### 7.1 第一層：單一 Sensor 時序分析

每一支 PT、FT、DP 都是獨立的時間序列分析單位。

模型輸入至少包括：

-   `timestamp`
-   `pcw_id`
-   `sensor_type`
-   `tag_id`
-   `value`
-   `quality_flag`
-   `baseline_config_version`
-   `alarm_config_version`

模型應依 Sensor 類型、PCW 系統及 Tag ID 找到對應的 Baseline 與設定版本。

### 7.2 第二層：支管配對分析

適用於確實具有 Supply / Return 配對的支管：

-   以 `branch_id` 關聯 Supply PT 與 Return PT。
-   兩筆資料需有一致的時間基準。
-   可計算供回水壓力差及兩側各自的偏移程度。
-   配對異常只能作為關聯性證據，不能直接宣稱故障原因。
-   FT、DP 必須依實際管路與儀表位置建立關聯，不能僅憑 Tag 名稱猜測。

### 7.3 第三層：PCW 系統聚合

每套 PCW 獨立計算：

-   有效 Sensor 數量。
-   異常 Sensor 數量及比例。
-   HI、HIHI、LO、LOLO 即時警報數量。
-   Drift Flag 數量及比例。
-   預測越限 Sensor 數量。
-   各支管異常分布。
-   資料品質及缺值比例。

建議保留 PT、FT、DP 各自的聚合結果，不要未經驗證就混合成單一異常分數。

### 7.4 跨 PCW 比較

PCW01～PCW08 的 PT、FT Baseline
不同，且系統可能有不同水力條件。跨系統比較應使用：

-   相對各自 Baseline 的偏移量。
-   以歷史正常資料估計的標準化偏移分數。
-   各系統異常 Sensor 比例。
-   相同 Sensor Type 且相同單位的統計指標。

不要直接比較不同 PCW 的原始 PT 或 FT 數值，也不要因為兩套 PCW
同屬一個參數群組，就假設其正常行為完全相同。

------------------------------------------------------------------------

## 8. 資料庫設計建議

建議將「系統配置」、「Sensor 設定」、「原始資料」、「即時事件」及「AI
預測結果」分開管理。

### 8.1 `pcw_system`

  欄位                   說明
  ---------------------- ----------------------
  pcw_id                 PCW01～PCW08，主鍵
  parameter_group        G1～G4
  system_name            系統名稱
  process_area_mapping   對應製程區域，待確認
  active_status          系統啟用狀態

### 8.2 `sensor_config`

  欄位                            說明
  ------------------------------- ------------------------------------------------
  tag_id                          Sensor Tag，主鍵
  pcw_id                          所屬 PCW
  sensor_type                     PT / FT / DP
  branch_id                       支管編號，可為 NULL
  equipment_id                    設備編號，可為 NULL
  side                            Supply / Return / Differential / Total / Other
  engineering_unit                工程單位
  baseline                        Baseline
  hihi / hi / lo / lolo           警報門檻
  config_version                  設定版本
  effective_from / effective_to   生效時間

DP 的 LO、LOLO 應允許 NULL，並另外保存設定狀態。

### 8.3 `sensor_raw_data`

  欄位                  說明
  --------------------- ------------------------
  timestamp             取樣時間
  tag_id                Sensor Tag
  pcw_id                所屬系統
  value                 原始量測值
  quality_flag          品質狀態
  source_timestamp      來源時間戳（若可取得）
  ingestion_timestamp   資料進入資料庫時間

### 8.4 `alarm_events`

保存原始即時警報：

-   `event_id`
-   `tag_id`
-   `pcw_id`
-   `alarm_type`
-   `first_crossing_time`
-   `last_update_time`
-   `clear_time`
-   `event_status`
-   `limit_value`
-   `observed_value`
-   `alarm_config_version`

### 8.5 `drift_prediction_results`

保存偏移預警：

-   `result_id`
-   `tag_id`
-   `pcw_id`
-   `analysis_timestamp`
-   `drift_flag`
-   `drift_score`
-   `direction`
-   `window_config`
-   `quality_status`
-   `model_version`
-   `valid_until`

### 8.6 `time_to_limit_results`

保存越限時間預測：

-   `result_id`
-   `tag_id`
-   `pcw_id`
-   `analysis_timestamp`
-   `target_limit`
-   `target_limit_value`
-   `slope`
-   `prediction_seconds`
-   `fit_quality`
-   `confidence_status`
-   `quality_status`
-   `model_version`
-   `valid_until`

原始警報、偏移預警與越限時間預測應使用不同資料表與事件識別碼，避免混淆實際越限與模型預測。

------------------------------------------------------------------------

## 9. 設定版本及模型版本管理

建議每筆 AI 結果都能追溯當時使用的：

1.  Sensor Baseline 版本。
2.  Alarm Limit 版本。
3.  資料品質規則版本。
4.  特徵視窗版本。
5.  Drift Model 版本。
6.  Time-to-Limit Model 版本。
7.  分析程式版本。

若現場修改 Baseline 或 Alarm
Limit，不應回頭覆寫舊設定。應建立新版本並記錄生效時間，讓歷史分析可重現。

------------------------------------------------------------------------

## 10. 建議 HMI 監控畫面

### 10.1 Overview --- 全廠總覽

顯示：

-   8 套 PCW 系統狀態。
-   各系統 PT、FT、DP Sensor 數量。
-   即時 HIHI / HI / LO / LOLO 事件數。
-   Drift Warning 數量。
-   Predicted Limit Exceedance 數量。
-   資料更新及品質狀態。

### 10.2 PCW System Detail --- 單套系統

每套系統獨立顯示：

-   Sensor 即時數值。
-   各 Tag Baseline 與 Alarm Limit。
-   趨勢圖及歷史警報。
-   Drift Score 與預測方向。
-   預測越限時間。
-   Model Version 及結果有效期限。

### 10.3 Branch Detail --- 支管明細

顯示：

-   Supply PT。
-   Return PT。
-   FT（若該支管有配置）。
-   DP（若該支管有配置）。
-   供回水趨勢與關聯分析。
-   支管下游設備對照。

### 10.4 Event History --- 事件歷史

必須區分：

  事件類別             來源                意義
  -------------------- ------------------- ---------------------------
  Process Alarm        即時 Alarm Engine   Sensor 已達實際警報條件
  Drift Warning        AI Model            Sensor 行為已偏離參考基準
  Predicted HI/LO      AI Model            模型預測未來可能越限
  Data Quality Event   Data Acquisition    資料缺漏、品質不良或逾時

------------------------------------------------------------------------

## 11. SAT 驗證項目

  編號     測試項目          驗證要求
  -------- ----------------- -----------------------------------------
  SAT-01   8 套系統識別      PCW01～PCW08 不可混淆
  SAT-02   參數群組          G1～G4 對應正確
  SAT-03   PT 門檻           與本文件設定表一致
  SAT-04   FT 門檻           與本文件設定表一致
  SAT-05   DP 門檻           HIHI、HI、Baseline 正確；LO/LOLO 未設定
  SAT-06   Sensor 資料更新   每秒更新與時間戳正確
  SAT-07   即時警報          HIHI、HI、LO、LOLO 觸發及解除正確
  SAT-08   DP 高限警報       僅測試已設定的高限
  SAT-09   Drift Detection   每分鐘執行並寫入獨立結果表
  SAT-10   Time-to-Limit     預測結果與目標門檻正確關聯
  SAT-11   PCW 聚合          異常統計只聚合所屬系統
  SAT-12   版本追溯          可查詢設定及模型版本
  SAT-13   中斷恢復          資料補入、重複執行及結果有效性可追溯
  SAT-14   HMI 顯示          原始警報與 AI 預警明確區分

------------------------------------------------------------------------

## 12. 尚待確認的工程資料與風險

以下項目不應由模型或文件作者自行推定，必須向現場廠務、儀控或設備資料確認。

  優先級   待確認項目                 原因
  -------- -------------------------- --------------------------------
  必要     PT、FT、DP 工程單位        避免數值比較與門檻設定錯誤
  必要     各 PCW 實際供應區域        建立真實 Process Area Mapping
  必要     各 Sensor 量測位置         區分主管、支管、設備入口與出口
  必要     DP 正負方向與取壓點        確認差壓物理意義
  必要     DP 是否需要 LO / LOLO      目前沒有低限設定
  必要     PT / FT / DP Tag 清冊      確認實際 Sensor 數量及類型
  高       Supply / Return 配對關係   避免錯誤配對
  高       Alarm Hysteresis / Delay   避免警報抖動
  高       Sensor 量程與校正資訊      確認量測可信度
  高       PCW 管路 P&ID              確認系統與支管拓撲
  高       Baseline 建立依據          確認是否代表正常運轉狀態
  中       設備運轉狀態               協助解釋負載變化
  中       流量、溫度及閥位           增加物理診斷證據

### 特別注意：DP 的門檻方向

目前 DP 設定為：

-   Baseline = 0.3
-   HI = 0.5
-   HIHI = 0.6
-   LO、LOLO 未提供

本文件僅將它視為已提供的高差壓警報設定。若 DP
是設備兩端壓差，差壓過低也可能具有工程意義，但是否應設低限，必須依實際管路功能、儀表方向及設備規格決定，不能直接自行增加。

### 特別注意：Baseline 與統計模型參考值

使用者提供的 Baseline
可作為目前設定參考值，但不能僅憑一個固定數值就認定它足以代表所有操作模式的正常行為。

建議模型同時保留：

-   `configured_baseline`：現場設定基準。
-   `historical_reference`：從合格正常歷史資料估計的參考值。
-   `adaptive_reference`：若未來允許動態更新，需經核准及版本控管的參考值。

V1.x
建議先使用固定、可追溯的參考基準與歷史正常視窗；不要在未驗證前自動改寫現場
Alarm Limit 或 Baseline。

------------------------------------------------------------------------

## 13. 最終建議配置

### 正式採用

1.  PCW01～PCW08 保持 8 套獨立系統識別。
2.  G1～G4 僅作為參數設定群組，不作為水力連通或故障共因的證據。
3.  PT、FT、DP 分開管理，各自套用對應群組的設定。
4.  每支 Sensor 保留獨立 Tag ID、Baseline、Alarm
    Limit、工程單位及設定版本。
5.  每秒記錄原始 Sensor 資料，每分鐘執行 AI 分析。
6.  即時警報、Drift Warning、Time-to-Limit Prediction 分開保存。
7.  以 Sensor、Branch Pair、PCW System 三層進行分析。
8.  製程區域對照必須由現場 P&ID 或設備清冊確認。
9.  不以單一 PT、FT 或 DP 異常直接推論設備故障原因。
10. 所有模型預測都保留品質狀態、模型版本及有效期限。

### 研究定位

本研究應定位為：

**以多套獨立 PCW 系統之 PT、FT、DP
時序資料為基礎，建立分層式統計異常偏移偵測與越限時間預測方法，並透過單點感測器、支管關聯及系統層級聚合，驗證早期預警能力。**

此定位能保留研究核心，也能將實際廠務配置、資料流、模型輸出及 SAT
驗證連結起來；不必將研究擴張成完整 SCADA、PLC 或 PCW 廠務設計工程。

------------------------------------------------------------------------

**文件狀態：**
建議配置稿；數值忠實沿用使用者提供設定。工程單位、製程區域對照、DP
低限及實際管路拓撲仍待現場資料確認。
