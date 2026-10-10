import React, { useState, useEffect, useRef } from 'react';
import { useScadaStore } from '../store/scadaStore';
import { pcwDataService } from '../services/PcwDataService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';

export const LiveTrend = () => {
  const sensors = useScadaStore(state => state.sensors);
  const systems = useScadaStore(state => state.systems);
  const submains = useScadaStore(state => state.submains);

  const [sysFilter, setSysFilter] = useState('PCW01');
  const [subFilter, setSubFilter] = useState('Submain01');
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTag, setSearchTag] = useState('');
  const [expandedSubmains, setExpandedSubmains] = useState<string[]>(['Submain01']);
  const [isPreloading, setIsPreloading] = useState(false);
  
  const [trendData, setTrendData] = useState<any[]>([]);
  const [showAlarmLimits, setShowAlarmLimits] = useState(true);

  // Zoom / Pan State
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 100]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [yZoomLevel, setYZoomLevel] = useState(1);
  const [yPanOffset, setYPanOffset] = useState(0);

  // We use a ref to prevent stale closures and manage the ring buffer purely
  const dataRef = useRef<any[]>([]);
  const fetchSensorHistory = useScadaStore(state => state.fetchSensorHistory);

  // When selected tags change, we clear buffer and preload 30 minutes of history
  useEffect(() => {
    if (selectedTags.length === 0) {
      dataRef.current = [];
      setTrendData([]);
      return;
    }

    const loadHistory = async () => {
      setIsPreloading(true);
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 60 * 1000);
      
      try {
        const records = await pcwDataService.getSensorHistory(selectedTags, start.toISOString(), end.toISOString());
        const pivot: Record<string, any> = {};
        records.forEach(r => {
          const t = new Date(r.timestamp).toLocaleTimeString();
          if (!pivot[t]) pivot[t] = { timestamp: t, _ts: new Date(r.timestamp).getTime() };
          pivot[t][r.tagId] = r.value;
        });
        const chartData = Object.values(pivot).sort((a, b) => a._ts - b._ts);
        dataRef.current = chartData;
        setTrendData([...dataRef.current]);
      } catch (e) {
        console.error('Failed to preload live trend history', e);
      } finally {
        setIsPreloading(false);
      }
    };
    
    loadHistory();
  }, [selectedTags]);

  useEffect(() => {
    if (selectedTags.length === 0 || isPreloading) return;

    const now = new Date();
    const tsStr = now.toLocaleTimeString();
    const newPoint: any = { timestamp: tsStr, _ts: now.getTime() };

    selectedTags.forEach(tag => {
      const s = sensors.find(x => x.tagId === tag);
      if (s) {
        newPoint[tag] = s.value;
      }
    });

    dataRef.current.push(newPoint);

    // Evict old points based on fixed 30 minutes
    const cutoff = now.getTime() - 30 * 60 * 1000;
    dataRef.current = dataRef.current.filter(p => p._ts >= cutoff);

    setTrendData([...dataRef.current]);
  }, [sensors, selectedTags, isPreloading]);

  const availableTags = sensors.filter(s => s.systemId === sysFilter && s.tagId.toLowerCase().includes(searchTag.toLowerCase()));
  const submainsForSystem = Array.from(new Set(sensors.filter(s => s.systemId === sysFilter).map(s => s.submainId)));

  const toggleExpand = (sm: string) => {
    if (expandedSubmains.includes(sm)) {
      setExpandedSubmains(expandedSubmains.filter(s => s !== sm));
    } else {
      setExpandedSubmains([...expandedSubmains, sm]);
    }
  };

  const toggleSubmain = (smSensors: any[]) => {
    const smTags = smSensors.map(s => s.tagId);
    const allSelected = smTags.every(t => selectedTags.includes(t));
    if (allSelected) {
      setSelectedTags(selectedTags.filter(t => !smTags.includes(t)));
    } else {
      const newTags = Array.from(new Set([...selectedTags, ...smTags]));
      if (newTags.length <= 8) {
        setSelectedTags(newTags);
      } else {
        alert('Maximum 8 tags allowed in Live Trend');
      }
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId));
    } else {
      if (selectedTags.length < 8) {
        setSelectedTags([...selectedTags, tagId]);
      } else {
        alert('Maximum 8 tags allowed in Live Trend');
      }
    }
  };

  useEffect(() => {
    if (trendData.length > 0) {
      if (visibleRange[1] >= trendData.length - 2) {
        setVisibleRange([visibleRange[0], trendData.length - 1]);
      }
    } else {
      setVisibleRange([0, 100]);
    }
  }, [trendData]);

  const handleBrushChange = (e: any) => {
    if (e && e.startIndex !== undefined && e.endIndex !== undefined) {
      setVisibleRange([e.startIndex, e.endIndex]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (e && e.activeTooltipIndex !== undefined) {
      setHoverIndex(e.activeTooltipIndex);
    } else {
      setHoverIndex(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (trendData.length === 0) return;
    
    const [currentStart, currentEnd] = visibleRange;
    const currentSpan = currentEnd - currentStart;
    
    if (currentSpan <= 0) return;

    const anchorIndex = hoverIndex !== null ? currentStart + hoverIndex : Math.floor((currentStart + currentEnd) / 2);
    
    const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
    
    let newSpan = currentSpan * zoomFactor;
    if (newSpan < 5) newSpan = 5;
    if (newSpan > trendData.length - 1) newSpan = trendData.length - 1;

    const anchorRatio = (anchorIndex - currentStart) / currentSpan;
    
    let newStart = anchorIndex - newSpan * anchorRatio;
    let newEnd = anchorIndex + newSpan * (1 - anchorRatio);
    
    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > trendData.length - 1) {
      newStart -= (newEnd - (trendData.length - 1));
      newEnd = trendData.length - 1;
    }
    
    newStart = Math.max(0, Math.floor(newStart));
    newEnd = Math.min(trendData.length - 1, Math.ceil(newEnd));

    setVisibleRange([newStart, newEnd]);
  };

  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7'];

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2>Live Trend</h2>
      
      <div style={{ display: 'flex', gap: '1rem', height: '100%', overflow: 'hidden' }}>
        
        {/* Left Sidebar Config */}
        <div className="card" style={{ width: '250px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Configuration</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selected: {selectedTags.length}/8</span>
          </div>
          
          <div style={{ marginTop: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px', fontSize: '0.9rem' }}>
            <div>Live Window: Last 30 minutes</div>
            <label style={{ marginTop: '0.5rem', display: 'block' }}>
              <input type="checkbox" checked={showAlarmLimits} onChange={e => setShowAlarmLimits(e.target.checked)} /> Show Alarm Limits
            </label>
          </div>

          <h4 style={{ marginTop: '1rem' }}>Tag Selector</h4>
          <input type="text" placeholder="Search Tag..." value={searchTag} onChange={e => setSearchTag(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', marginBottom: '0.5rem' }} />
          
          <select value={sysFilter} onChange={e => setSysFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
            {['PCW01','PCW02','PCW03','PCW04','PCW05','PCW06','PCW07','PCW08'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => setSelectedTags([])} style={{ flex: 1, padding: '0.4rem', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Clear All</button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem' }}>
            {submainsForSystem.map(sm => {
              const smSensors = availableTags.filter(s => s.submainId === sm);
              if (smSensors.length === 0) return null;
              
              const isExpanded = expandedSubmains.includes(sm);
              return (
                <div key={sm} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#222', padding: '0.4rem', cursor: 'pointer' }} onClick={() => toggleExpand(sm)}>
                    <strong style={{ fontSize: '0.85rem' }}>{isExpanded ? '▼' : '▶'} {sm}</strong>
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSubmain(smSensors); }} 
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', background: '#444', color: '#fff', border: 'none', borderRadius: '2px', cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.5rem', background: '#1a1a1a' }}>
                      {smSensors.map(s => (
                        <label key={s.tagId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                          <input type="checkbox" checked={selectedTags.includes(s.tagId)} onChange={() => toggleTag(s.tagId)} />
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <span>{s.tagId.split('.').pop()}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{s.value.toFixed(2)} {s.unit} - <span style={{ color: s.quality === 'GOOD' ? 'var(--success)' : 'var(--warning)' }}>{s.quality}</span></span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Chart Area */}
        <div className="card" style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', position: 'relative' }} onWheel={handleWheel}>
          {selectedTags.length > 0 && !isPreloading && trendData.length > 0 && (
            <div style={{ position: 'absolute', right: '2rem', top: '2rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <div style={{ background: '#333', borderRadius: '4px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #555' }}>
                <div style={{ padding: '2px 4px', background: '#222', fontSize: '0.7rem', textAlign: 'center', borderBottom: '1px solid #555' }}>Y-Axis</div>
                <button onClick={() => setYPanOffset(o => o + 0.1 * yZoomLevel)} title="Pan Up" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderBottom: '1px solid #444' }}>▲</button>
                <button onClick={() => setYZoomLevel(z => Math.max(0.1, z - 0.2))} title="Zoom In" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderBottom: '1px solid #444' }}>+</button>
                <button onClick={() => { setYZoomLevel(1); setYPanOffset(0); }} title="Reset" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderBottom: '1px solid #444' }}>↺</button>
                <button onClick={() => setYZoomLevel(z => z + 0.2)} title="Zoom Out" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem', borderBottom: '1px solid #444' }}>-</button>
                <button onClick={() => setYPanOffset(o => o - 0.1 * yZoomLevel)} title="Pan Down" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem' }}>▼</button>
              </div>
            </div>
          )}
          {selectedTags.length > 0 ? (
            isPreloading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Loading recent 30 minutes of history...
              </div>
            ) : trendData.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
                <h3>No live trend points for selected tags.</h3>
                <div>Selected tags: {selectedTags.length}</div>
                <div>Fixed window: Last 30 minutes</div>
                <div>Historian status: ONLINE</div>
                <div>Subscription: CONNECTED</div>
                <div style={{ marginTop: '1rem' }}>Reason: No records found for the selected time range.</div>
              </div>
            ) : (
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={trendData} onMouseMove={handleMouseMove}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                     <XAxis dataKey="timestamp" stroke="#888" tick={{fontSize: 10}} />
                     <YAxis 
                       stroke="#888" 
                       domain={() => {
                         let min = Infinity;
                         let max = -Infinity;
                         trendData.forEach(d => {
                           selectedTags.forEach(t => {
                             if (d[t] !== undefined) {
                               if (d[t] < min) min = d[t];
                               if (d[t] > max) max = d[t];
                             }
                           });
                         });
                         if (showAlarmLimits) {
                           selectedTags.forEach(tag => {
                             const s = sensors.find(x => x.tagId === tag);
                             if (s && s.engineeringLimits) {
                               if (s.engineeringLimits.lowLow !== undefined && s.engineeringLimits.lowLow < min) min = s.engineeringLimits.lowLow;
                               if (s.engineeringLimits.highHigh !== undefined && s.engineeringLimits.highHigh > max) max = s.engineeringLimits.highHigh;
                             }
                           });
                         }
                         if (min === Infinity) return ['auto', 'auto'];
                         const span = (max - min) || 1;
                         const mid = (max + min) / 2 + (span * yPanOffset);
                         const halfSpan = (span / 2) * yZoomLevel;
                         return [mid - halfSpan, mid + halfSpan];
                       }}
                       tick={{fontSize: 10}} 
                     />
                     <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#444' }} />
                     <Legend verticalAlign="top" height={36} />
                     {selectedTags.map((tag, i) => {
                       const sensor = sensors.find(s => s.tagId === tag);
                       return (
                         <React.Fragment key={tag}>
                           <Line type="monotone" dataKey={tag} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={true} />
                           {showAlarmLimits && sensor && sensor.engineeringLimits && (selectedTags.length <= 2 || i === 0) && (
                             <>
                               {sensor.engineeringLimits.highHigh && <ReferenceLine y={sensor.engineeringLimits.highHigh} stroke="var(--danger)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `HH (${tag})`, fill: 'var(--danger)', fontSize: 10 }} />}
                               {sensor.engineeringLimits.high && <ReferenceLine y={sensor.engineeringLimits.high} stroke="var(--warning)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: `H (${tag})`, fill: 'var(--warning)', fontSize: 10 }} />}
                               {sensor.engineeringLimits.low && <ReferenceLine y={sensor.engineeringLimits.low} stroke="var(--info)" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `L (${tag})`, fill: 'var(--info)', fontSize: 10 }} />}
                               {sensor.engineeringLimits.lowLow && <ReferenceLine y={sensor.engineeringLimits.lowLow} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: `LL (${tag})`, fill: '#3b82f6', fontSize: 10 }} />}
                             </>
                           )}
                         </React.Fragment>
                       );
                     })}
                     <Brush dataKey="timestamp" height={30} stroke="#888" fill="#111" travellerWidth={10} startIndex={visibleRange[0]} endIndex={visibleRange[1]} onChange={handleBrushChange} />
                   </LineChart>
                 </ResponsiveContainer>
            )
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <h3>Select tags to begin live trending</h3>
              <p>You can select up to 8 tags from the hierarchical selector.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
