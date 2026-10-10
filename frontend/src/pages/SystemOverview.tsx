import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScadaStore } from '../store/scadaStore';

export const SystemOverview = () => {
  const systems = useScadaStore(state => state.systems);
  const alarms = useScadaStore(state => state.alarms);
  const sensors = useScadaStore(state => state.sensors);
  const predictions = useScadaStore(state => state.predictions);
  const acknowledgeAlarm = useScadaStore(state => state.acknowledgeAlarm);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ALARM': return 'var(--danger)';
      case 'WARNING': return 'var(--warning)';
      case 'OFFLINE': return 'var(--text-muted)';
      case 'COMM_LOSS': return 'var(--danger)';
      default: return 'var(--success)';
    }
  };

  // Helper for consistent date formatting
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'DATA_ERROR';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'DATA_ERROR';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Get newest 10 active alarms, sort by activatedAt DESC
  const activeAlarmsList = [...alarms].filter(a => a.state.startsWith('ACTIVE')).sort((a, b) => new Date(b.activatedAt || 0).getTime() - new Date(a.activatedAt || 0).getTime()).slice(0, 10);

  const handleAck = (alarmId: string) => {
    const al = alarms.find(a => a.id === alarmId || a.alarmId === alarmId);
    if (al && al.state === 'ACTIVE_UNACK') {
      if (window.confirm(`Acknowledge alarm on ${al.tagId}? Current value: ${al.value}`)) {
        acknowledgeAlarm(al.alarmId || al.id, 'HMI_OPERATOR');
      }
    }
  };

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      
      {/* Top Part: Operational Status */}
      <div>
        <h2>All Loop System Status</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          {systems.map(sys => {
            const sysAlarms = alarms.filter(a => a.systemId === sys.systemId && a.state.startsWith('ACTIVE'));
            const sysUnack = sysAlarms.filter(a => a.state === 'ACTIVE_UNACK').length;
            const sysSensors = sensors.filter(s => s.systemId === sys.systemId);
            const badQualityCount = sysSensors.filter(s => s.quality !== 'GOOD').length;
            const sysPredictions = predictions.filter(p => p.tagId.startsWith(sys.systemId));
            const predictionWarning = sysPredictions.some(p => p.state !== 'NORMAL');
            
            let overallState = 'NORMAL';
            if (sysAlarms.length > 0) overallState = 'ALARM';
            else if (predictionWarning) overallState = 'WARNING';

            return (
              <div 
                key={sys.systemId} 
                className="card" 
                style={{ borderTop: `4px solid ${getStatusColor(overallState)}`, cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/sensors?systemId=${sys.systemId}`)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.2rem' }}>{sys.systemId}</strong>
                </div>
                
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                  <tbody>
                    <tr><td style={{ color: 'var(--text-muted)' }}>Overall</td><td style={{ textAlign: 'right', fontWeight: 'bold', color: getStatusColor(overallState) }}>{overallState}</td></tr>
                    <tr onClick={(e) => { e.stopPropagation(); navigate('/alarms'); }} style={{ cursor: 'pointer' }}><td style={{ color: 'var(--text-muted)' }}>Alarm</td><td style={{ textAlign: 'right' }}>{sysAlarms.length}</td></tr>
                    <tr><td style={{ color: 'var(--text-muted)' }}>Unack</td><td style={{ textAlign: 'right', color: sysUnack > 0 ? 'var(--warning)' : 'inherit' }}>{sysUnack}</td></tr>
                    <tr onClick={(e) => { e.stopPropagation(); navigate('/t30'); }} style={{ cursor: 'pointer' }}><td style={{ color: 'var(--text-muted)' }}>Prediction</td><td style={{ textAlign: 'right', color: predictionWarning ? 'var(--warning)' : 'var(--success)' }}>{predictionWarning ? 'WARNING' : 'NORMAL'}</td></tr>
                    <tr><td style={{ color: 'var(--text-muted)' }}>Drift PT</td><td style={{ textAlign: 'right' }}>{sys.driftSensorCount} / {sysSensors.length}</td></tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
