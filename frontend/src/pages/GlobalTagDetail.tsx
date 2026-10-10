import React from 'react';
import { useScadaStore } from '../store/scadaStore';
import { useNavigate } from 'react-router-dom';

export const GlobalTagDetail = () => {
  const selectedGlobalTag = useScadaStore(state => state.selectedGlobalTag);
  const closeTagDetail = useScadaStore(state => state.closeTagDetail);
  const sensors = useScadaStore(state => state.sensors);
  const alarms = useScadaStore(state => state.alarms);
  const predictions = useScadaStore(state => state.predictions);
  const modbusMap = useScadaStore(state => state.modbusMap);
  const navigate = useNavigate();

  if (!selectedGlobalTag) return null;

  const tag = sensors.find(s => s.tagId === selectedGlobalTag);
  const activeAlarms = alarms.filter(a => a.tagId === selectedGlobalTag && a.state.startsWith('ACTIVE'));
  const prediction = predictions.find(p => p.tagId === selectedGlobalTag);
  const register = modbusMap.find(m => m.tagId === selectedGlobalTag);

  const handleGoToHistorian = () => {
    closeTagDetail();
    navigate('/historian');
    // In a real app we'd pass the preselected tag to Historian via query params or a shared state.
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', 
      background: 'var(--panel-bg)', borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 15px rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: 'var(--accent)' }}>Tag Detail Drawer</h3>
        <button onClick={closeTagDetail} style={{ background: 'transparent', color: '#fff', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
      </div>

      {!tag ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Tag not found in Canonical Model</div>
      ) : (
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h4>Canonical Identity</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tag ID</span><strong>{tag.tagId}</strong>
              <span style={{ color: 'var(--text-muted)' }}>Description</span><span>{tag.description}</span>
              <span style={{ color: 'var(--text-muted)' }}>System</span><span>{tag.systemId} / {tag.submainId}</span>
              <span style={{ color: 'var(--text-muted)' }}>Limits (HH/H)</span><span>{tag.engineeringLimits.highHigh} / {tag.engineeringLimits.high}</span>
            </div>
          </div>

          <div className="card" style={{ background: tag.quality === 'BAD' ? 'rgba(255,0,0,0.1)' : 'var(--card-bg)' }}>
            <h4>Live Value & Quality</h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '2.5rem', lineHeight: '1', color: tag.quality === 'BAD' ? 'var(--danger)' : '#fff' }}>
                {tag.quality === 'BAD' ? 'BAD' : tag.value.toFixed(3)}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{tag.unit}</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Source TS: {new Date(tag.timestamp).toLocaleTimeString()}
            </div>
          </div>

          {activeAlarms.length > 0 && (
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <h4 style={{ color: 'var(--danger)' }}>Active Alarms</h4>
              {activeAlarms.map(a => (
                <div key={a.alarmId} style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  [{a.state}] {a.alarmType}: {a.message} (Trigger: {a.value})
                </div>
              ))}
            </div>
          )}

          {prediction && (
            <div className="card" style={{ borderLeft: `4px solid ${prediction.state === 'NORMAL' ? 'var(--success)' : 'var(--warning)'}` }}>
              <h4>Prediction Inference</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>State</span><strong>{prediction.state}</strong>
                <span style={{ color: 'var(--text-muted)' }}>N10 Density</span><span>{prediction.n10.toFixed(2)}</span>
                <span style={{ color: 'var(--text-muted)' }}>Trend Slope</span><span>{prediction.slope.toFixed(4)} / min</span>
                <span style={{ color: 'var(--text-muted)' }}>Evidence</span><span style={{ color: 'var(--text-muted)' }}>{prediction.triggerPath || 'N/A'}</span>
              </div>
            </div>
          )}

          {register && (
            <div className="card">
              <h4>Modbus Address Mapping</h4>
              <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                Register <strong>{register.registerAddress}</strong> (Scale: {register.scale})
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={handleGoToHistorian} style={{ flex: 1, padding: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              View Historian Trend
            </button>
            <button onClick={() => navigate('/modbus')} style={{ flex: 1, padding: '0.5rem', background: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Simulator Control
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
