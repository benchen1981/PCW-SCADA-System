import React, { useState } from 'react';
import { useScadaStore } from '../store/scadaStore';

export const ModbusMonitor = () => {
  const modbusMap = useScadaStore(state => state.modbusMap);
  const modbusValues = useScadaStore(state => state.modbus);
  const simulatorStatus = useScadaStore(state => state.simulatorStatus);
  const simulatorConfigs = useScadaStore(state => state.simulatorConfigs);
  const sensors = useScadaStore(state => state.sensors);
  const setSimulatorControl = useScadaStore(state => state.setSimulatorControl);
  const updateSimulatorConfig = useScadaStore(state => state.updateSimulatorConfig);
  const updateSensorLimits = useScadaStore(state => state.updateSensorLimits);

  const [activeTab, setActiveTab] = useState<'MONITOR' | 'SIMULATOR'>('MONITOR');

  // Monitor Filters
  const [monitorSearch, setMonitorSearch] = useState('');
  const [monitorSys, setMonitorSys] = useState('');
  const [monitorType, setMonitorType] = useState('');

  const [simSysFilter, setSimSysFilter] = useState('');
  const [simSubFilter, setSimSubFilter] = useState('');
  const [simTypeFilter, setSimTypeFilter] = useState('');
  const [simSearchFilter, setSimSearchFilter] = useState('');
  const [simSelectedTags, setSimSelectedTags] = useState<string[]>([]);
  const [targetOverrideSystem, setTargetOverrideSystem] = useState('');
  const [simBaseValue, setSimBaseValue] = useState(1.5);
  const [simNoise, setSimNoise] = useState(0.02);
  const [simHH, setSimHH] = useState(1.8);
  const [simH, setSimH] = useState(1.7);
  const [simL, setSimL] = useState(1.3);
  const [simLL, setSimLL] = useState(1.2);
  const [simInterval, setSimInterval] = useState(1000);

  const filteredSimSensors = sensors.filter(s => {
    if (simSysFilter && s.systemId !== simSysFilter) return false;
    if (simSubFilter && s.submainId !== simSubFilter) return false;
    if (simTypeFilter && s.measurementType !== simTypeFilter) return false;
    if (simSearchFilter && !s.tagId.toLowerCase().includes(simSearchFilter.toLowerCase())) return false;
    return true;
  });

  const applyConfig = () => {
    if (simSelectedTags.length > 0) {
      updateSimulatorConfig(simSelectedTags, {
        baseValue: simBaseValue,
        noise: simNoise
      });
      updateSensorLimits(simSelectedTags, {
        highHigh: simHH,
        high: simH,
        low: simL,
        lowLow: simLL
      });
    }
  };

  const applySuggestedBaselinesToSystem = () => {
    if (!targetOverrideSystem) return;
    const targetTags = sensors.filter(s => s.systemId === targetOverrideSystem);
    targetTags.forEach(t => {
      let ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
      let ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
      let dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
      if (t.systemId === 'PCW01' || t.systemId === 'PCW02') {
        ptLimits = { lowLow: 1.20, low: 1.30, high: 1.70, highHigh: 1.80, baseline: 1.5 };
        ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
        dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
      } else if (t.systemId === 'PCW03' || t.systemId === 'PCW04') {
        ptLimits = { lowLow: 1.50, low: 1.70, high: 2.10, highHigh: 2.20, baseline: 1.9 };
        ftLimits = { lowLow: 150, low: 160, high: 200, highHigh: 220, baseline: 180 };
        dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
      } else if (t.systemId === 'PCW05' || t.systemId === 'PCW06') {
        ptLimits = { lowLow: 2.20, low: 2.30, high: 2.70, highHigh: 2.80, baseline: 2.5 };
        ftLimits = { lowLow: 230, low: 240, high: 280, highHigh: 300, baseline: 260 };
        dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
      } else if (t.systemId === 'PCW07' || t.systemId === 'PCW08') {
        ptLimits = { lowLow: 1.90, low: 2.00, high: 2.40, highHigh: 2.50, baseline: 2.2 };
        ftLimits = { lowLow: 200, low: 220, high: 260, highHigh: 280, baseline: 240 };
        dpLimits = { lowLow: 0.0, low: 0.0, high: 0.50, highHigh: 0.60, baseline: 0.3 };
      }
      
      const isFlow = t.measurementType === 'FLOW' || t.tagId.includes('FT');
      const isDP = t.measurementType === 'DP' || t.tagId.includes('PDT');
      const def = isFlow ? ftLimits : (isDP ? dpLimits : ptLimits);

      updateSimulatorConfig([t.tagId], {
        baseValue: def.baseline,
        noise: (def.high - def.low) * 0.02
      });
      updateSensorLimits([t.tagId], def);
    });
  };

  const applySuggestedBaselinesToSelected = () => {
    if (simSelectedTags.length === 0) return;
    const targetTags = sensors.filter(s => simSelectedTags.includes(s.tagId));
    targetTags.forEach(t => {
      const suggested = t.engineeringLimits.baseline ?? ((t.engineeringLimits.high + t.engineeringLimits.low) / 2);
      updateSimulatorConfig([t.tagId], {
        baseValue: suggested,
        noise: (t.engineeringLimits.high - t.engineeringLimits.low) * 0.02
      });
    });
    // Update local UI state for the first selected tag
    if (targetTags.length > 0) {
      const suggested = targetTags[0].engineeringLimits.baseline ?? ((targetTags[0].engineeringLimits.high + targetTags[0].engineeringLimits.low) / 2);
      setSimBaseValue(suggested);
      setSimNoise((targetTags[0].engineeringLimits.high - targetTags[0].engineeringLimits.low) * 0.02);
      setSimHH(targetTags[0].engineeringLimits.highHigh);
      setSimH(targetTags[0].engineeringLimits.high);
      setSimL(targetTags[0].engineeringLimits.low);
      setSimLL(targetTags[0].engineeringLimits.lowLow);
    }
  };

  const filteredMap = modbusMap.filter(reg => {
    if (monitorSearch && !reg.tagId.toLowerCase().includes(monitorSearch.toLowerCase())) return false;
    if (monitorSys && !reg.tagId.startsWith(monitorSys)) return false;
    if (monitorType) {
      if (monitorType === 'PT' && !reg.tagId.includes('PT')) return false;
      if (monitorType === 'FT' && !reg.tagId.includes('FT')) return false;
      if (monitorType === 'DP' && !reg.tagId.includes('PDT')) return false;
    }
    return true;
  });

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2>Modbus & Simulator Center</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setActiveTab('MONITOR')} style={{ padding: '0.5rem 1rem', background: activeTab === 'MONITOR' ? 'var(--accent)' : '#333', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Modbus Monitor</button>
          <button onClick={() => setActiveTab('SIMULATOR')} style={{ padding: '0.5rem 1rem', background: activeTab === 'SIMULATOR' ? 'var(--accent)' : '#333', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Sensor Simulator</button>
        </div>
      </div>

      {activeTab === 'MONITOR' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem', marginBottom: '1rem' }}>
            <input type="text" placeholder="Search Tag..." value={monitorSearch} onChange={e=>setMonitorSearch(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
            <select value={monitorSys} onChange={e=>setMonitorSys(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
              <option value="">All Systems</option>
              {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
            </select>
            <select value={monitorType} onChange={e=>setMonitorType(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
              <option value="">All Types</option>
              <option value="PT">PT (Pressure)</option>
              <option value="FT">FT (Flow)</option>
              <option value="DP">DP (Differential)</option>
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status: {simulatorStatus.isRunning ? <span style={{color:'var(--success)'}}>ONLINE</span> : <span style={{color:'var(--danger)'}}>OFFLINE</span>}</span>
              <span style={{ color: 'var(--text-muted)' }}>Iteration: {simulatorStatus.iteration}</span>
            </div>
          </div>

          <div className="card table-container" style={{ flex: 1, overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
                <tr>
                  <th>Tag Name</th>
                  <th>UnitId</th>
                  <th>Address Range</th>
                  <th>Reg 1</th>
                  <th>Reg 2</th>
                  <th>Raw Hex</th>
                  <th>Data Type</th>
                  <th>Byte/Word Order</th>
                  <th>Sim Base Setpoint</th>
                  <th>Decoded (Eng)</th>
                  <th>Unit</th>
                  <th>Quality</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredMap.map(reg => {
                  const val = modbusValues[reg.registerAddress];
                  const rawNum = val ? val.rawValue : 0;
                  // Fake float32 to two 16-bit registers simulation
                  const buffer = new ArrayBuffer(4);
                  const view = new DataView(buffer);
                  view.setFloat32(0, rawNum, false);
                  const reg1 = view.getUint16(0, false);
                  const reg2 = view.getUint16(2, false);
                  const rawHex = `0x${reg1.toString(16).padStart(4, '0')} 0x${reg2.toString(16).padStart(4, '0')}`;
                  
                  const conf = simulatorConfigs[reg.tagId];
                  const simBase = conf ? conf.baseValue : null;
                  
                  return (
                    <tr key={reg.registerAddress}>
                      <td className="val">{reg.tagId}</td>
                      <td>1</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{reg.registerAddress}--{reg.registerAddress+1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{reg1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{reg2}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{rawHex.toUpperCase()}</td>
                      <td>{reg.dataType}</td>
                      <td>CDAB (Word Swap)</td>
                      <td style={{ color: 'var(--text-muted)' }}>{simBase !== null ? simBase.toFixed(3) : '---'}</td>
                      <td>
                        {val ? <span style={{ color: val.quality === 'BAD' ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>{val.engineeringValue.toFixed(3)}</span> : '---'}
                      </td>
                      <td>{reg.unit}</td>
                      <td>
                        {val ? <span className={`badge ${val.quality === 'BAD' ? 'alarm' : (val.quality === 'COMM_LOSS' ? 'warning' : 'normal')}`}>{val.quality}</span> : '---'}
                      </td>
                      <td>{val ? new Date(val.lastUpdate).toLocaleTimeString() : '---'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'SIMULATOR' && (
        <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
          {/* Simulator Control Panel */}
          <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>PCW Loop Simulator Center</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={() => setSimulatorControl('START', simInterval)} disabled={simulatorStatus.isRunning} style={{ flex: 1, padding: '0.5rem', background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer', opacity: simulatorStatus.isRunning ? 0.5 : 1 }}>Start</button>
              <button onClick={() => setSimulatorControl('PAUSE')} disabled={!simulatorStatus.isRunning} style={{ flex: 1, padding: '0.5rem', background: 'var(--warning)', color: '#000', border: 'none', cursor: 'pointer', opacity: !simulatorStatus.isRunning ? 0.5 : 1 }}>Pause</button>
              <button onClick={() => setSimulatorControl('RESET')} style={{ flex: 1, padding: '0.5rem', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>Reset</button>
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <label>Update Interval (ms):</label>
              <input type="number" value={simInterval} onChange={e=>setSimInterval(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '2rem' }}>Default Loop Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              <div>
                <label>Target System</label>
                <select value={targetOverrideSystem} onChange={e=>setTargetOverrideSystem(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginTop: '0.2rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
                  <option value="">-- Select System --</option>
                  {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
                </select>
              </div>
              
              {targetOverrideSystem && (() => {
                const sysSensors = sensors.filter(s => s.systemId === targetOverrideSystem);
                const pt = sysSensors.find(s => s.measurementType === 'PRESSURE' && !s.tagId.includes('PDT'));
                const ft = sysSensors.find(s => s.measurementType === 'FLOW' || s.tagId.includes('FT'));
                const dp = sysSensors.find(s => s.measurementType === 'DP' || s.tagId.includes('PDT'));
                
                const renderLimitBox = (title: string, tag: typeof pt) => {
                  if (!tag) return <div style={{ background: '#222', padding: '0.2rem', borderRadius: '2px' }}><span style={{ color: 'var(--accent)' }}>{title}</span><br/>N/A</div>;
                  const l = tag.engineeringLimits;
                  return (
                    <div style={{ background: '#222', padding: '0.4rem', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.2rem', textAlign: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{title}</span>
                      <span style={{ fontWeight: 'bold' }}>Base: {l.baseline ?? 'N/A'}</span>
                      <span style={{ fontSize: '0.7rem', color: '#ff6b6b' }}>H/HH: {l.high}/{l.highHigh}</span>
                      <span style={{ fontSize: '0.7rem', color: '#4facfe' }}>L/LL: {l.low}/{l.lowLow}</span>
                    </div>
                  );
                };

                return (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ marginBottom: '0.4rem', color: '#fff', fontWeight: 'bold' }}>Limits for {targetOverrideSystem}:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      {renderLimitBox('PT', pt)}
                      {renderLimitBox('FT', ft)}
                      {renderLimitBox('DP', dp)}
                    </div>
                  </div>
                );
              })()}

              <button 
                onClick={applySuggestedBaselinesToSystem} 
                disabled={!targetOverrideSystem}
                style={{ padding: '0.5rem', background: targetOverrideSystem ? 'var(--success)' : '#555', color: '#fff', border: 'none', cursor: targetOverrideSystem ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}>
                Apply Suggested Baselines
              </button>
            </div>

            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginTop: '2rem' }}>Manual Tag Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem', fontSize: '0.85rem' }}>
              
              <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', color: 'var(--accent)' }}>1. Select Tags to Modify</label>
                <input type="text" placeholder="Search canonical tag" value={simSearchFilter} onChange={e=>setSimSearchFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', width: '100%' }} />
                <select value={simSysFilter} onChange={e=>setSimSysFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', width: '100%' }}>
                  <option value="">All Systems</option>
                  {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
                </select>
                <select value={simSubFilter} onChange={e=>setSimSubFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', width: '100%' }}>
                  <option value="">All Submains</option>
                  {Array.from({length: 20}).map((_, i) => <option key={i} value={`Submain${String(i+1).padStart(2,'0')}`}>{`Submain${String(i+1).padStart(2,'0')}`}</option>)}
                </select>
                <select value={simTypeFilter} onChange={e=>setSimTypeFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', width: '100%' }}>
                  <option value="">All Sensor Types</option>
                  <option value="PRESSURE">PT (Pressure)</option>
                  <option value="FLOW">FT (Flow)</option>
                  <option value="DP">DP/PDT (Diff Pressure)</option>
                </select>
                <button onClick={() => {
                  if (simSelectedTags.length === filteredSimSensors.length) {
                    setSimSelectedTags([]);
                  } else {
                    setSimSelectedTags(filteredSimSensors.map(s => s.tagId));
                    if (filteredSimSensors.length > 0) {
                      const first = filteredSimSensors[0];
                      const conf = simulatorConfigs[first.tagId];
                      if (conf) {
                        setSimBaseValue(conf.baseValue);
                        setSimNoise(conf.noise);
                        setSimHH(first.engineeringLimits.highHigh);
                        setSimH(first.engineeringLimits.high);
                        setSimL(first.engineeringLimits.low);
                        setSimLL(first.engineeringLimits.lowLow);
                      }
                    }
                  }
                }} style={{ padding: '0.5rem', background: '#555', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '0.2rem' }}>
                  {simSelectedTags.length === filteredSimSensors.length && filteredSimSensors.length > 0 ? 'Deselect All' : `Select All Displayed (${filteredSimSensors.length})`}
                </button>
              </div>

              {simSelectedTags.length > 0 && (() => {
                const firstTag = sensors.find(s => s.tagId === simSelectedTags[0]);
                if (!firstTag) return null;
                const l = firstTag.engineeringLimits;
                return (
                  <div style={{ background: '#222', padding: '0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: 'bold', marginBottom: '0.2rem' }}>Limits for {firstTag.tagId}:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                      <span style={{ fontWeight: 'bold', color: '#fff' }}>Base: {l.baseline ?? 'N/A'}</span>
                      <span style={{ color: '#ff6b6b' }}>H/HH: {l.high}/{l.highHigh}</span>
                      <span style={{ color: '#4facfe' }}>L/LL: {l.low}/{l.lowLow}</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', color: 'var(--accent)' }}>2. Inject Values</label>
              </div>
              <div>
                <label>Base Value</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" step="0.1" value={simBaseValue} onChange={e=>setSimBaseValue(Number(e.target.value))} style={{ flex: 1, padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                  <button onClick={applySuggestedBaselinesToSelected} style={{ padding: '0 0.5rem', background: '#444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }} title="Set to Default Baseline">Auto</button>
                </div>
              </div>
              <div>
                <label>Noise (±)</label>
                <input type="number" step="0.01" value={simNoise} onChange={e=>setSimNoise(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ color: '#ff6b6b' }}>High-High</label>
                  <input type="number" step="0.1" value={simHH} onChange={e=>setSimHH(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                </div>
                <div>
                  <label style={{ color: '#ff6b6b' }}>High</label>
                  <input type="number" step="0.1" value={simH} onChange={e=>setSimH(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                </div>
                <div>
                  <label style={{ color: '#4facfe' }}>Low</label>
                  <input type="number" step="0.1" value={simL} onChange={e=>setSimL(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                </div>
                <div>
                  <label style={{ color: '#4facfe' }}>Low-Low</label>
                  <input type="number" step="0.1" value={simLL} onChange={e=>setSimLL(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                </div>
              </div>
              <button onClick={applyConfig} style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                Apply to Selected Tags ({simSelectedTags.length})
              </button>
            </div>
          </div>

          {/* Tags Selection & Status */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
              <table style={{ fontSize: '0.8rem', width: '100%' }}>
                <thead>
                  <tr>
                    <th><input type="checkbox" onChange={e => {
                      const tags = e.target.checked ? filteredSimSensors.map(s=>s.tagId) : [];
                      setSimSelectedTags(tags);
                      if (tags.length > 0) {
                        const conf = simulatorConfigs[tags[0]];
                        if (conf) {
                          setSimBaseValue(conf.baseValue);
                          setSimNoise(conf.noise);
                          
                          const firstSensor = filteredSimSensors.find(s => s.tagId === tags[0]);
                          if (firstSensor) {
                            setSimHH(firstSensor.engineeringLimits.highHigh);
                            setSimH(firstSensor.engineeringLimits.high);
                            setSimL(firstSensor.engineeringLimits.low);
                            setSimLL(firstSensor.engineeringLimits.lowLow);
                          }
                        }
                      }
                    }} checked={simSelectedTags.length > 0 && simSelectedTags.length === filteredSimSensors.length} /></th>
                    <th>Tag</th>
                    <th>Live Value</th>
                    <th>Base Setpoint</th>
                    <th>Noise</th>
                    <th>Limits (HH/H/L/LL)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSimSensors.map(s => {
                    const conf = simulatorConfigs[s.tagId];
                    return (
                      <tr key={s.tagId}>
                        <td>
                          <input type="checkbox" checked={simSelectedTags.includes(s.tagId)} onChange={(e) => {
                            if (e.target.checked) {
                              setSimSelectedTags([...simSelectedTags, s.tagId]);
                              if (conf) {
                                setSimBaseValue(conf.baseValue);
                                setSimNoise(conf.noise);
                                setSimHH(s.engineeringLimits.highHigh);
                                setSimH(s.engineeringLimits.high);
                                setSimL(s.engineeringLimits.low);
                                setSimLL(s.engineeringLimits.lowLow);
                              }
                            } else {
                              setSimSelectedTags(simSelectedTags.filter(t => t !== s.tagId));
                            }
                          }} />
                        </td>
                        <td className="val">{s.tagId}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{s.value.toFixed(3)}</td>
                        <td>{conf?.baseValue.toFixed(2)}</td>
                        <td>{conf?.noise.toFixed(3)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: '#ff6b6b' }}>{s.engineeringLimits.highHigh.toFixed(2)}</span> / <span style={{ color: '#ff6b6b' }}>{s.engineeringLimits.high.toFixed(2)}</span> / <span style={{ color: '#4facfe' }}>{s.engineeringLimits.low.toFixed(2)}</span> / <span style={{ color: '#4facfe' }}>{s.engineeringLimits.lowLow.toFixed(2)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
