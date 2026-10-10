import React, { useState } from 'react';
import { useScadaStore } from '../store/scadaStore';

export const PredictionT30 = () => {
  const predictions = useScadaStore(state => state.predictions);
  const sensors = useScadaStore(state => state.sensors);
  const predictionConfig = useScadaStore(state => state.predictionConfig);
  const updatePredictionConfig = useScadaStore(state => state.updatePredictionConfig);
  const updatePredictionSensitivity = useScadaStore(state => (state as any).updatePredictionSensitivity);
  
  const [filterSys, setFilterSys] = useState('');
  const [filterSub, setFilterSub] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterType, setFilterType] = useState(''); // PT, FT, DP

  const getSensorType = (tagId: string) => {
    if (tagId.includes('.PT.') || tagId.includes('PT')) return 'PT';
    if (tagId.includes('.FT.') || tagId.includes('FT')) return 'FT';
    if (tagId.includes('.PDT.') || tagId.includes('PDT') || tagId.includes('DP')) return 'DP';
    return '';
  };

  const filtered = predictions.filter(p => {
    if (!predictionConfig?.global) return false;
    if (filterSys && !p.tagId.startsWith(filterSys)) return false;
    if (filterSub && !p.tagId.includes(`.${filterSub}.`)) return false;
    if (filterState && p.state !== filterState) return false;
    if (filterType && getSensorType(p.tagId) !== filterType) return false;
    return true;
  });

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ color: '#a78bfa' }}>System Prediction</h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Early Warning Analytics (T-30 / T-20 / T-10) - Forecast Projection & Dynamic Anomaly Density
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem', cursor: 'pointer', background: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
            <span style={{ color: predictionConfig?.global ? 'var(--success)' : 'var(--text-muted)' }}>{predictionConfig?.global ? 'Global Engine ON' : 'Global Engine OFF'}</span>
            <input type="checkbox" checked={predictionConfig?.global ?? true} onChange={e => updatePredictionConfig('global', 'ALL', e.target.checked)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem', background: '#222', padding: '0.4rem 0.8rem', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: '#ccc' }}>Sensitivity (N10 Threshold):</span>
            <input type="number" min="0.1" max="10" step="0.1" value={predictionConfig?.sensitivity ?? 2} 
              onChange={e => updatePredictionSensitivity(Number(e.target.value))}
              style={{ width: '50px', background: '#444', color: '#fff', border: 'none', padding: '0.2rem', borderRadius: '2px', textAlign: 'center' }}
            />
          </label>
          <select value={filterSys} onChange={e=>{setFilterSys(e.target.value); setFilterSub('');}} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)' }}>
            <option value="">All Systems</option>
            {['PCW01','PCW02','PCW03','PCW04','PCW05','PCW06','PCW07','PCW08'].map(sys => (
              <option key={sys} value={sys}>{sys}</option>
            ))}
          </select>
          <select value={filterSub} onChange={e=>setFilterSub(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)' }}>
            <option value="">All Submains</option>
            {Array.from(new Set(sensors.filter(s => !filterSys || s.systemId === filterSys).map(s => s.submainId))).map(sm => (
              <option key={sm} value={sm}>{sm}</option>
            ))}
          </select>
          {filterSys && !filterSub && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', background: '#444', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
               <input type="checkbox" checked={predictionConfig?.systems[filterSys] !== false} onChange={e => updatePredictionConfig('system', filterSys, e.target.checked)} />
               {filterSys} Engine
            </label>
          )}
          {filterSub && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: 'pointer', background: '#444', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
               <input type="checkbox" checked={predictionConfig?.submains[filterSub] !== false} onChange={e => updatePredictionConfig('submain', filterSub, e.target.checked)} />
               {filterSub} Engine
            </label>
          )}
          <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)' }}>
            <option value="">All Types</option>
            <option value="PT">PT (Pressure)</option>
            <option value="FT">FT (Flow)</option>
            <option value="DP">DP (Differential)</option>
          </select>
          <select value={filterState} onChange={e=>setFilterState(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)' }}>
            <option value="">All States</option>
            <option value="NORMAL">NORMAL</option>
            <option value="T-30">T-30 Warning</option>
            <option value="T-20">T-20 Warning</option>
            <option value="T-10">T-10 Warning</option>
            <option value="EVENT">EVENT</option>
          </select>
        </div>
      </div>

      <div className="card table-container" style={{ flex: 1, overflowY: 'auto' }}>
        <table>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
            <tr>
              <th rowSpan={2} style={{ borderBottom: '2px solid #555' }}>Canonical Tag</th>
              <th rowSpan={2} style={{ borderBottom: '2px solid #555', borderRight: '1px solid #444' }}>Limits (HH/H/L/LL)</th>
              <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid #444', borderRight: '1px solid #444' }}>Anomaly Density (N10)</th>
              <th colSpan={4} style={{ textAlign: 'center', borderBottom: '1px solid #444', borderRight: '1px solid #444' }}>Trend Forecast (Value + Slope*h)</th>
              <th colSpan={2} style={{ textAlign: 'center', borderBottom: '1px solid #444' }}>Decision Engine</th>
            </tr>
            <tr>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>Current Value</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>BaseAvg60</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>M60 / M10</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555', borderRight: '1px solid #444' }}>N10 (Limit &gt; {predictionConfig?.sensitivity ?? 2})</th>
              
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>Slope / min</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>Fcst-30</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>Fcst-20</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555', borderRight: '1px solid #444' }}>Fcst-10</th>
              
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>State</th>
              <th style={{ fontSize: '0.75rem', borderBottom: '2px solid #555' }}>Trigger Path Evidence</th>
            </tr>
          </thead>
          <tbody>
            {!predictionConfig?.global ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Prediction Engine is currently OFF. Toggle it ON to resume analytics.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No prediction data matches the current filters.
                </td>
              </tr>
            ) : filtered.map(p => {
              const stateCls = 
                p.state === 'NORMAL' ? 'normal' : 
                p.state === 'EVENT' ? 'alarm' : 
                p.state === 'T-10' ? 'alarm' : 
                p.state === 'T-20' ? 'warning' : 'warning';
                
              const liveSensor = sensors.find(s => s.tagId === p.tagId);
              const liveValue = liveSensor ? liveSensor.value : p.currentValue;
                
              return (
                <tr key={p.tagId} style={{ background: p.state !== 'NORMAL' ? 'rgba(255,0,0,0.05)' : 'transparent', opacity: p.state === 'DISABLED' ? 0.5 : 1 }}>
                  <td className="val">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        title="Enable Prediction for this Sensor"
                        checked={predictionConfig?.sensors[p.tagId] !== false} 
                        onChange={e => updatePredictionConfig('sensor', p.tagId, e.target.checked)} 
                      />
                      <span>{p.tagId}</span>
                    </div>
                  </td>
                  
                  {/* Limits Track */}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', borderRight: '1px solid #444' }}>
                    {liveSensor ? (
                      <>
                        <span style={{ color: '#ff6b6b' }}>{liveSensor.engineeringLimits.highHigh.toFixed(2)}</span> / <span style={{ color: '#ff6b6b' }}>{liveSensor.engineeringLimits.high.toFixed(2)}</span> / <span style={{ color: '#4facfe' }}>{liveSensor.engineeringLimits.low.toFixed(2)}</span> / <span style={{ color: '#4facfe' }}>{liveSensor.engineeringLimits.lowLow.toFixed(2)}</span>
                      </>
                    ) : '---'}
                  </td>

                  {/* N10 Track */}
                  <td>
                    <strong style={{ 
                      color: (liveSensor && (liveValue >= liveSensor.engineeringLimits.high || liveValue <= liveSensor.engineeringLimits.low)) 
                      ? 'var(--warning)' 
                      : 'inherit' 
                    }}>
                      {liveValue?.toFixed(3) || '---'}
                    </strong>
                  </td>
                  <td>{p.baseAvg60.toFixed(3)}</td>
                  <td style={{ fontSize: '0.8rem' }}>{p.m60} / {p.m10}</td>
                  <td>
                    <span style={{ color: p.n10 > 2 ? 'var(--warning)' : 'inherit', fontWeight: p.n10 > 2 ? 'bold' : 'normal' }}>
                      {p.n10.toFixed(2)}
                    </span>
                  </td>
                  
                  {/* Forecast Track */}
                  <td style={{ color: Math.abs(p.slope) > 0.001 ? 'var(--warning)' : 'inherit' }}>{p.slope.toFixed(4)}</td>
                  <td style={{ 
                    color: (liveSensor && (p.forecast30 >= liveSensor.engineeringLimits.high || p.forecast30 <= liveSensor.engineeringLimits.low)) 
                    ? 'var(--warning)' 
                    : 'inherit' 
                  }}>{p.forecast30.toFixed(3)}</td>
                  <td style={{ 
                    color: (liveSensor && (p.forecast20 >= liveSensor.engineeringLimits.high || p.forecast20 <= liveSensor.engineeringLimits.low)) 
                    ? 'var(--warning)' 
                    : 'inherit' 
                  }}>{p.forecast20.toFixed(3)}</td>
                  <td style={{ 
                    color: (liveSensor && (p.forecast10 >= liveSensor.engineeringLimits.highHigh || p.forecast10 <= liveSensor.engineeringLimits.lowLow)) 
                    ? 'var(--danger)' 
                    : 'inherit', 
                    borderRight: '1px solid #444' 
                  }}>{p.forecast10.toFixed(3)}</td>
                  
                  {/* Decision */}
                  <td><span className={`badge ${stateCls}`}>{p.state}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.triggerPath || '---'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
