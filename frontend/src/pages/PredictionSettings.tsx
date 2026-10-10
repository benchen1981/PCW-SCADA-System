import React, { useState } from 'react';
import { useScadaStore } from '../store/scadaStore';

export const PredictionSettings = () => {
  const sensors = useScadaStore(state => state.sensors);
  const predictionConfig = useScadaStore(state => state.predictionConfig);
  const updatePredictionSensitivity = useScadaStore(state => (state as any).updatePredictionSensitivity);
  const updateSensorSensitivity = useScadaStore(state => (state as any).updateSensorSensitivity);

  const [filterSys, setFilterSys] = useState('');
  const [filterType, setFilterType] = useState('');

  const getSensorType = (tagId: string) => {
    if (tagId.includes('.PT.') || (tagId.includes('PT') && !tagId.includes('PDT'))) return 'PT';
    if (tagId.includes('.FT.') || tagId.includes('FT')) return 'FT';
    if (tagId.includes('.PDT.') || tagId.includes('PDT')) return 'DP';
    return '';
  };
  
  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', overflow: 'hidden' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ color: '#a78bfa', margin: '0 0 0.5rem 0' }}>Prediction Sensitivity Tuning</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Configure the drift detection threshold (N10) globally or override per-sensor. Lower values make the engine more sensitive to early warnings.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        {/* Left Control Panel */}
        <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto', background: 'linear-gradient(180deg, #1f1f1f, #2a2a2a)' }}>
          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', color: '#a78bfa' }}>Global Sensitivity</h3>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.9rem', color: '#ccc' }}>Global N10 Threshold:</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="number" 
                min="0.1" max="10" step="0.1"
                value={predictionConfig?.sensitivity ?? 2} 
                onChange={e => updatePredictionSensitivity(Number(e.target.value))}
                style={{ flex: 1, padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', textAlign: 'center', fontSize: '1.1rem' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>
              Default fallback threshold applied to all sensors unless individually overridden.
            </div>
          </div>

          <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '2rem', color: '#fff' }}>View & Filter</h3>
          <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem' }}>Target System:</label>
              <select value={filterSys} onChange={e=>setFilterSys(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
                <option value="">-- All Systems --</option>
                {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => (
                  <option key={sys} value={sys}>{sys}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem' }}>Sensor Type:</label>
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
                <option value="">-- All Types --</option>
                <option value="PT">PT (Pressure)</option>
                <option value="FT">FT (Flow)</option>
                <option value="DP">DP (Differential)</option>
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
            Hint: Custom overrides take precedence over the Global Threshold.
          </div>
        </div>

        {/* Right Table Panel */}
        <div className="card table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Per-Sensor Overrides</h3>
          <table>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
              <tr>
                <th style={{ width: '25%' }}>Sensor Tag ID</th>
                <th style={{ width: '25%' }}>System / Submain</th>
                <th style={{ width: '25%' }}>Custom N10 Threshold</th>
                <th style={{ width: '25%' }}>Current Active Value</th>
              </tr>
            </thead>
            <tbody>
              {sensors.filter(s => {
              if (filterSys && s.systemId !== filterSys) return false;
              if (filterType && getSensorType(s.tagId) !== filterType) return false;
              return true;
            }).map(s => {
                const customVal = predictionConfig?.sensorSensitivity?.[s.tagId];
                const activeVal = customVal ?? predictionConfig?.sensitivity ?? 2;
                
                return (
                  <tr key={s.tagId}>
                    <td className="val">{s.tagId}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.systemId} / {s.submainId}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="number" 
                          min="1" max="10" 
                          value={customVal || ''} 
                          placeholder="Inherit"
                          onChange={e => updateSensorSensitivity(s.tagId, e.target.value ? Number(e.target.value) : null)}
                          style={{ width: '80px', background: customVal ? '#222' : '#333', color: customVal ? '#a78bfa' : '#888', border: '1px solid #555', padding: '0.3rem', borderRadius: '4px', textAlign: 'center' }}
                        />
                        {customVal && (
                          <button onClick={() => updateSensorSensitivity(s.tagId, null)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>
                            Clear
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: customVal ? '#a78bfa' : '#444', color: customVal ? '#000' : '#fff', padding: '0.2rem 0.6rem', fontSize: '0.9rem' }}>
                        {activeVal}
                      </span>
                      {!customVal && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Global)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
