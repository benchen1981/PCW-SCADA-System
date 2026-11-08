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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #000000', paddingBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, fontWeight: 900 }}>ALL LOOP SYSTEM STATUS (PCW01 ~ PCW08)</h2>
          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <span className="badge normal">NORMAL: 實線細框</span>
            <span className="badge warning">WARNING: 粗虛線框</span>
            <span className="badge alarm">ALARM: 實心反白粗框</span>
          </div>
        </div>
        
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

            const cardBorder = overallState === 'ALARM' 
              ? '2.5px solid #000000' 
              : overallState === 'WARNING' 
                ? '2px dashed #b45309' 
                : '1.5px solid #000000';
            
            const cardTopBorder = overallState === 'ALARM' 
              ? '6px solid #b91c1c' 
              : overallState === 'WARNING' 
                ? '6px solid #b45309' 
                : '5px solid #15803d';

            return (
              <div 
                key={sys.systemId} 
                className="card" 
                style={{ 
                  border: cardBorder, 
                  borderTop: cardTopBorder, 
                  cursor: 'pointer', 
                  transition: '0.2s', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: '#ffffff',
                  boxShadow: overallState === 'ALARM' ? '0 2px 8px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)'
                }}
                onClick={() => navigate(`/sensors?systemId=${sys.systemId}`)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #000000', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.25rem', fontWeight: 900 }}>{sys.systemId}</strong>
                  <span className={`badge ${overallState === 'ALARM' ? 'alarm' : overallState === 'WARNING' ? 'warning' : 'normal'}`}>
                    {overallState}
                  </span>
                </div>
                
                <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 'bold', border: '1px solid #000000' }}>Overall Loop</td>
                      <td style={{ textAlign: 'right', border: '1px solid #000000' }}>
                        <span className={`badge ${overallState === 'ALARM' ? 'alarm' : overallState === 'WARNING' ? 'warning' : 'normal'}`}>
                          {overallState}
                        </span>
                      </td>
                    </tr>
                    <tr onClick={(e) => { e.stopPropagation(); navigate('/alarms'); }} style={{ cursor: 'pointer' }}>
                      <td style={{ color: '#000000', fontWeight: 'bold', border: '1px solid #000000' }}>Active Alarms</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', border: '1px solid #000000' }}>{sysAlarms.length}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 'bold', border: '1px solid #000000' }}>Unacknowledged</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: sysUnack > 0 ? '#b91c1c' : '#000000', border: '1px solid #000000' }}>{sysUnack}</td>
                    </tr>
                    <tr onClick={(e) => { e.stopPropagation(); navigate('/t30'); }} style={{ cursor: 'pointer' }}>
                      <td style={{ color: '#000000', fontWeight: 'bold', border: '1px solid #000000' }}>T-30 Prediction</td>
                      <td style={{ textAlign: 'right', border: '1px solid #000000' }}>
                        <span className={`badge ${predictionWarning ? 'warning' : 'normal'}`}>
                          {predictionWarning ? 'WARNING' : 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: '#000000', fontWeight: 'bold', border: '1px solid #000000' }}>Drift Sensors</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', border: '1px solid #000000' }}>{sys.driftSensorCount} / {sysSensors.length}</td>
                    </tr>
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
