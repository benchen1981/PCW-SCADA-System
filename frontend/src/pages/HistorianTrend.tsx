import React, { useState, useEffect } from 'react';
import { useScadaStore } from '../store/scadaStore';
import { pcwDataService } from '../services/PcwDataService';
import type { HistorianRecord } from '../domain/historianTypes';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';

export const HistorianTrend = () => {
  const sensors = useScadaStore(state => state.sensors);
  
  // Tag Selection State
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [sysFilter, setSysFilter] = useState('');
  const [subFilter, setSubFilter] = useState('');
  const [sensorTypeFilter, setSensorTypeFilter] = useState(''); // NEW: filter for PT, FT, DP
  const [exactSensorFilter, setExactSensorFilter] = useState(''); // NEW: filter for specific base sensor
  const [featureFilter, setFeatureFilter] = useState(''); // NEW: filter for prediction features
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Time Range State
  const [timeRange, setTimeRange] = useState('1h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data State
  const historyData = useScadaStore(state => state.historyData);
  const fetchSensorHistory = useScadaStore(state => state.fetchSensorHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [queryInfo, setQueryInfo] = useState<any>(null);
  
  // UI State
  const [showAlarmLimits, setShowAlarmLimits] = useState(true);

  // Zoom / Pan State
  const [visibleRange, setVisibleRange] = useState<[number, number]>([0, 100]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [yZoomLevel, setYZoomLevel] = useState(1);
  const [yPanOffset, setYPanOffset] = useState(0);

  useEffect(() => {
    setVisibleRange([0, Math.max(0, historyData.length - 1)]);
  }, [historyData]);

  // Extend availableTags with prediction feature virtual tags
  const extendedTags: any[] = [
    ...sensors,
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_BaseAvg60` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_M60` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_M10` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_N10` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_Slope` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_Fcst30` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_Fcst20` })),
    ...sensors.map(s => ({ ...s, tagId: `${s.tagId}_Fcst10` })),
  ];

  // Helper to determine sensor type even from feature tagIds like PCW01.Submain01.PT_BaseAvg60
  const getSensorType = (id: string) => {
    if (id.includes('.PT') || (id.includes('PT') && !id.includes('PDT'))) return 'PT';
    if (id.includes('.FT') || id.includes('FT')) return 'FT';
    if (id.includes('.PDT') || id.includes('DP')) return 'DP';
    return '';
  };

  // Computed filtered tags for the selector
  const availableTags = extendedTags.filter(s => {
    if (sysFilter && s.systemId !== sysFilter) return false;
    if (subFilter && s.submainId !== subFilter) return false;
    
    // Apply Sensor Type filter
    if (sensorTypeFilter && getSensorType(s.tagId) !== sensorTypeFilter) return false;
    
    // Apply Exact Sensor filter
    if (exactSensorFilter && s.tagId !== exactSensorFilter && !s.tagId.startsWith(`${exactSensorFilter}_`)) return false;
    
    // Apply feature filter
    if (featureFilter === 'RAW' && s.tagId.includes('_')) return false;
    if (featureFilter && featureFilter !== 'RAW' && !s.tagId.endsWith(`_${featureFilter}`)) return false;
    
    if (search && !s.tagId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleDraftTag = (tagId: string) => {
    if (draftTags.includes(tagId)) {
      setDraftTags(draftTags.filter(t => t !== tagId));
    } else {
      if (draftTags.length >= 20) {
        alert("Maximum 20 tags allowed");
        return;
      }
      setDraftTags([...draftTags, tagId]);
    }
  };

  const selectAllFiltered = () => {
    const toAdd = availableTags.map(t => t.tagId).slice(0, 20);
    setDraftTags(toAdd);
  };

  const applyTags = () => {
    setSelectedTags([...draftTags]);
    setIsDrawerOpen(false);
    executeQuery([...draftTags]);
  };

  const removeSelectedTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagId));
    setDraftTags(draftTags.filter(t => t !== tagId));
  };

  const executeQuery = async (tagsOverride?: string[], startOverride?: Date, endOverride?: Date) => {
    const tagsToQuery = tagsOverride || selectedTags;
    if (tagsToQuery.length === 0) return;
    
    setIsLoading(true);
    let start = startOverride || new Date();
    let end = endOverride || new Date();
    
    if (!startOverride && !endOverride) {
      if (timeRange === 'custom' && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        const offsets: Record<string, number> = {
          '5m':   5 * 60 * 1000,
          '15m':  15 * 60 * 1000,
          '1h':   1 * 60 * 60 * 1000,
          '6h':   6 * 60 * 60 * 1000,
          '24h':  24 * 60 * 60 * 1000,
          '7d':   7 * 24 * 60 * 60 * 1000,
          '30d':  30 * 24 * 60 * 60 * 1000,
          '180d': 180 * 24 * 60 * 60 * 1000,
        };
        const offset = offsets[timeRange] ?? 60 * 60 * 1000;
        start = new Date(Date.now() - offset);
      }
    }

    const qStart = performance.now();
    await fetchSensorHistory(tagsToQuery, start.toISOString(), end.toISOString());
    setIsLoading(false);
    
    setQueryInfo({
      start: start.toLocaleString(),
      end: end.toLocaleString(),
      duration: (performance.now() - qStart).toFixed(2),
      count: 'N/A', // Count handled by store size
      quality: 'GOOD'
    });
  };

  const exportCSV = () => {
    if (historyData.length === 0) return;
    const header = ['timestamp', ...selectedTags].join(',');
    const rows = historyData.map(row => {
      return [row.timestamp, ...selectedTags.map(tag => row[tag] || '')].join(',');
    });
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "historian_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const wheelTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (historyData.length === 0) return;
    if (e.shiftKey) return; // Prevent zooming if shift key is pressed (reserved for potential y-axis, but we use buttons now)

    const currentStartIdx = visibleRange[0];
    const currentEndIdx = visibleRange[1];
    if (!historyData[currentStartIdx] || !historyData[currentEndIdx]) return;

    const startObj = new Date(historyData[currentStartIdx].timestamp);
    const endObj = new Date(historyData[currentEndIdx].timestamp);
    const currentSpanMs = endObj.getTime() - startObj.getTime();
    if (currentSpanMs <= 0) return;

    // Anchor zooming on mouse hover position
    const anchorTime = hoverIndex !== null && historyData[hoverIndex] 
      ? new Date(historyData[hoverIndex].timestamp).getTime() 
      : startObj.getTime() + currentSpanMs / 2;
    
    // Zoom in on wheel up (deltaY < 0), zoom out on wheel down (deltaY > 0)
    const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
    let newSpanMs = currentSpanMs * zoomFactor;
    if (newSpanMs < 60000) newSpanMs = 60000; // Min 1 minute window
    
    const anchorRatio = (anchorTime - startObj.getTime()) / currentSpanMs;
    
    let newStartTime = anchorTime - newSpanMs * anchorRatio;
    let newEndTime = anchorTime + newSpanMs * (1 - anchorRatio);
    
    // Prevent zooming into the future
    if (newEndTime > Date.now()) {
      newEndTime = Date.now();
      newStartTime = newEndTime - newSpanMs;
    }

    // Attempt to update visual range immediately if data is already loaded locally
    let newStartIdx = historyData.findIndex(d => new Date(d.timestamp).getTime() >= newStartTime);
    let newEndIdx = historyData.findLastIndex(d => new Date(d.timestamp).getTime() <= newEndTime);
    
    if (newStartIdx !== -1 && newEndIdx !== -1 && newStartIdx < newEndIdx) {
      setVisibleRange([newStartIdx, newEndIdx]);
    } else {
      // Reached limits of currently loaded data, max out visible range
      setVisibleRange([0, historyData.length - 1]);
    }

    // Helper to format timestamps for HTML input
    const toDatetimeLocal = (ts: number) => {
       const d = new Date(ts);
       d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
       return d.toISOString().slice(0, 16);
    };

    // Update form fields dynamically
    setTimeRange('custom');
    setCustomStart(toDatetimeLocal(newStartTime));
    setCustomEnd(toDatetimeLocal(newEndTime));

    // Debounce the backend query to avoid spamming the simulator/API
    if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
    wheelTimeout.current = setTimeout(() => {
       executeQuery(selectedTags, new Date(newStartTime), new Date(newEndTime));
    }, 600);
  };

  const colors = ['#38bdf8', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#e879f9', '#2dd4bf'];

  return (
    <div className="dashboard-section" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '1rem', background: '#222', padding: '0.5rem 1rem', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <select value={sysFilter} onChange={e=>setSysFilter(e.target.value)} style={{ padding: '0.4rem', background: '#333', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}>
            <option value="">System (All)</option>
            {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
          </select>

          <button onClick={() => { setDraftTags([...selectedTags]); setIsDrawerOpen(!isDrawerOpen); }} style={{ padding: '0.4rem 0.8rem', background: isDrawerOpen ? 'var(--accent)' : '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Select Tags ({selectedTags.length})
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Time</span>
            <select value={timeRange} onChange={e=>setTimeRange(e.target.value)} style={{ padding: '0.4rem', background: '#333', color: '#fff', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="180d">Last 6 months</option>
              <option value="custom">Custom</option>
            </select>
            {timeRange === 'custom' && (
              <>
                <input type="datetime-local" value={customStart} onChange={e=>setCustomStart(e.target.value)} style={{ padding:'0.2rem' }}/>
                <span>to</span>
                <input type="datetime-local" value={customEnd} onChange={e=>setCustomEnd(e.target.value)} style={{ padding:'0.2rem' }}/>
              </>
            )}
            <button onClick={() => executeQuery()} style={{ padding: '0.4rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem' }}>
              {isLoading ? 'Querying...' : 'QUERY TREND'}
            </button>
            <button onClick={() => setVisibleRange([0, Math.max(0, historyData.length - 1)])} style={{ padding: '0.4rem 1rem', background: '#444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Reset View
            </button>
          </div>
        </div>

        <div style={{ background: '#1a1a1a', padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected Tags:</span>
          {selectedTags.length === 0 && <span style={{ fontSize: '0.8rem', color: '#555' }}>None</span>}
          {selectedTags.map(t => (
            <span key={t} style={{ background: '#333', padding: '0.2rem 0.5rem', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {t} 
              <span onClick={() => removeSelectedTag(t)} style={{ cursor: 'pointer', color: 'var(--danger)', fontWeight: 'bold' }}>×</span>
            </span>
          ))}
        </div>

        {isDrawerOpen && (
          <div style={{ position: 'absolute', left: 0, top: '95px', width: '320px', height: 'calc(100% - 95px)', background: '#1a1a1a', borderRight: '1px solid var(--border)', zIndex: 10, display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto', boxShadow: '2px 0 10px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Select Historian Tags</h3>
              <button onClick={() => setIsDrawerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setDraftTags([])} style={{ fontSize:'0.8rem', padding: '0.4rem 0.8rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
                <button onClick={selectAllFiltered} style={{ fontSize:'0.8rem', padding: '0.4rem 0.8rem', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Select All</button>
              </div>
              <button onClick={applyTags} style={{ fontSize:'0.8rem', padding: '0.4rem 0.8rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Apply Tags</button>
            </div>
            
            <input type="text" placeholder="Search Canonical Tag" value={search} onChange={e=>setSearch(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', marginBottom: '0.5rem' }} />
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select value={sysFilter} onChange={e=>setSysFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', flex: 1 }}>
                <option value="">All Systems</option>
                {Array.from(new Set(sensors.map(s => s.systemId))).map(sys => <option key={sys} value={sys}>{sys}</option>)}
              </select>
              <select value={subFilter} onChange={e=>setSubFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', flex: 1 }}>
                <option value="">All Submains</option>
                {Array.from(new Set(sensors.filter(s => !sysFilter || s.systemId === sysFilter).map(s => s.submainId))).map(sm => <option key={sm} value={sm}>{sm}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select value={sensorTypeFilter} onChange={e=>{setSensorTypeFilter(e.target.value); setExactSensorFilter('');}} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', flex: 1 }}>
                <option value="">All Types (PT/FT/DP)</option>
                <option value="PT">PT (Pressure)</option>
                <option value="FT">FT (Flow)</option>
                <option value="DP">DP (Differential)</option>
              </select>
              <select value={exactSensorFilter} onChange={e=>setExactSensorFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', flex: 2 }}>
                <option value="">All Sensors</option>
                {Array.from(new Set(sensors
                  .filter(s => !sysFilter || s.systemId === sysFilter)
                  .filter(s => !subFilter || s.submainId === subFilter)
                  .filter(s => !sensorTypeFilter || getSensorType(s.tagId) === sensorTypeFilter)
                  .map(s => s.tagId)
                )).map(tagId => <option key={tagId} value={tagId}>{tagId}</option>)}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select value={featureFilter} onChange={e=>setFeatureFilter(e.target.value)} style={{ padding: '0.5rem', background: '#333', color: '#fff', border: '1px solid var(--border)', flex: 1 }}>
                <option value="">All Features</option>
                <option value="RAW">Raw Sensor Value</option>
                <option value="BaseAvg60">BaseAvg60</option>
                <option value="M60">M60</option>
                <option value="M10">M10</option>
                <option value="N10">N10 (Anomaly Density)</option>
                <option value="Slope">Slope</option>
                <option value="Fcst10">Fcst10 (T-10)</option>
                <option value="Fcst20">Fcst20 (T-20)</option>
                <option value="Fcst30">Fcst30 (T-30)</option>
              </select>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', background: '#111', marginBottom: '0.5rem' }}>
              {availableTags.map(t => (
                <div key={t.tagId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.2rem 0' }}>
                  <input type="checkbox" checked={draftTags.includes(t.tagId)} onChange={() => toggleDraftTag(t.tagId)} />
                  <span>{t.tagId}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'right' }}>
              Selected: {draftTags.length} / 20 (Max)
            </div>
          </div>
        )}

      {/* Chart Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        
        {/* Info Bar */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          <div>
            <strong>Query Info:</strong> {queryInfo ? `${queryInfo.start} to ${queryInfo.end} | ${historyData.length} pts | ${queryInfo.duration}ms | Data: ${queryInfo.quality}` : 'No query executed.'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <label style={{ marginRight: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input type="checkbox" checked={showAlarmLimits} onChange={e => setShowAlarmLimits(e.target.checked)} style={{ marginRight: '0.5rem' }} />
              Show Alarm Limits
            </label>
            <button onClick={exportCSV} disabled={historyData.length===0} style={{ padding: '0.3rem 0.6rem', cursor: historyData.length ? 'pointer' : 'not-allowed' }}>Export CSV</button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="card" style={{ flex: 1, padding: '1rem', position: 'relative' }} onWheel={handleWheel}>
          {historyData.length > 0 && (
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
          {historyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} onMouseMove={handleMouseMove}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="timestamp" stroke="#888" tick={{fontSize: 10}} />
                <YAxis 
                  stroke="#888" 
                  domain={() => {
                    let min = Infinity;
                    let max = -Infinity;
                    historyData.forEach(d => {
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
                      {/* Show Limits if showAlarmLimits is toggled and we have a single tag or limited tags to avoid clutter */}
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
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {queryInfo ? 'No Data Available for the given criteria (Try a wider time range)' : 'Select tags and execute query to view trend'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
