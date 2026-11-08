import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useScadaStore } from '../store/scadaStore';
import { pcwDataService } from '../services/PcwDataService';

export const LiveSensors = () => {
  const sensors = useScadaStore(state => state.sensors);
  const lastFetch = useScadaStore(state => state.lastFetch);
  const navigate = useNavigate();
  
  // Filters
  const [search, setSearch] = useState('');
  const [sysFilter, setSysFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [measFilter, setMeasFilter] = useState('');
  const [posFilter, setPosFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [alarmStateFilter, setAlarmStateFilter] = useState('');
  
  const openTagDetail = useScadaStore(state => state.openTagDetail);

  const filteredSensors = sensors.filter(s => {
    if (search && !s.tagId.toLowerCase().includes(search.toLowerCase())) return false;
    if (sysFilter && s.systemId !== sysFilter) return false;
    if (subFilter && s.submainId !== subFilter) return false;
    if (measFilter && s.measurementType !== measFilter) return false;
    if (posFilter && s.position !== posFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (qualityFilter && s.quality !== qualityFilter) return false;
    if (alarmStateFilter && s.alarmState !== alarmStateFilter) return false;
    return true;
  });

  const [searchParams] = useSearchParams();
  const querySystemId = searchParams.get('systemId');
  
  const [viewMode, setViewMode] = useState<'PROCESS' | 'TABLE'>('PROCESS');
  const [selectedPcw, setSelectedPcw] = useState(querySystemId || 'PCW01');
  const [selectedSubmain, setSelectedSubmain] = useState('Submain01');

  useEffect(() => {
    if (querySystemId) {
      setSelectedPcw(querySystemId);
    }
  }, [querySystemId]);

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Global Status Bar (simplified for HMI) */}
      <div style={{ background: 'var(--panel-bg)', padding: '0.5rem 1rem', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>ENV:</span> SIMULATION | <span style={{ color: 'var(--text-muted)' }}>SOURCE:</span> SENSOR_SIMULATOR | <span style={{ color: 'var(--text-muted)' }}>COMM:</span> <span style={{ color: 'var(--success)' }}>ONLINE</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>LAST UPDATE:</span> {lastFetch ? new Date(lastFetch).toLocaleTimeString() : '...'}
        </div>
        <div>
          <button onClick={() => setViewMode('PROCESS')} style={{ background: viewMode === 'PROCESS' ? '#000000' : '#ffffff', color: viewMode === 'PROCESS' ? '#ffffff' : '#000000', border: '1.5px solid #000000', padding: '0.25rem 0.65rem', marginRight: '0.5rem', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>Process View</button>
          <button onClick={() => setViewMode('TABLE')} style={{ background: viewMode === 'TABLE' ? '#000000' : '#ffffff', color: viewMode === 'TABLE' ? '#ffffff' : '#000000', border: '1.5px solid #000000', padding: '0.25rem 0.65rem', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>Table View</button>
        </div>
      </div>
      
      {viewMode === 'TABLE' ? (
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Filter Bar */}
        <div className="card" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.5rem 1rem' }}>
          <input 
            type="text" 
            placeholder="Search Canonical Tag..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000', borderRadius: '4px' }}
          />
          <select value={sysFilter} onChange={e => setSysFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Systems</option>
            {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
          </select>
          <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Submains</option>
            {Array.from(new Set(sensors.filter(s => !sysFilter || s.systemId === sysFilter).map(s => s.submainId))).map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
          <select value={measFilter} onChange={e => setMeasFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Measurements</option>
            <option value="PRESSURE">Pressure</option>
            <option value="TEMPERATURE">Temperature</option>
            <option value="FLOW">Flow</option>
          </select>
          <select value={posFilter} onChange={e => setPosFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Positions</option>
            <option value="SUPPLY">Supply</option>
            <option value="RETURN">Return</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Status</option>
            <option value="NORMAL">NORMAL</option>
            <option value="WARNING">WARNING</option>
            <option value="ALARM">ALARM</option>
            <option value="ERROR">ERROR</option>
          </select>
          <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Quality</option>
            <option value="GOOD">GOOD</option>
            <option value="BAD">BAD</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
          <select value={alarmStateFilter} onChange={e => setAlarmStateFilter(e.target.value)} style={{ padding: '0.25rem', background: '#ffffff', border: '1.5px solid #000000', color: '#000000', color: '#000000', border: '1.5px solid #000000' }}>
            <option value="">All Alarm States</option>
            <option value="NONE">NONE</option>
            <option value="HIHI">HIHI</option>
            <option value="HI">HI</option>
            <option value="LO">LO</option>
            <option value="LOLO">LOLO</option>
          </select>
        </div>

        <div className="card table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
              <tr>
                <th>Canonical Tag</th>
                <th>Display</th>
                <th>System</th>
                <th>Submain</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Alarm</th>
                <th>Timestamp</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {filteredSensors.map(s => {
                 const isAlarm = s.value > s.engineeringLimits.high;
                 const stateClass = isAlarm ? 'alarm' : 'normal';
                 return (
                  <tr 
                    key={s.tagId} 
                    style={{ cursor: 'pointer', background: 'transparent' }}
                    onClick={() => openTagDetail(s.tagId)}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td>{s.tagId}</td>
                    <td>{s.displayTag}</td>
                    <td>{s.systemId}</td>
                    <td>{s.submainId}</td>
                    <td className="val" style={{ color: isAlarm ? 'var(--danger)' : 'var(--text-main)' }}>
                      {s.value.toFixed(3)}
                    </td>
                    <td>{s.unit}</td>
                    <td><span className={`badge ${s.quality === 'GOOD' ? 'normal' : 'warning'}`}>{s.quality}</span></td>
                    <td><span className={`badge ${stateClass}`}>{isAlarm ? 'WARNING' : s.status}</span></td>
                    <td><span className={`badge ${s.alarmState !== 'NONE' ? 'alarm' : 'neutral'}`}>{s.alarmState}</span></td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.timestamp).toLocaleTimeString()}</td>
                    <td>{s.source}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSensors.length === 0 && <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sensors match the filters.</div>}
        </div>
      </div>
      ) : (
        <div style={{ flex: '1', display: 'flex', gap: '1rem', height: '100%' }}>
          {/* System Tree Left Panel */}
          <div className="card" style={{ width: '250px', overflowY: 'auto' }}>
            <h3>System Tree</h3>
            {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => (
              <div key={sys} style={{ marginTop: '0.5rem' }}>
                <div 
                  onClick={() => setSelectedPcw(sys)}
                  style={{ fontWeight: 'bold', cursor: 'pointer', padding: '0.25rem', background: selectedPcw === sys ? 'var(--accent)' : 'transparent', color: selectedPcw === sys ? '#fff' : 'var(--text-main)' }}
                >
                  {sys}
                </div>
                {selectedPcw === sys && (
                  <div style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border)', paddingLeft: '0.5rem' }}>
                    {Array.from(new Set(sensors.filter(s => s.systemId === sys).map(s => s.submainId))).map(sm => (
                      <div 
                        key={sm} 
                        onClick={() => setSelectedSubmain(sm)}
                        style={{ cursor: 'pointer', padding: '0.2rem', color: selectedSubmain === sm ? 'var(--accent)' : 'var(--text-muted)' }}
                      >
                        {sm}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Process Mimic Right Panel */}
          <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 0 }}>
             {/* Mimic Canvas Placeholder */}
             <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
               <h3>{selectedPcw} Process Overview</h3>
             </div>
             
             <div style={{ flex: 1, background: '#ffffff', border: '1.5px solid #000000', position: 'relative', overflow: 'auto' }}>
                <svg width="1800" height="900" style={{ minWidth: '1800px' }} viewBox="0 0 1800 900">
                  <defs>
                    <linearGradient id="pipeSupplyLg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#2F91D1" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#1E6596" stopOpacity="1"/>
                    </linearGradient>
                    <linearGradient id="pipeReturnLg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#D45A4A" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#963D32" stopOpacity="1"/>
                    </linearGradient>
                  </defs>

                  {/* Main Supply Header */}
                  <path d="M 50 150 L 1750 150" stroke="url(#pipeSupplyLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="130" fill="#2F91D1" fontSize="18" fontWeight="bold">SUPPLY MAIN HEADER ({selectedPcw})</text>
                  <polygon points="1730,140 1750,150 1730,160" fill="#000000" />

                  {/* Main Return Header */}
                  <path d="M 50 750 L 1750 750" stroke="url(#pipeReturnLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="780" fill="#D45A4A" fontSize="18" fontWeight="bold">RETURN MAIN HEADER ({selectedPcw})</text>
                  <polygon points="70,740 50,750 70,760" fill="#000000" />

                  {/* Map over strictly the 10 real submains for this PCW loop */}
                  {Array.from({length: 10}, (_, i) => `Submain${String(i + 1).padStart(2, '0')}`).map((sm, idx) => {
                    const xBase = 120 + idx * 165;
                    
                    const smSensors = sensors.filter(s => s.systemId === selectedPcw && s.submainId === sm);
                    const pts = smSensors.find(s => s.tagId.endsWith('PTS') || s.tagId.endsWith('PT1S'));
                    const ptr = smSensors.find(s => s.tagId.endsWith('PTR') || s.tagId.endsWith('PT1R'));
                    const pdt = smSensors.find(s => s.tagId.includes('PDT') || s.measurementType === 'DP');
                    const ft = smSensors.find(s => s.tagId.includes('FT') || s.measurementType === 'FLOW');
                    
                    const isSelected = selectedSubmain === sm;
                    const hasAlarm = smSensors.some(s => s.alarmState !== 'NONE');

                    return (
                      <g key={sm} opacity={isSelected ? 1 : (hasAlarm ? 0.9 : 0.6)} onClick={() => navigate(`/submain/${selectedPcw}?submainId=${sm}`)} style={{ cursor: 'pointer', transition: '0.2s' }}>
                        {/* Submain Background Highlights */}
                        <rect x={xBase - 60} y={180} width="120" height="540" fill={isSelected ? 'rgba(255,255,255,0.08)' : (hasAlarm ? 'rgba(239,68,68,0.1)' : 'transparent')} rx="4" />
                        
                        {/* Floor Reference Grid text */}
                        <text x={xBase} y="80" fill="#000000" fontSize="14" textAnchor="middle" fontWeight="bold">FAB L40 / F{14 + idx}</text>
                        <line x1={xBase} y1="90" x2={xBase} y2="800" stroke="#cccccc" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" />
                        
                        <text x={xBase} y="200" fill='#000000' fontSize="14" textAnchor="middle" fontWeight="bold">{sm}</text>
                        
                        {/* Supply Branch Pipe */}
                        <path d={`M ${xBase} 150 L ${xBase} 440`} stroke="url(#pipeSupplyLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={`${xBase - 5},420 ${xBase + 5},420 ${xBase},430`} fill="#2F91D1" pointerEvents="none" />
                        
                        {/* Render PTS: Circle (○) */}
                        {pts && (
                          <g transform={`translate(${xBase}, 240)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pts.tagId); }}>
                            <circle 
                              cx="0" cy="0" r="18" fill="#ffffff" 
                              stroke={pts.alarmState === 'ALARM' ? '#000000' : pts.alarmState === 'WARNING' ? '#b45309' : '#000000'} 
                              strokeWidth={pts.alarmState === 'ALARM' ? '3' : pts.alarmState === 'WARNING' ? '2.5' : '1.5'} 
                              strokeDasharray={pts.alarmState === 'WARNING' ? '3 2' : undefined} 
                            />
                            <text x="0" y="4" fill="#000000" fontSize="11" fontWeight="bold" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill="#000000" fontSize="14" fontWeight="900" textAnchor="end">{pts.value.toFixed(2)}</text>
                          </g>
                        )}

                        {/* Valve */}
                        <g transform={`translate(${xBase}, 310)`} pointerEvents="none">
                           <polygon points="-12,-8 -12,8 12,-8 12,8" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                        </g>

                        {/* FAB TOOL BOX (TOOL01~TOOL10) */}
                        <g transform={`translate(${xBase - 35}, 380)`} pointerEvents="none">
                          <rect x="0" y="0" width="70" height="60" fill="#ffffff" stroke="#000000" strokeWidth="2" rx="4" />
                          <text x="35" y="35" fill="#000000" fontSize="12" textAnchor="middle" fontWeight="bold">TOOL{String(idx + 1).padStart(2, '0')}</text>
                        </g>

                        {/* Return Branch Pipe */}
                        <path d={`M ${xBase} 440 L ${xBase} 750`} stroke="url(#pipeReturnLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={`${xBase - 5},730 ${xBase + 5},730 ${xBase},745`} fill="#D45A4A" pointerEvents="none" />

                        {/* Render PTR: Circle (○) */}
                        {ptr && (
                          <g transform={`translate(${xBase}, 510)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ptr.tagId); }}>
                            <circle 
                              cx="0" cy="0" r="18" fill="#ffffff" 
                              stroke={ptr.alarmState === 'ALARM' ? '#000000' : ptr.alarmState === 'WARNING' ? '#b45309' : '#000000'} 
                              strokeWidth={ptr.alarmState === 'ALARM' ? '3' : ptr.alarmState === 'WARNING' ? '2.5' : '1.5'} 
                              strokeDasharray={ptr.alarmState === 'WARNING' ? '3 2' : undefined} 
                            />
                            <text x="0" y="4" fill="#000000" fontSize="11" fontWeight="bold" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill="#000000" fontSize="14" fontWeight="900" textAnchor="end">{ptr.value.toFixed(2)}</text>
                          </g>
                        )}

                        {/* Render PDT: Concentric Double Circles (◎) */}
                        {pdt && (
                          <g transform={`translate(${xBase}, 600)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pdt.tagId); }}>
                            <circle 
                              cx="0" cy="0" r="18" fill="#ffffff" 
                              stroke={pdt.alarmState === 'ALARM' ? '#000000' : pdt.alarmState === 'WARNING' ? '#b45309' : '#000000'} 
                              strokeWidth={pdt.alarmState === 'ALARM' ? '3' : pdt.alarmState === 'WARNING' ? '2.5' : '1.5'} 
                              strokeDasharray={pdt.alarmState === 'WARNING' ? '3 2' : undefined} 
                            />
                            <circle cx="0" cy="0" r="12" fill="none" stroke="#000000" strokeWidth="1" />
                            <text x="0" y="4" fill="#000000" fontSize="10" fontWeight="bold" textAnchor="middle">DP</text>
                            <text x="-25" y="4" fill="#000000" fontSize="14" fontWeight="900" textAnchor="end">{pdt.value.toFixed(2)}</text>
                          </g>
                        )}

                        {/* Flow Meter FT: Square Shape (□) */}
                        {ft && (
                          <g transform={`translate(${xBase}, 690)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ft.tagId); }}>
                            <rect 
                              x="-18" y="-18" width="36" height="36" rx="3" fill="#ffffff" 
                              stroke={ft.alarmState === 'ALARM' ? '#000000' : ft.alarmState === 'WARNING' ? '#b45309' : '#000000'} 
                              strokeWidth={ft.alarmState === 'ALARM' ? '3' : ft.alarmState === 'WARNING' ? '2.5' : '1.5'} 
                              strokeDasharray={ft.alarmState === 'WARNING' ? '3 2' : undefined} 
                            />
                            <text x="0" y="4" fill="#000000" fontSize="11" fontWeight="bold" textAnchor="middle">FT</text>
                            <text x="-25" y="4" fill="#000000" fontSize="14" fontWeight="900" textAnchor="end">{ft.value.toFixed(2)}</text>
                          </g>
                        )}
                        
                      </g>
                    );
                  })}
                </svg>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
