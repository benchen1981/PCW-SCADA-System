import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScadaStore } from '../store/scadaStore';
import { pcwDataService } from '../services/PcwDataService';
import type { AlarmEvent } from '../domain/alarmTypes';

export const ActiveAlarms = () => {
  const activeAlarmsStore = useScadaStore(state => state.alarms);
  const ackAlarm = useScadaStore(state => state.acknowledgeAlarm);
  const acknowledgeAllAlarms = useScadaStore(state => state.acknowledgeAllAlarms);
  const shelveAlarm = useScadaStore(state => state.shelveAlarm);
  const openTagDetail = useScadaStore(state => state.openTagDetail);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORICAL'>('ACTIVE');
  const [historicalAlarms, setHistoricalAlarms] = useState<AlarmEvent[]>([]);
  
  // Filters
  const [sysFilter, setSysFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [searchTag, setSearchTag] = useState('');
  const [timeRangeStr, setTimeRangeStr] = useState('Last 2 hours');
  
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const getInitialTime = () => {
    const end = new Date();
    const start = new Date(end.getTime() - 2 * 60 * 60 * 1000);
    return { start: toLocalISOString(start), end: toLocalISOString(end) };
  };
  
  const [startTime, setStartTime] = useState(getInitialTime().start);
  const [endTime, setEndTime] = useState(getInitialTime().end);

  // Selected for detail panel
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmEvent | null>(null);

  const fetchHistorical = () => {
    pcwDataService.getAlarmHistory({ startTime: new Date(startTime).toISOString(), endTime: new Date(endTime).toISOString() }).then(setHistoricalAlarms);
  };

  useEffect(() => {
    if (activeTab === 'HISTORICAL') {
      fetchHistorical();
    }
  }, [activeTab]); // Fetch initially when switching

  // Format helper for timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'DATA_ERROR';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'DATA_ERROR';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const rawData = activeTab === 'ACTIVE' ? activeAlarmsStore : historicalAlarms;

  const filteredAlarms = rawData.filter(a => {
    if (sysFilter && a.systemId !== sysFilter) return false;
    if (subFilter && a.submainId !== subFilter) return false;
    if (priorityFilter && a.priority !== priorityFilter) return false;
    if (stateFilter && a.state !== stateFilter) return false;
    if (searchTag && !a.tagId.toLowerCase().includes(searchTag.toLowerCase())) return false;
    
    // For ACTIVE tab, we don't strictly filter out by time if it's still active.
    // For HISTORICAL tab, it is pre-filtered by the API.
    return true;
  });

  const handleTimeRangeSelect = (val: string) => {
    setTimeRangeStr(val);
    const end = new Date();
    let start = new Date();
    switch(val) {
      case 'Last 30 min': start = new Date(end.getTime() - 30*60000); break;
      case 'Last 1 hour': start = new Date(end.getTime() - 60*60000); break;
      case 'Last 2 hours': start = new Date(end.getTime() - 120*60000); break;
      case 'Last 8 hours': start = new Date(end.getTime() - 8*3600*1000); break;
      case 'Last 24 hours': start = new Date(end.getTime() - 24*3600*1000); break;
      default: return; // custom
    }
    setStartTime(toLocalISOString(start));
    setEndTime(toLocalISOString(end));
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'CRITICAL': return 'var(--danger)';
      case 'HIGH': return 'var(--warning)';
      case 'MEDIUM': return '#38bdf8';
      default: return 'var(--text-main)';
    }
  };

  const getDuration = (start: string, end: string | null) => {
    const diff = new Date(end || Date.now()).getTime() - new Date(start).getTime();
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${m}m ${s}s`;
  };

  const exportCSV = () => {
    if (filteredAlarms.length === 0) return;
    const header = "AlarmID,TagID,System,Submain,Type,Priority,State,Message,Value,Limit,Unit,ActivatedAt,AcknowledgedAt,ClearedAt,Duration,Source";
    const rows = filteredAlarms.map(a => 
      [a.alarmId, a.tagId, a.systemId, a.submainId, a.alarmType, a.priority, a.state, a.message, a.value, a.limit, a.unit, a.activatedAt, a.acknowledgedAt||'', a.clearedAt||'', getDuration(a.activatedAt, a.clearedAt), a.source].join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `alarm_export_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="dashboard-section" style={{ display: 'flex', gap: '1rem', height: '100%' }}>
      {/* Main List */}
      <div style={{ flex: selectedAlarm ? '2' : '1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Alarm Center ({filteredAlarms.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setActiveTab('ACTIVE')} style={{ padding: '0.5rem 1rem', background: activeTab === 'ACTIVE' ? 'var(--accent)' : '#333', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Active Alarms</button>
            <button onClick={() => setActiveTab('HISTORICAL')} style={{ padding: '0.5rem 1rem', background: activeTab === 'HISTORICAL' ? 'var(--accent)' : '#333', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Historical Alarms</button>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', padding: '0.5rem 1rem', alignItems: 'center' }}>
          {activeTab === 'HISTORICAL' && (
            <>
              <select value={timeRangeStr} onChange={e => handleTimeRangeSelect(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
                <option value="Last 30 min">Last 30 min</option>
                <option value="Last 1 hour">Last 1 hour</option>
                <option value="Last 2 hours">Last 2 hours</option>
                <option value="Last 8 hours">Last 8 hours</option>
                <option value="Last 24 hours">Last 24 hours</option>
                <option value="Custom">Custom</option>
              </select>
              {timeRangeStr === 'Custom' && (
                <>
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                  <span>to</span>
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
                </>
              )}
              <button onClick={fetchHistorical} style={{ padding: '0.3rem 0.6rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
              <div style={{ width: '1px', background: '#555', margin: '0 0.5rem', height: '24px' }}></div>
            </>
          )}

          <input type="text" placeholder="Search Tag..." value={searchTag} onChange={e => setSearchTag(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }} />
          <select value={sysFilter} onChange={e => setSysFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Systems</option>
            <option value="PCW01">PCW01</option>
            <option value="PCW02">PCW02</option>
            <option value="PCW03">PCW03</option>
            <option value="PCW04">PCW04</option>
            <option value="PCW05">PCW05</option>
            <option value="PCW06">PCW06</option>
            <option value="PCW07">PCW07</option>
            <option value="PCW08">PCW08</option>
          </select>
          <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Submains</option>
            {Array.from({length:20}, (_,i)=>`Submain${String(i+1).padStart(2,'0')}`).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All Priorities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ padding: '0.25rem', background: '#333', color: '#fff', border: '1px solid #555' }}>
            <option value="">All States</option>
            <option value="ACTIVE_UNACK">ACTIVE_UNACK</option>
            <option value="ACTIVE_ACK">ACTIVE_ACK</option>
            <option value="CLEARED_UNACK">CLEARED_UNACK</option>
            <option value="CLEARED_ACK">CLEARED_ACK</option>
            <option value="SHELVED">SHELVED</option>
          </select>
          <button onClick={exportCSV} style={{ marginLeft: 'auto', padding: '0.3rem 0.6rem' }}>Export CSV</button>
          {activeTab === 'ACTIVE' && (
            <button 
              onClick={() => { if(window.confirm('ACK ALL unacknowledged alarms?')) acknowledgeAllAlarms('Current_User'); }} 
              style={{ marginLeft: '0.5rem', padding: '0.3rem 0.6rem', background: 'var(--success)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ACK ALL
            </button>
          )}
        </div>

        <div className="card table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--panel-bg)', zIndex: 1 }}>
              <tr>
                <th>Time</th>
                <th>System</th>
                <th>Submain</th>
                <th>Tag Name</th>
                <th>Value</th>
                <th>Alarm Type (Message)</th>
                <th>Priority</th>
                <th>State</th>
                <th>ACK</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlarms.map(a => (
                <tr 
                  key={a.alarmId}
                  style={{ cursor: 'pointer', background: selectedAlarm?.alarmId === a.alarmId ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  onClick={() => setSelectedAlarm(a)}
                >
                  <td>{new Date(a.activatedAt).toLocaleString()}</td>
                  <td>{a.systemId}</td>
                  <td>{a.submainId}</td>
                  <td className="val">
                    <span 
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--accent)' }}
                      onClick={(e) => { e.stopPropagation(); openTagDetail(a.tagId); }}
                    >
                      {a.tagId}
                    </span>
                  </td>
                  <td className="val">{a.value?.toFixed(2)}</td>
                  <td>{a.message}</td>
                  <td style={{ color: getPriorityColor(a.priority), fontWeight: 'bold' }}>{a.priority}</td>
                  <td>
                    <span className={`badge ${a.state.includes('UNACK') ? 'alarm' : 'normal'}`}>{a.state}</span>
                  </td>
                  <td>
                    {(a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK') ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); acknowledgeAlarm(a.alarmId, 'HMI_OPERATOR'); }} 
                        style={{ padding: '0.2rem 0.5rem', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                      >
                        ACK
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.acknowledgedBy}</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAlarms.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center' }}>No alarms found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedAlarm && (
        <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <h3 style={{ color: getPriorityColor(selectedAlarm.priority) }}>Alarm Detail</h3>
            <button onClick={() => setSelectedAlarm(null)} style={{ background: 'transparent', color: 'var(--text-main)', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tag ID (Click to view System)</div>
            <div 
              style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => navigate(`/submain/${selectedAlarm.systemId}`)}
            >
              {selectedAlarm.tagId}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <div><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Value at Alarm:</span> <div style={{ fontSize: '1.5rem', color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}>{selectedAlarm.value.toFixed(2)} {selectedAlarm.unit}</div></div>
            <div><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Limit Threshold:</span> <div style={{ fontSize: '1.5rem', color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>{selectedAlarm.limit.toFixed(2)} {selectedAlarm.unit}</div></div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4>Timestamps</h4>
            <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <li><strong>Activated:</strong> {new Date(selectedAlarm.activatedAt).toLocaleString()}</li>
              <li><strong>Acknowledged:</strong> {selectedAlarm.acknowledgedAt ? new Date(selectedAlarm.acknowledgedAt).toLocaleString() : '---'} by {selectedAlarm.acknowledgedBy || '---'}</li>
              <li><strong>Cleared:</strong> {selectedAlarm.clearedAt ? new Date(selectedAlarm.clearedAt).toLocaleString() : '---'}</li>
              <li><strong>Duration:</strong> {getDuration(selectedAlarm.activatedAt, selectedAlarm.clearedAt)}</li>
            </ul>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <h4>Metadata</h4>
            <div style={{ fontSize: '0.85rem' }}>
              <div>Message: {selectedAlarm.message}</div>
              <div>Source: {selectedAlarm.source}</div>
              <div>Type: {selectedAlarm.alarmType}</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingBottom: '1rem' }}>
            <button 
              disabled={!selectedAlarm.state.includes('UNACK')} 
              onClick={() => { ackAlarm(selectedAlarm.alarmId, 'Current_User'); setSelectedAlarm({...selectedAlarm, state: selectedAlarm.state.replace('UNACK', 'ACK') as any}); }}
              style={{ flex: 1, padding: '0.75rem', background: selectedAlarm.state.includes('UNACK') ? 'var(--success)' : '#444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: selectedAlarm.state.includes('UNACK') ? 'pointer' : 'not-allowed' }}
            >
              Acknowledge
            </button>
            <button 
              disabled={!selectedAlarm.state.startsWith('ACTIVE')} 
              onClick={() => { shelveAlarm(selectedAlarm.alarmId); setSelectedAlarm({...selectedAlarm, state: 'SHELVED'}); }}
              style={{ flex: 1, padding: '0.75rem', background: selectedAlarm.state.startsWith('ACTIVE') ? 'var(--warning)' : '#444', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: selectedAlarm.state.startsWith('ACTIVE') ? 'pointer' : 'not-allowed' }}
            >
              Shelve (Silence)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
