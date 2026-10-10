import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useScadaStore } from '../store/scadaStore';

export const SubmainDetail = () => {
  const { systemId = 'PCW01' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const systems = useScadaStore(state => state.systems);
  const allSubmains = useScadaStore(state => state.submains);
  const allSensors = useScadaStore(state => state.sensors);
  const alarms = useScadaStore(state => state.alarms);
  const openTagDetail = useScadaStore(state => state.openTagDetail);

  const submains = allSubmains.filter(sm => sm.systemId === systemId);
  const sensors = allSensors.filter(s => s.systemId === systemId);

  const [activeSubmainId, setActiveSubmainId] = useState<string>(searchParams.get('submainId') || 'Submain01');

  useEffect(() => {
    if (submains.length > 0 && !submains.find(s => s.submainId === activeSubmainId)) {
      setActiveSubmainId(submains[0].submainId);
    }
  }, [submains, activeSubmainId]);

  const activeSubmain = submains.find(sm => sm.submainId === activeSubmainId);

  const getSensor = (measurement: string) => {
    return sensors.find(s => s.tagId === `${systemId}.${activeSubmainId}.${measurement}`);
  };

  const getSensorAlarm = (tagId: string) => {
    return alarms.find(a => a.tagId === tagId && (a.state.startsWith('ACTIVE') || a.state === 'CLEARED_UNACK'));
  };

  const renderSensorValue = (sensor: any) => {
    if (!sensor || sensor.quality === 'BAD' || sensor.status === 'ERROR') {
      return (
        <g>
          <text x="30" y="5" fill="var(--danger)" fontSize="12" fontWeight="bold">BAD QUALITY</text>
          {sensor && <text x="30" y="20" fill="var(--text-muted)" fontSize="9">{new Date(sensor.timestamp).toLocaleTimeString()}</text>}
        </g>
      );
    }
    const alm = getSensorAlarm(sensor.tagId);
    const color = alm ? (alm.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)') : '#fff';
    return (
      <g>
        <text x="30" y="5" fill={color} fontFamily="var(--font-mono)" fontSize="16" fontWeight="bold">
          {sensor.value.toFixed(2)} <tspan fontSize="10">{sensor.unit}</tspan>
        </text>
        <text x="30" y="20" fill="var(--text-muted)" fontSize="9">{new Date(sensor.timestamp).toLocaleTimeString()}</text>
      </g>
    );
  };

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'var(--panel-bg)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '0.5rem 1rem', cursor: 'pointer', borderRadius: '4px' }}>
          &larr; Overview
        </button>
        <h2>PCW Submain P&ID</h2>
        <select 
          value={systemId} 
          onChange={(e) => navigate(`/submain/${e.target.value}`)}
          style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', marginLeft: 'auto' }}
        >
          {['PCW01','PCW02','PCW03','PCW04','PCW05','PCW06','PCW07','PCW08'].map(sys => (
            <option key={sys} value={sys}>{sys}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* Left: Submain List */}
        <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <h3 style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>{systemId} Submains ({submains.length})</h3>
          <div style={{ padding: '0.5rem' }}>
            {submains.map(sm => {
              const isActive = sm.submainId === activeSubmainId;
              const hasActiveAlarm = alarms.some(a => a.systemId === systemId && a.submainId === sm.submainId && a.state.startsWith('ACTIVE'));
              const hasUnackAlarm = alarms.some(a => a.systemId === systemId && a.submainId === sm.submainId && a.state === 'CLEARED_UNACK');
              return (
                <div 
                  key={sm.submainId}
                  onClick={() => setActiveSubmainId(sm.submainId)}
                  style={{
                    padding: '0.8rem', 
                    marginBottom: '0.5rem', 
                    background: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    borderLeft: hasActiveAlarm ? '4px solid var(--danger)' : (hasUnackAlarm ? '4px solid var(--warning)' : '4px solid transparent'),
                    cursor: 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{sm.displayName}</strong>
                    {hasActiveAlarm ? <span className="badge alarm">ALARM</span> : (hasUnackAlarm && <span className="badge warning">UNACK</span>)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: isActive ? '#ddd' : 'var(--text-muted)' }}>
                    Tags: {sm.supplyTags.length + sm.returnTags.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Submain P&ID Detail */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
            <h3>{systemId} - {activeSubmain?.displayName} Process View</h3>
          </div>
          <div style={{ flex: 1, background: '#111', position: 'relative', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="600" height="800" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid meet">
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

              {/* Main Headers */}
              <path d="M 50 150 L 550 150" stroke="url(#pipeSupplyLg)" strokeWidth="16" fill="none" />
              <text x="60" y="130" fill="#2F91D1" fontSize="16" fontWeight="bold">SUPPLY MAIN HEADER ({systemId})</text>
              <polygon points="520,140 540,150 520,160" fill="#fff" />

              <path d="M 50 700 L 550 700" stroke="url(#pipeReturnLg)" strokeWidth="16" fill="none" />
              <text x="60" y="730" fill="#D45A4A" fontSize="16" fontWeight="bold">RETURN MAIN HEADER ({systemId})</text>
              <polygon points="80,690 60,700 80,710" fill="#fff" />

              {(() => {
                const smSensors = sensors.filter(s => s.submainId === activeSubmainId);
                const pts = smSensors.find(s => s.tagId.endsWith('PTS') || s.tagId.endsWith('PT1S'));
                const ptr = smSensors.find(s => s.tagId.endsWith('PTR') || s.tagId.endsWith('PT1R'));
                const pdt = smSensors.find(s => s.tagId.includes('PDT') || s.measurementType === 'DP');
                const ft = smSensors.find(s => s.tagId.includes('FT') || s.measurementType === 'FLOW');
                const toolName = activeSubmainId ? activeSubmainId.replace('Submain', 'TOOL') : 'TOOL';

                return (
                  <g>
                    {/* Submain Branch Background */}
                    <rect x="220" y="180" width="160" height="500" fill="rgba(255,255,255,0.02)" rx="4" pointerEvents="none" />
                    
                    {/* Supply Downward Pipe */}
                    <path d="M 300 150 L 300 380" stroke="url(#pipeSupplyLg)" strokeWidth="8" fill="none" pointerEvents="none" />
                    <polygon points="295,360 305,360 300,375" fill="#2F91D1" pointerEvents="none" />
                    
                    {/* PTS */}
                    {pts ? (
                      <g transform="translate(300, 240)" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pts.tagId); }} style={{ cursor: 'pointer' }}>
                        <circle cx="0" cy="0" r="24" fill="#222" stroke={pts.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                        <text x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle">PT</text>
                        <text x="35" y="-5" fill={pts.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="16" fontWeight="bold" textAnchor="start">{pts.value.toFixed(2)}</text>
                        <text x="35" y="10" fill="#aaa" fontSize="12" textAnchor="start">{pts.displayTag}</text>
                      </g>
                    ) : (
                      <g transform="translate(300, 240)">
                        <circle cx="0" cy="0" r="24" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" pointerEvents="none" />
                        <text x="0" y="5" fill="#555" fontSize="14" textAnchor="middle" pointerEvents="none">PT</text>
                        <text x="35" y="5" fill="#555" fontSize="12" textAnchor="start" pointerEvents="none">NO DATA</text>
                      </g>
                    )}

                    {/* Valve */}
                    <g transform="translate(300, 310)" pointerEvents="none">
                       <polygon points="-15,-10 -15,10 15,-10 15,10" fill="#333" stroke="#aaa" strokeWidth="2" />
                    </g>

                    {/* TOOL Box */}
                    <g transform="translate(260, 380)" pointerEvents="none">
                      <rect x="0" y="0" width="80" height="90" fill="#252525" stroke="#4B4B4B" strokeWidth="2" rx="4" />
                      <text x="40" y="50" fill="#B8B8B8" fontSize="16" textAnchor="middle" fontWeight="bold">{toolName}</text>
                    </g>

                    {/* Flow Meter */}
                    {ft ? (
                      <g transform="translate(300, 490)" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ft.tagId); }} style={{ cursor: 'pointer' }}>
                        <circle cx="0" cy="0" r="24" fill="#222" stroke={ft.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                        <text x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle">FT</text>
                        <text x="35" y="-5" fill={ft.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="16" fontWeight="bold" textAnchor="start">{ft.value.toFixed(2)}</text>
                        <text x="35" y="10" fill="#aaa" fontSize="12" textAnchor="start">{ft.displayTag}</text>
                      </g>
                    ) : (
                      <g transform="translate(300, 490)">
                        <circle cx="0" cy="0" r="24" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" pointerEvents="none" />
                        <text x="0" y="5" fill="#555" fontSize="14" textAnchor="middle" pointerEvents="none">FT</text>
                        <text x="35" y="5" fill="#555" fontSize="12" textAnchor="start" pointerEvents="none">NO DATA</text>
                      </g>
                    )}

                    {/* Return Downward Pipe */}
                    <path d="M 300 470 L 300 700" stroke="url(#pipeReturnLg)" strokeWidth="8" fill="none" pointerEvents="none" />
                    <polygon points="295,680 305,680 300,695" fill="#D45A4A" pointerEvents="none" />

                    {/* PTR */}
                    {ptr ? (
                      <g transform="translate(300, 600)" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(ptr.tagId); }} style={{ cursor: 'pointer' }}>
                        <circle cx="0" cy="0" r="24" fill="#222" stroke={ptr.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                        <text x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle">PT</text>
                        <text x="35" y="-5" fill={ptr.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="16" fontWeight="bold" textAnchor="start">{ptr.value.toFixed(2)}</text>
                        <text x="35" y="10" fill="#aaa" fontSize="12" textAnchor="start">{ptr.displayTag}</text>
                      </g>
                    ) : (
                      <g transform="translate(300, 600)">
                        <circle cx="0" cy="0" r="24" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" pointerEvents="none" />
                        <text x="0" y="5" fill="#555" fontSize="14" textAnchor="middle" pointerEvents="none">PT</text>
                        <text x="35" y="5" fill="#555" fontSize="12" textAnchor="start" pointerEvents="none">NO DATA</text>
                      </g>
                    )}

                    {/* PDT */}
                    {pdt ? (
                      <g transform="translate(180, 420)" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openTagDetail(pdt.tagId); }} style={{ cursor: 'pointer' }}>
                        <circle cx="0" cy="0" r="24" fill="#222" stroke={pdt.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                        <text x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle">PDT</text>
                        <text x="35" y="5" fill={pdt.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="16" fontWeight="bold" textAnchor="start">{pdt.value.toFixed(2)}</text>
                        
                        <path d="M 0 -24 L 0 -150 L 100 -150" stroke="#888" strokeWidth="2" strokeDasharray="4 4" fill="none" pointerEvents="none" />
                        <path d="M 0 24 L 0 200 L 100 200" stroke="#888" strokeWidth="2" strokeDasharray="4 4" fill="none" pointerEvents="none" />
                      </g>
                    ) : (
                      <g transform="translate(180, 420)">
                        <circle cx="0" cy="0" r="24" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" pointerEvents="none" />
                        <text x="0" y="5" fill="#555" fontSize="14" textAnchor="middle" pointerEvents="none">PDT</text>
                        <text x="35" y="5" fill="#555" fontSize="12" textAnchor="start" pointerEvents="none">NO DATA</text>
                      </g>
                    )}
                  </g>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
