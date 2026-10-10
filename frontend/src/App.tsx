import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useScadaStore } from './store/scadaStore';
import { SystemOverview } from './pages/SystemOverview';
import { SubmainDetail } from './pages/SubmainDetail';
import { LiveSensors } from './pages/LiveSensors';
import { HistorianTrend } from './pages/HistorianTrend';
import { ActiveAlarms } from './pages/ActiveAlarms';
import { PredictionT30 } from './pages/PredictionT30';
import { ModbusMonitor } from './pages/ModbusMonitor';
import { PredictionModelInfo } from './components/PredictionModelInfo';
import { PredictionSettings } from './pages/PredictionSettings';
import { GlobalTagDetail } from './pages/GlobalTagDetail';
import { LiveTrend } from './pages/LiveTrend';
import { GlobalAlarmSummary } from './components/GlobalAlarmSummary';
import './index.css';

const GlobalClock = () => {
  const [timeStr, setTimeStr] = React.useState('--');

  React.useEffect(() => {
    const timer = setInterval(() => {
      try {
        const parts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Taipei',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(new Date());
        
        const get = (type: string) => parts.find(p => p.type === type)?.value ?? '--';
        setTimeStr(`${get('year')}:${get('month')}:${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`);
      } catch (e) {
        setTimeStr('TIME UNAVAILABLE');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{timeStr}</div>;
};

const TopNavigation = () => {
  const location = useLocation();
  const alarms = useScadaStore(state => state.alarms);
  const unackCount = alarms.filter(a => a.state.includes('UNACK')).length;
  
  const navs = [
    { path: '/', label: '1. Plant Overview' },
    { path: '/sensors', label: '2. Live Sensor Data' },
    { path: '/historian', label: '3. Historian Trend' },
    { path: '/live-trend', label: '4. Live Trend' },
    { path: '/alarms', label: '5. Alarm Center', badge: unackCount > 0 ? `ALARM ${unackCount}` : null },
    { path: '/t30', label: '6. System Prediction', style: { color: '#a78bfa' } },
    { path: '/settings', label: '7. Prediction Tuning', style: { color: '#a78bfa' } },
    { path: '/modbus', label: '8. Modbus Simulator' },
    { path: '/model-info', label: '9. Prediction Model Info', style: { color: '#a78bfa' } },
  ];

  return (
    <div className="top-navigation">
      <div className="top-nav-logo">
        <h2>PCW SCADA</h2>
        <GlobalClock />
      </div>
      <div className="top-nav-links" style={{ display: 'flex', alignItems: 'center' }}>
        {navs.map(n => (
          <Link 
            key={n.path} 
            to={n.path} 
            style={n.style}
            className={`top-nav-item ${location.pathname === n.path || (n.path === '/' && location.pathname === '') ? 'active' : ''}`}
          >
            {n.label}
            {n.badge && (
              <span className="alarm-flash" style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 'bold', marginLeft: '0.5rem' }}>
                {n.badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const startPolling = useScadaStore(state => state.startPolling);
  const stopPolling = useScadaStore(state => state.stopPolling);
  const alarms = useScadaStore(state => state.alarms);
  const [alarmState, setAlarmState] = useState<'normal' | 'collapsed' | 'expanded'>('normal');

  useEffect(() => {
    startPolling(1000); // 1 second update as requested
    useScadaStore.getState().setSimulatorControl('START', 1000);
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Find highest priority unacknowledged alarm
  const unackAlarms = alarms.filter(a => a.state.includes('UNACK'));
  const critical = unackAlarms.find(a => a.priority === 'CRITICAL');
  const highest = critical || unackAlarms[0];

  return (
    <BrowserRouter>
      <div className={`scada-shell ${alarmState === 'collapsed' ? 'alarm-collapsed' : alarmState === 'expanded' ? 'alarm-expanded' : ''}`}>
        <TopNavigation />
        
        <main className="scada-workspace">
          <Routes>
            <Route path="/" element={<SystemOverview />} />
            <Route path="/submain/:systemId" element={<SubmainDetail />} />
            <Route path="/sensors" element={<LiveSensors />} />
            <Route path="/historian" element={<HistorianTrend />} />
            <Route path="/live-trend" element={<LiveTrend />} />
            <Route path="/alarms" element={<ActiveAlarms />} />
            <Route path="/t30" element={<PredictionT30 />} />
            <Route path="/modbus" element={<ModbusMonitor />} />
            <Route path="/model-info" element={<div style={{ padding: '1.5rem', paddingBottom: '8rem' }}><PredictionModelInfo /></div>} />
            <Route path="/settings" element={<PredictionSettings />} />
          </Routes>
        </main>

        <GlobalAlarmSummary alarmState={alarmState} setAlarmState={setAlarmState} />
        <GlobalTagDetail />
      </div>
    </BrowserRouter>
  );
}
