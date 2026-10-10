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
          <button onClick={() => setViewMode('PROCESS')} style={{ background: viewMode === 'PROCESS' ? 'var(--accent)' : '#333', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', marginRight: '0.5rem', cursor: 'pointer' }}>Process View</button>
          <button onClick={() => setViewMode('TABLE')} style={{ background: viewMode === 'TABLE' ? 'var(--accent)' : '#333', color: '#fff', border: 'none', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Table View</button>
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
            style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
          />
          <select value={sysFilter} onChange={e => setSysFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Systems</option>
            {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
          </select>
          <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Submains</option>
            {Array.from(new Set(sensors.filter(s => !sysFilter || s.systemId === sysFilter).map(s => s.submainId))).map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
          <select value={measFilter} onChange={e => setMeasFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Measurements</option>
            <option value="PRESSURE">Pressure</option>
            <option value="TEMPERATURE">Temperature</option>
            <option value="FLOW">Flow</option>
          </select>
          <select value={posFilter} onChange={e => setPosFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Positions</option>
            <option value="SUPPLY">Supply</option>
            <option value="RETURN">Return</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Status</option>
            <option value="NORMAL">NORMAL</option>
            <option value="WARNING">WARNING</option>
            <option value="ALARM">ALARM</option>
            <option value="ERROR">ERROR</option>
          </select>
          <select value={qualityFilter} onChange={e => setQualityFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Quality</option>
            <option value="GOOD">GOOD</option>
            <option value="BAD">BAD</option>
            <option value="UNCERTAIN">UNCERTAIN</option>
          </select>
          <select value={alarmStateFilter} onChange={e => setAlarmStateFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
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
             
             <div style={{ flex: 1, background: '#111', position: 'relative', overflow: 'auto' }}>
                <svg width="3400" height="900" style={{ minWidth: '3400px' }} viewBox="0 0 3400 900">
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
                  <path d="M 50 150 L 3300 150" stroke="url(#pipeSupplyLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="130" fill="#2F91D1" fontSize="18" fontWeight="bold">SUPPLY MAIN HEADER ({selectedPcw})</text>
                  <polygon points="3250,140 3270,150 3250,160" fill="#fff" />

                  {/* Main Return Header */}
                  <path d="M 50 750 L 3300 750" stroke="url(#pipeReturnLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="780" fill="#D45A4A" fontSize="18" fontWeight="bold">RETURN MAIN HEADER ({selectedPcw})</text>
                  <polygon points="3250,740 3270,750 3250,760" fill="#fff" />

                  {/* Map over all 20 submains for this PCW */}
                  {Array.from({length:20}, (_,i)=>`Submain${String(i+1).padStart(2,'0')}`).map((sm, idx) => {
                    const xBase = 150 + idx * 160;
                    
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
                        <text x={xBase} y="80" fill="#666" fontSize="14" textAnchor="middle" fontWeight="bold">FAB L40 / F{14 + idx}</text>
                        <line x1={xBase} y1="90" x2={xBase} y2="800" stroke="#333" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" />
                        
                        <text x={xBase} y="200" fill={isSelected ? '#fff' : (hasAlarm ? 'var(--danger)' : '#aaa')} fontSize="14" textAnchor="middle" fontWeight="bold">{sm}</text>
                        
                        {/* Supply Branch Pipe */}
                        <path d={`M ${xBase} 150 L ${xBase} 440`} stroke="url(#pipeSupplyLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={`${xBase - 5},420 ${xBase + 5},420 ${xBase},430`} fill="#2F91D1" pointerEvents="none" />
                        
                        {/* Render PTS */}
                        {pts ? (
                          <g transform={`translate(${xBase}, 240)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pts.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pts.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={pts.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pts.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={`translate(${xBase}, 240)`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}

                        {/* Valve */}
                        <g transform={`translate(${xBase}, 310)`} pointerEvents="none">
                           <polygon points="-12,-8 -12,8 12,-8 12,8" fill="#333" stroke="#aaa" strokeWidth="2" />
                        </g>

                        {/* FAB TOOL BOX */}
                        <g transform={`translate(${xBase - 35}, 380)`} pointerEvents="none">
                          <rect x="0" y="0" width="70" height="60" fill="#252525" stroke="#4B4B4B" strokeWidth="2" rx="4" />
                          <text x="35" y="35" fill="#B8B8B8" fontSize="12" textAnchor="middle" fontWeight="bold">TOOL{String(idx + 1).padStart(2, '0')}</text>
                        </g>

                        {/* Return Branch Pipe */}
                        <path d={`M ${xBase} 440 L ${xBase} 750`} stroke="url(#pipeReturnLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={`${xBase - 5},730 ${xBase + 5},730 ${xBase},745`} fill="#D45A4A" pointerEvents="none" />

                        {/* Render PTR */}
                        {ptr ? (
                          <g transform={`translate(${xBase}, 510)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ptr.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={ptr.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={ptr.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{ptr.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={`translate(${xBase}, 510)`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}

                        {/* Render PDT */}
                        {pdt ? (
                          <g transform={`translate(${xBase}, 600)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pdt.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pdt.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">DP</text>
                            <text x="-25" y="4" fill={pdt.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pdt.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={`translate(${xBase}, 600)`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">DP</text>
                          </g>
                        )}

                        {/* Flow Meter FT */}
                        {ft ? (
                          <g transform={`translate(${xBase}, 690)`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ft.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={ft.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">FT</text>
                            <text x="-25" y="4" fill={ft.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{ft.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={`translate(${xBase}, 690)`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">FT</text>
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
