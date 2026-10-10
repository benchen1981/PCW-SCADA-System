const fs = require('fs');
const file = 'frontend/src/pages/LiveSensors.tsx';
let content = fs.readFileSync(file, 'utf8');

const newSvg = `<svg width="4200" height="900" viewBox="0 0 4200 900" preserveAspectRatio="xMidYMid meet">
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
                  <path d="M 50 150 L 4150 150" stroke="url(#pipeSupplyLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="130" fill="#2F91D1" fontSize="18" fontWeight="bold">SUPPLY MAIN HEADER ({selectedPcw})</text>
                  <polygon points="4100,140 4120,150 4100,160" fill="#fff" />
                  
                  {/* Supply Header Equipment */}
                  <g transform="translate(100, 150)">
                    {/* Pump */}
                    <circle cx="0" cy="0" r="20" fill="#333" stroke="#aaa" strokeWidth="2" />
                    <text x="0" y="5" fill="#fff" fontSize="12" textAnchor="middle">P-1</text>
                    
                    {/* Filter */}
                    <rect x="50" y="-15" width="20" height="30" fill="#333" stroke="#aaa" strokeWidth="2" />
                    <line x1="50" y1="0" x2="70" y2="0" stroke="#aaa" strokeWidth="2" strokeDasharray="2 2" />
                    <text x="60" y="30" fill="#fff" fontSize="10" textAnchor="middle">FLT</text>

                    {/* Valve */}
                    <polygon points="100,-10 100,10 120,-10 120,10" fill="#333" stroke="#aaa" strokeWidth="2" />
                  </g>

                  {/* Main Return Header */}
                  <path d="M 50 750 L 4150 750" stroke="url(#pipeReturnLg)" strokeWidth="16" fill="none" />
                  <text x="60" y="780" fill="#D45A4A" fontSize="18" fontWeight="bold">RETURN MAIN HEADER ({selectedPcw})</text>
                  <polygon points="100,740 80,750 100,760" fill="#fff" />

                  {/* Return Header Equipment */}
                  <g transform="translate(100, 750)">
                    {/* Heat Exchanger */}
                    <rect x="0" y="-20" width="40" height="40" fill="#333" stroke="#aaa" strokeWidth="2" rx="4" />
                    <path d="M 0 0 Q 10 -20 20 0 T 40 0" stroke="#aaa" strokeWidth="2" fill="none" />
                    <text x="20" y="35" fill="#fff" fontSize="10" textAnchor="middle">HX-1</text>
                  </g>

                  {/* Map over all 20 submains for this PCW */}
                  {Array.from({length:20}, (_,i)=>\`Submain\${String(i+1).padStart(2,'0')}\`).map((sm, idx) => {
                    const xBase = 250 + idx * 190;
                    
                    const smSensors = sensors.filter(s => s.systemId === selectedPcw && s.submainId === sm);
                    const pt1s = smSensors.find(s => s.tagId.endsWith('PT1S'));
                    const pt2s = smSensors.find(s => s.tagId.endsWith('PT2S'));
                    const pt1r = smSensors.find(s => s.tagId.endsWith('PT1R'));
                    const pt2r = smSensors.find(s => s.tagId.endsWith('PT2R'));
                    const pdt = smSensors.find(s => s.tagId.includes('PDT') || s.measurementType === 'DP');
                    const ft = smSensors.find(s => s.tagId.includes('FT') || s.measurementType === 'FLOW');
                    
                    const isSelected = selectedSubmain === sm;
                    const hasAlarm = smSensors.some(s => s.alarmState !== 'NONE');

                    return (
                      <g key={sm} opacity={isSelected ? 1 : (hasAlarm ? 0.9 : 0.6)} onClick={() => navigate(\`/submain/\${selectedPcw}?submainId=\${sm}\`)} style={{ cursor: 'pointer', transition: '0.2s' }}>
                        {/* Submain Background Highlights */}
                        <rect x={xBase - 70} y={180} width="140" height="540" fill={isSelected ? 'rgba(255,255,255,0.08)' : (hasAlarm ? 'rgba(239,68,68,0.1)' : 'transparent')} rx="4" />
                        
                        {/* Floor Reference Grid text */}
                        <text x={xBase} y="80" fill="#666" fontSize="14" textAnchor="middle" fontWeight="bold">FAB L40 / F{14 + idx}</text>
                        <line x1={xBase} y1="90" x2={xBase} y2="800" stroke="#333" strokeWidth="1" strokeDasharray="4 4" pointerEvents="none" />
                        
                        <text x={xBase} y="200" fill={isSelected ? '#fff' : (hasAlarm ? 'var(--danger)' : '#aaa')} fontSize="14" textAnchor="middle" fontWeight="bold">{sm}</text>
                        
                        {/* Supply Branch Pipe */}
                        <path d={\`M \${xBase} 150 L \${xBase} 420\`} stroke="url(#pipeSupplyLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={\`\${xBase - 5},400 \${xBase + 5},400 \${xBase},410\`} fill="#2F91D1" pointerEvents="none" />
                        
                        {/* Render PT1S */}
                        {pt1s ? (
                          <g transform={\`translate(\${xBase}, 250)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(pt1s.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pt1s.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={pt1s.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pt1s.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase}, 250)\`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}
                        
                        {/* Render PT2S */}
                        {pt2s ? (
                          <g transform={\`translate(\${xBase}, 310)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(pt2s.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pt2s.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={pt2s.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pt2s.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase}, 310)\`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}

                        {/* Valve */}
                        <g transform={\`translate(\${xBase}, 370)\`} pointerEvents="none">
                           <polygon points="-12,-8 -12,8 12,-8 12,8" fill="#333" stroke="#aaa" strokeWidth="2" />
                        </g>

                        {/* FAB TOOL BOX */}
                        <g transform={\`translate(\${xBase - 35}, 420)\`} pointerEvents="none">
                          <rect x="0" y="0" width="70" height="60" fill="#252525" stroke="#4B4B4B" strokeWidth="2" rx="4" />
                          <text x="35" y="25" fill="#B8B8B8" fontSize="12" textAnchor="middle" fontWeight="bold">FAB</text>
                          <text x="35" y="45" fill="#B8B8B8" fontSize="12" textAnchor="middle">TOOL</text>
                        </g>

                        {/* Return Branch Pipe */}
                        <path d={\`M \${xBase} 480 L \${xBase} 750\`} stroke="url(#pipeReturnLg)" strokeWidth="6" fill="none" pointerEvents="none" />
                        <polygon points={\`\${xBase - 5},730 \${xBase + 5},730 \${xBase},745\`} fill="#D45A4A" pointerEvents="none" />

                        {/* Flow Meter FT */}
                        {ft ? (
                          <g transform={\`translate(\${xBase}, 530)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(ft.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={ft.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">FT</text>
                            <text x="-25" y="4" fill={ft.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{ft.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase}, 530)\`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">FT</text>
                          </g>
                        )}

                        {/* Render PT1R */}
                        {pt1r ? (
                          <g transform={\`translate(\${xBase}, 590)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(pt1r.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pt1r.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={pt1r.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pt1r.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase}, 590)\`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}

                        {/* Render PT2R */}
                        {pt2r ? (
                          <g transform={\`translate(\${xBase}, 650)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(pt2r.tagId); }}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke={pt2r.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="11" textAnchor="middle">PT</text>
                            <text x="-25" y="4" fill={pt2r.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="14" fontWeight="bold" textAnchor="end">{pt2r.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase}, 650)\`}>
                            <circle cx="0" cy="0" r="18" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="11" textAnchor="middle">PT</text>
                          </g>
                        )}

                        {/* Render PDT */}
                        {pdt ? (
                          <g transform={\`translate(\${xBase + 35}, 450)\`} onClick={(e) => { e.stopPropagation(); openTagDetail(pdt.tagId); }}>
                            <circle cx="0" cy="0" r="14" fill="#222" stroke={pdt.alarmState !== 'NONE' ? '#D62828' : '#aaa'} strokeWidth="2" />
                            <text x="0" y="4" fill="#fff" fontSize="9" textAnchor="middle">DP</text>
                            <text x="18" y="4" fill={pdt.alarmState !== 'NONE' ? '#D62828' : '#fff'} fontSize="11" fontWeight="bold" textAnchor="start">{pdt.value.toFixed(2)}</text>
                          </g>
                        ) : (
                          <g transform={\`translate(\${xBase + 35}, 450)\`}>
                            <circle cx="0" cy="0" r="14" fill="#222" stroke="#555" strokeWidth="2" strokeDasharray="2 2" />
                            <text x="0" y="4" fill="#555" fontSize="9" textAnchor="middle">DP</text>
                          </g>
                        )}
                        
                      </g>
                    );
                  })}
                </svg>`;

const startIndex = content.indexOf('<svg width="5200"');
const endIndex = content.indexOf('</svg>', startIndex) + 6;

if (startIndex !== -1 && endIndex !== -1) {
    const finalContent = content.substring(0, startIndex) + newSvg + content.substring(endIndex);
    fs.writeFileSync(file, finalContent);
    console.log("Successfully replaced SVG.");
} else {
    console.error("Could not find SVG tags in file.");
}
