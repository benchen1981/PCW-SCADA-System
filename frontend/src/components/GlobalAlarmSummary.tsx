import React from 'react';
import { useScadaStore } from '../store/scadaStore';
import { useNavigate } from 'react-router-dom';

interface GlobalAlarmSummaryProps {
  alarmState: 'normal' | 'collapsed' | 'expanded';
  setAlarmState: (state: 'normal' | 'collapsed' | 'expanded') => void;
}

export const GlobalAlarmSummary: React.FC<GlobalAlarmSummaryProps> = ({ alarmState, setAlarmState }) => {
  const alarms = useScadaStore(state => state.alarms);
  const acknowledgeAlarm = useScadaStore(state => state.acknowledgeAlarm);
  const acknowledgeAllAlarms = useScadaStore(state => state.acknowledgeAllAlarms);
  const navigate = useNavigate();

  // Get newest 10 active alarms, sort by activatedAt DESC
  const activeAlarmsList = [...alarms]
    .filter(a => a.state.startsWith('ACTIVE') || a.state === 'CLEARED_UNACK')
    .sort((a, b) => new Date(b.activatedAt || 0).getTime() - new Date(a.activatedAt || 0).getTime())
    .slice(0, 10);

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'DATA_ERROR';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'DATA_ERROR';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleAck = (alarmId: string) => {
    const al = alarms.find(a => a.id === alarmId || a.alarmId === alarmId);
    if (al && (al.state === 'ACTIVE_UNACK' || al.state === 'CLEARED_UNACK')) {
      if (window.confirm(`Acknowledge alarm on ${al.tagId}? Current value: ${al.value}`)) {
        acknowledgeAlarm(al.alarmId || al.id, 'HMI_OPERATOR');
      }
    }
  };

  const handleAckAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Acknowledge all unacknowledged alarms?')) {
      acknowledgeAllAlarms('HMI_OPERATOR');
    }
  };

  const unackAlarms = activeAlarmsList.filter(a => a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK');
  const unackCount = unackAlarms.length;
  const highest = unackAlarms.find(a => a.priority === 'CRITICAL') || unackAlarms[0];

  const toggleState = () => {
    if (alarmState === 'collapsed') setAlarmState('normal');
    else if (alarmState === 'normal') setAlarmState('expanded');
    else setAlarmState('collapsed');
  };

  return (
    <div className="global-alarm-summary">
      <div className={`alarm-summary-header ${highest ? 'alarm-flash' : ''}`} onClick={toggleState} style={{ background: highest ? (highest.priority === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)') : '#252525', color: highest ? '#000' : 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontWeight: 'bold' }}>
            {highest ? `UNACKNOWLEDGED ALARM: ${highest.tagId} - ${highest.message}` : 'GLOBAL ALARM SUMMARY'}
          </h3>
          {!highest && (
            <>
              <span className={`badge ${unackCount > 0 ? 'alarm' : 'neutral'}`}>
                UNACK {unackCount}
              </span>
              <span className="badge warning">
                ACTIVE {activeAlarmsList.length}
              </span>
            </>
          )}
        </div>
        <div>
          {unackCount > 0 && (
            <button 
              onClick={handleAckAll} 
              className="btn"
              style={{ marginRight: '0.5rem', background: 'var(--success)' }}
            >
              ACK ALL
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); navigate('/alarms'); }} 
            className="btn"
          >
            View All Alarms
          </button>
          <button className="btn" style={{ marginLeft: '0.5rem' }} onClick={(e) => { e.stopPropagation(); toggleState(); }}>
            {alarmState === 'collapsed' ? '▲ Expand' : alarmState === 'expanded' ? '▼ Collapse' : '▼/▲ Toggle'}
          </button>
        </div>
      </div>
      
      <div className="alarm-summary-content">
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#222', zIndex: 1 }}>
            <tr>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Time</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>System</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Submain</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Tag</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Value</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Alarm Type</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>Priority</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>State</th>
              <th style={{ padding: '0.5rem', borderBottom: '1px solid #444', textAlign: 'left' }}>ACK</th>
            </tr>
          </thead>
          <tbody>
            {activeAlarmsList.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No active alarms.</td></tr>
            ) : (
              activeAlarmsList.map(a => (
                <tr key={a.alarmId || a.id} className={a.state === 'ACTIVE_UNACK' ? 'alarm-flash' : ''} style={{ background: a.state === 'ACTIVE_UNACK' ? 'rgba(239, 68, 68, 0.15)' : 'transparent' }}>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{formatTime(a.activatedAt)}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.systemId}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.submainId}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.tagId}</td>
                  <td className="val" style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.value?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.message}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}><span className={`badge ${a.priority === 'CRITICAL' ? 'alarm' : 'warning'}`}>{a.priority}</span></td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>{a.state}</td>
                  <td style={{ padding: '0.5rem', borderBottom: '1px solid #333' }}>
                    {(a.state === 'ACTIVE_UNACK' || a.state === 'CLEARED_UNACK') ? (
                      <button onClick={() => handleAck(a.id || a.alarmId)} style={{ padding: '0.2rem 0.5rem', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>ACK</button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{a.acknowledgedBy}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
