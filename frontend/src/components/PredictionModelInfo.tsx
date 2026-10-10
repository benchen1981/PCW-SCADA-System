import React from 'react';

export const PredictionModelInfo: React.FC = () => {
  return (
    <div style={{
      background: '#1a1a1a', 
      borderRadius: '8px', border: '1px solid #444',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      marginBottom: '1rem'
    }}>
      <div style={{
        padding: '1rem', borderBottom: '1px solid #444',
        background: 'linear-gradient(90deg, #1f1f1f, #2a2a2a)'
      }}>
        <h2 style={{ margin: 0, color: '#a78bfa', fontSize: '1.2rem' }}>預測模型架構說明 (Prediction Architecture)</h2>
      </div>
      <div style={{ padding: '1.5rem', color: '#e0e0e0', lineHeight: 1.6 }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderLeft: '4px solid #a78bfa', padding: '1rem', marginBottom: '2rem', borderRadius: '0 4px 4px 0' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff', fontSize: '1.1rem' }}>模型運作目的</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#ccc' }}>
            <li style={{ marginBottom: '0.5rem' }}><strong>偏移偵測 (Drift Detection)</strong>：比對設備近期數據與歷史基準的差異，判斷是否發生持續性的數據偏移 (如漏水、濾網阻塞)。</li>
            <li><strong>趨勢預測 (Forecast)</strong>：計算數值變化的斜率，推算未來 10、20、30 分鐘的預測值。若預測將超過上下限設定 (HH, H, L, LL)，則提前發出預警。</li>
          </ul>
        </div>

        <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', fontSize: '1.1rem' }}>1. 資料收集與特徵萃取</h3>
        <p style={{ color: '#ccc' }}>
          預測模型適用於全系統 (PCW01~08) 的壓力 (PT)、流量 (FT) 及壓差 (DP) 感測器。系統會收集過去 70 分鐘的資料 (取樣率：每分鐘 1 筆) 進行分析。若實際歷史資料不足 70 筆，引擎會自動以基準值 (Baseline) 進行平滑補齊 (Auto-pad)，確保預測模型能 24 小時無縫運作。這 70 分鐘的資料會被切分為三個時間段：
        </p>
        <ul style={{ background: '#222', padding: '1rem 2rem', borderRadius: '4px', color: '#ccc' }}>
          <li><strong>T-70 到 T-10</strong>：過去 60 分鐘的歷史區間，用來建立系統的基準線 (Baseline)。</li>
          <li><strong>T-10 到 T-5</strong>：過去 10 分鐘到 5 分鐘的區間，作為近期變化的起始參考點。</li>
          <li><strong>T-5 到 T-0</strong>：最近 5 分鐘的區間，代表當前最新狀態。</li>
        </ul>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.9rem', color: '#ccc' }}>
          <thead>
            <tr style={{ background: '#333', textAlign: 'left', color: '#fff' }}>
              <th style={{ padding: '0.5rem', border: '1px solid #444' }}>特徵參數</th>
              <th style={{ padding: '0.5rem', border: '1px solid #444' }}>說明</th>
              <th style={{ padding: '0.5rem', border: '1px solid #444' }}>計算方式</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #444', color: '#a78bfa' }}><strong>baseAvg60</strong></td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>60 分鐘基準值</td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>T-70 到 T-10 區間內數值的平均。</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #444', color: '#a78bfa' }}><strong>prev5Avg</strong></td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>前期 5 分鐘平均</td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>T-10 到 T-5 區間內數值的平均，用於平滑化計算。</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #444', color: '#a78bfa' }}><strong>recent5Avg</strong></td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>近期 5 分鐘平均</td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>T-5 到 T-0 區間內數值的平均。</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #444', color: '#a78bfa' }}><strong>m60</strong></td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>長天期偏離次數</td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>計算 T-70 到 T-10 期間內，數值偏離 baseAvg60 容忍範圍的總筆數。</td>
            </tr>
            <tr>
              <td style={{ padding: '0.5rem', border: '1px solid #444', color: '#a78bfa' }}><strong>m10</strong></td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>短天期偏離次數</td>
              <td style={{ padding: '0.5rem', border: '1px solid #444' }}>計算 T-10 到 T-0 期間內，數值偏離 baseAvg60 容忍範圍的總筆數。</td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginTop: '2rem', fontSize: '1.1rem' }}>2. 預測運算邏輯</h3>
        
        <div style={{ background: '#000', padding: '1.5rem', borderRadius: '4px', border: '1px solid #333', color: '#9cdcfe', fontFamily: 'monospace', lineHeight: 1.8 }}>
          <div style={{ color: '#6a9955' }}>// 步驟一：計算異常密度指標 (N10)</div>
          <div style={{ color: '#6a9955' }}>
            // 將最近 10 分鐘的異常發作次數 (m10)，對比過去 60 分鐘的平均常態次數 (m60 / 6)
          </div>
          <div style={{ margin: '0.5rem 0 1.5rem 0' }}>N10 = m10 / Max(1, (m60 / 6))</div>
          
          <div style={{ color: '#6a9955' }}>// 步驟二：計算變化斜率 (Slope)</div>
          <div style={{ color: '#6a9955' }}>
            // 使用平均值來計算每分鐘變化率，避免單點雜訊 (如水錘效應) 造成的誤判
          </div>
          <div style={{ margin: '0.5rem 0 1.5rem 0' }}>Slope = (recent5Avg - prev5Avg) / 5</div>
          
          <div style={{ color: '#6a9955' }}>// 步驟三：計算未來 T+X 分鐘的預測值</div>
          <div style={{ margin: '0.5rem 0 0 0' }}>Forecast(T+10) = CurrentValue + (Slope * 10)</div>
          <div style={{ margin: '0' }}>Forecast(T+20) = CurrentValue + (Slope * 20)</div>
          <div style={{ margin: '0' }}>Forecast(T+30) = CurrentValue + (Slope * 30)</div>
        </div>

        <h3 style={{ color: '#fff', borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginTop: '2rem', fontSize: '1.1rem' }}>3. 警報觸發條件</h3>
        <p style={{ color: '#ccc' }}>
          系統會將上述 Forecast 預測值與感測器的工程極限值 (Engineering Limits: HH, H, L, LL) 進行比對。
          當發生以下狀況時，判定為異常：
        </p>
        <ul style={{ marginBottom: '0', color: '#ccc' }}>
          <li style={{ marginBottom: '0.5rem' }}>
            <strong>行為偏移 (Drift)</strong>：當 <code>N10 &gt; 敏感度參數</code> 且斜率具備明顯方向性時，視為系統行為偏移。
            <br/><span style={{ fontSize: '0.85rem', color: '#888' }}>註：敏感度參數可於 System Prediction 面板上方調整，預設值為 2。數值越低，警報越靈敏。</span>
          </li>
          <li style={{ marginBottom: '0.5rem' }}>若 Forecast(T+10) 觸及極限值，觸發 <strong style={{ color: 'var(--danger)' }}>T-10 Warning</strong>。</li>
          <li style={{ marginBottom: '0.5rem' }}>若 Forecast(T+20) 觸及極限值，觸發 <strong style={{ color: 'var(--warning)' }}>T-20 Warning</strong>。</li>
          <li style={{ marginBottom: '0.5rem' }}>若 Forecast(T+30) 觸及極限值，觸發 <strong style={{ color: 'var(--warning)' }}>T-30 Warning</strong>。</li>
        </ul>
      </div>
    </div>
  );
};
