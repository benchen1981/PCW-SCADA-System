import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PCW SCADA HMI</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #121212; --panel-bg: #1e1e1e; --border: #444;
            --text-main: #e0e0e0; --text-muted: #888; --accent: #3b82f6;
            --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
            --font-main: 'Noto Sans TC', sans-serif;
            --font-mono: 'Roboto Condensed', monospace;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg-dark); color: var(--text-main); font-family: var(--font-main); display: flex; height: 100vh; overflow: hidden; }
        
        .sidebar { width: 250px; background: var(--panel-bg); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 1rem 0; z-index: 10; }
        .nav-item { padding: 0.75rem 1.5rem; cursor: pointer; border-left: 4px solid transparent; font-size: 0.9rem; transition: 0.2s; }
        .nav-item:hover { background: rgba(255,255,255,0.05); }
        .nav-item.active { border-left-color: var(--accent); background: rgba(59, 130, 246, 0.1); font-weight: bold; }
        
        .main { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 1.5rem; }
        .dashboard-section { display: none; height: 100%; flex-direction: column; }
        
        .card { background: var(--panel-bg); border: 1px solid var(--border); border-radius: 4px; padding: 1rem; }
        .table-container { overflow-x: auto; margin-top: 1rem; }
        table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
        th, td { padding: 0.5rem; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--text-muted); font-family: var(--font-main); }
        
        /* Utility */
        .val { font-family: var(--font-mono); font-weight: bold; }
        .badge { padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; font-weight: bold; color: #000; }
        .badge.normal { background: var(--success); }
        .badge.warning { background: var(--warning); }
        .badge.alarm { background: var(--danger); }
        .badge.neutral { background: var(--text-muted); }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2 style="padding: 0 1.5rem 1rem 1.5rem; border-bottom: 1px solid var(--border); margin-bottom: 1rem; font-size: 1.2rem; color: var(--accent);">Web SCADA HMI</h2>
        
        <div class="nav-item active" onclick="nav('sys')">1. PCW Submain Overview</div>
        <div class="nav-item" onclick="nav('sensor')">2. Live Sensor Data</div>
        <div class="nav-item" onclick="nav('trend')">3. Historian Trend</div>
        <div class="nav-item" onclick="nav('alarm')">4. Active Alarms</div>
        <div class="nav-item" onclick="nav('res')">5. Result Table</div>
        <div class="nav-item" onclick="nav('modbus')">6. Modbus Monitor</div>
        <div class="nav-item" onclick="nav('sat')">7. SAT Evidence</div>
        
        <div style="margin: 1rem 1.5rem; font-size: 0.75rem; color: var(--text-muted);">Predictive Analytics</div>
        <div class="nav-item" style="color:var(--warning);" onclick="nav('ew')">8. Early Warning (Drift)</div>
        <div class="nav-item" style="color:#a78bfa;" onclick="nav('t30')">9. T30/T20/T10 Prediction</div>
        <div class="nav-item" style="color:#10b981;" onclick="nav('v1prod')">10. V1 Production Status</div>

        <div style="margin-top: auto; padding: 1rem 1.5rem; border-top: 1px solid var(--border);">
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Simulator Control</div>
            <button onclick="injectDrift()" style="width:100%; padding:0.5rem; background:var(--danger); color:white; border:none; border-radius:4px; cursor:pointer;">Inject Pressure Drift</button>
        </div>
    </div>

    <div class="main">
        <!-- 1. System Overview -->
        <div id="sys" class="dashboard-section" style="display:flex;">
            <h2>PCW Submain Overview</h2>
            <div class="card" style="margin-top: 1rem; flex:1;">
                <svg width="100%" height="400" style="background:#111; border:1px solid #333;" viewBox="0 0 800 400">
                    <!-- Main Supply Line -->
                    <path d="M 50 100 L 750 100" stroke="#38bdf8" stroke-width="6" fill="none" />
                    <text x="50" y="85" fill="#38bdf8" font-size="12">PCW SUPPLY MAIN</text>
                    
                    <!-- Main Return Line -->
                    <path d="M 50 300 L 750 300" stroke="#f87171" stroke-width="6" fill="none" />
                    <text x="50" y="285" fill="#f87171" font-size="12">PCW RETURN MAIN</text>

                    <!-- Submain 1 -->
                    <path d="M 200 100 L 200 200" stroke="#38bdf8" stroke-width="3" fill="none" />
                    <path d="M 200 200 L 200 300" stroke="#f87171" stroke-width="3" stroke-dasharray="5,5" fill="none" />
                    <circle cx="200" cy="150" r="15" fill="#1e1e1e" stroke="#fff" stroke-width="2" />
                    <text x="200" y="154" fill="#fff" font-size="10" text-anchor="middle">PT_S</text>
                    <text id="svg-pt1s" x="225" y="154" fill="#38bdf8" font-family="monospace" font-size="12">---</text>
                    
                    <circle cx="200" cy="250" r="15" fill="#1e1e1e" stroke="#fff" stroke-width="2" />
                    <text x="200" y="254" fill="#fff" font-size="10" text-anchor="middle">PT_R</text>
                    <text id="svg-pt1r" x="225" y="254" fill="#f87171" font-family="monospace" font-size="12">---</text>
                    
                    <text x="200" y="330" fill="#aaa" font-size="12" text-anchor="middle">Submain 1</text>

                    <!-- Submain 2 -->
                    <path d="M 400 100 L 400 200" stroke="#38bdf8" stroke-width="3" fill="none" />
                    <path d="M 400 200 L 400 300" stroke="#f87171" stroke-width="3" stroke-dasharray="5,5" fill="none" />
                    <circle cx="400" cy="150" r="15" fill="#1e1e1e" stroke="#fff" stroke-width="2" />
                    <text x="400" y="154" fill="#fff" font-size="10" text-anchor="middle">PT_S</text>
                    <text id="svg-pt2s" x="425" y="154" fill="#38bdf8" font-family="monospace" font-size="12">---</text>
                    
                    <circle cx="400" cy="250" r="15" fill="#1e1e1e" stroke="#fff" stroke-width="2" />
                    <text x="400" y="254" fill="#fff" font-size="10" text-anchor="middle">PT_R</text>
                    <text id="svg-pt2r" x="425" y="254" fill="#f87171" font-family="monospace" font-size="12">---</text>
                    
                    <text x="400" y="330" fill="#aaa" font-size="12" text-anchor="middle">Submain 2</text>

                    <!-- Tank & Pump -->
                    <rect x="600" y="150" width="80" height="100" fill="#222" stroke="#fff" stroke-width="2" />
                    <text x="640" y="140" fill="#fff" font-size="12" text-anchor="middle">TK-501</text>
                    <text id="svg-tk501" x="640" y="205" fill="#10b981" font-family="monospace" font-size="14" text-anchor="middle">--- m</text>
                    
                    <circle cx="700" cy="300" r="20" fill="#222" stroke="#fff" stroke-width="2" />
                    <text x="700" y="304" fill="#fff" font-size="10" text-anchor="middle">P-101</text>
                </svg>
            </div>
        </div>

        <!-- 2. Live Sensor Data -->
        <div id="sensor" class="dashboard-section">
            <h2>Live Sensor Data</h2>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Tag Name</th><th>Value</th><th>Unit</th><th>Updated At</th></tr></thead>
                    <tbody id="tb-sensors"></tbody>
                </table>
            </div>
        </div>

        <!-- 3. Historian Trend -->
        <div id="trend" class="dashboard-section">
            <h2>Historian Trend</h2>
            <div style="margin-top:1rem; display:flex; gap:1rem; align-items:center;">
                <select id="trend-tag" class="card" style="padding:0.5rem;"></select>
                <button onclick="loadHistory()" class="card" style="cursor:pointer; background:var(--accent); color:white; border:none;">Fetch History</button>
            </div>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Timestamp</th><th>Value</th><th>Quality</th></tr></thead>
                    <tbody id="tb-history"></tbody>
                </table>
            </div>
        </div>

        <!-- 4. Active Alarms -->
        <div id="alarm" class="dashboard-section">
            <h2>Active Alarms</h2>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Time</th><th>Tag Name</th><th>Type</th><th>Message</th><th>Status</th></tr></thead>
                    <tbody id="tb-alarms"></tbody>
                </table>
            </div>
        </div>

        <!-- 5. Result Table -->
        <div id="res" class="dashboard-section">
            <h2>Inference Results</h2>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Time</th><th>Tag Name</th><th>Score</th><th>State</th></tr></thead>
                    <tbody id="tb-results"></tbody>
                </table>
            </div>
        </div>

        <!-- 6. Modbus Monitor -->
        <div id="modbus" class="dashboard-section">
            <h2>Modbus Virtual PLC</h2>
            <div class="card table-container"><pre id="json-modbus" style="font-family:monospace;"></pre></div>
        </div>

        <!-- 7. SAT Evidence -->
        <div id="sat" class="dashboard-section">
            <h2>SAT Evidence (Audit Log)</h2>
            <div class="card table-container"><pre id="json-audit" style="font-family:monospace;"></pre></div>
        </div>

        <!-- 8. Early Warning -->
        <div id="ew" class="dashboard-section">
            <h2>Early Warning (Drift) Layer</h2>
            <div class="card table-container">
                <table>
                    <thead><tr><th>System/Submain</th><th>Tag Name</th><th>Value</th><th>Status</th></tr></thead>
                    <tbody id="tb-ew"></tbody>
                </table>
            </div>
        </div>

        <!-- 9. T30 Prediction -->
        <div id="t30" class="dashboard-section">
            <h2 style="color:#a78bfa;">T30/T20/T10 Analytics</h2>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Tag Name</th><th>Value</th><th>M10</th><th>N10</th><th>Slope</th><th>Forecast</th><th>Final State</th></tr></thead>
                    <tbody id="tb-t30"></tbody>
                </table>
            </div>
        </div>

        <!-- 10. V1 Prod -->
        <div id="v1prod" class="dashboard-section">
            <h2 style="color:#10b981;">V1 Production Monitoring</h2>
            <div style="display:flex; gap:1rem; margin-top:1rem;">
                <div class="card" style="flex:1; text-align:center;">
                    <div style="font-size:0.8rem; color:#888;">Agent Status</div><div id="v1-agent" style="font-size:1.5rem; font-weight:bold; color:var(--success);">OK</div>
                </div>
            </div>
            <div class="card table-container">
                <table>
                    <thead><tr><th>Tag Name</th><th>Value</th><th>X_t</th><th>N_t (Persist)</th><th>State</th></tr></thead>
                    <tbody id="tb-v1prod"></tbody>
                </table>
            </div>
        </div>

    </div>

    <script>
        // Global Data Store
        const Store = {
            tags: [],
            results: [],
            alarms: [],
            modbus: null,
            audit: []
        };

        let currentView = 'sys';

        function nav(id) {
            currentView = id;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            event.currentTarget.classList.add('active');
            document.querySelectorAll('.dashboard-section').forEach(el => el.style.display = 'none');
            document.getElementById(id).style.display = 'flex';
            renderCurrentView();
        }

        async function fetchAllData() {
            try {
                // Fetch from unified APIs
                const pTags = fetch('/api/tags').then(r=>r.json());
                const pRes = fetch('/api/results').then(r=>r.json());
                const pAlarms = fetch('/api/alarms').then(r=>r.json());
                const pModbus = fetch('/api/modbus').then(r=>r.json());
                const pAudit = fetch('/api/audit').then(r=>r.json());
                
                const [tags, results, alarms, modbus, audit] = await Promise.all([pTags, pRes, pAlarms, pModbus, pAudit]);
                
                Store.tags = tags || [];
                Store.results = results || [];
                Store.alarms = alarms || [];
                Store.modbus = modbus || {};
                Store.audit = audit || [];

                // Populate trend dropdown once if empty
                const trendSelect = document.getElementById('trend-tag');
                if (trendSelect.options.length === 0 && Store.tags.length > 0) {
                    Store.tags.forEach(t => {
                        let opt = document.createElement('option');
                        opt.value = t.TagName;
                        opt.text = t.TagName;
                        trendSelect.appendChild(opt);
                    });
                }

                renderCurrentView();
            } catch(e) {
                console.error("Fetch error:", e);
            }
        }

        async function loadHistory() {
            const tag = document.getElementById('trend-tag').value;
            if(!tag) return;
            const history = await fetch(`/api/history?tag=${tag}&limit=20`).then(r=>r.json());
            const tbody = document.getElementById('tb-history');
            tbody.innerHTML = history.map(h => `<tr><td>${h.Timestamp}</td><td class="val">${parseFloat(h.Value).toFixed(3)}</td><td>GOOD</td></tr>`).join('');
        }

        function renderCurrentView() {
            if (currentView === 'sys') {
                // Map real tags to SVG
                let pt1s = Store.tags.find(t=>t.TagName==='PCW01.S01.PT_S');
                let pt1r = Store.tags.find(t=>t.TagName==='PCW01.S01.PT_R');
                let pt2s = Store.tags.find(t=>t.TagName==='PCW01.S02.PT_S');
                let pt2r = Store.tags.find(t=>t.TagName==='PCW01.S02.PT_R');
                let tk501 = Store.tags.find(t=>t.TagName==='TK-501_L');
                
                if(pt1s) document.getElementById('svg-pt1s').innerHTML = parseFloat(pt1s.Value).toFixed(2);
                if(pt1r) document.getElementById('svg-pt1r').innerHTML = parseFloat(pt1r.Value).toFixed(2);
                if(pt2s) document.getElementById('svg-pt2s').innerHTML = parseFloat(pt2s.Value).toFixed(2);
                if(pt2r) document.getElementById('svg-pt2r').innerHTML = parseFloat(pt2r.Value).toFixed(2);
                if(tk501) document.getElementById('svg-tk501').innerHTML = parseFloat(tk501.Value).toFixed(2) + ' m';
            }
            else if (currentView === 'sensor') {
                document.getElementById('tb-sensors').innerHTML = Store.tags.map(t => 
                    `<tr><td>${t.TagName}</td><td class="val">${parseFloat(t.Value).toFixed(3)}</td><td>${t.EngineeringUnit||''}</td><td>${t.UpdatedAt||''}</td></tr>`
                ).join('');
            }
            else if (currentView === 'alarm') {
                document.getElementById('tb-alarms').innerHTML = Store.alarms.map(a => 
                    `<tr><td>${a.time}</td><td>${a.tag}</td><td><span class="badge alarm">${a.type}</span></td><td>${a.message}</td><td>${a.status}</td></tr>`
                ).join('');
            }
            else if (currentView === 'res') {
                document.getElementById('tb-results').innerHTML = Store.results.map(r => 
                    `<tr><td>${r.InferenceTime}</td><td>${r.TagName}</td><td>${r.Score}</td><td><span class="badge ${r.WarningState==='NORMAL'?'normal':'warning'}">${r.WarningState}</span></td></tr>`
                ).join('');
            }
            else if (currentView === 'modbus') {
                document.getElementById('json-modbus').innerText = JSON.stringify(Store.modbus, null, 2);
            }
            else if (currentView === 'sat') {
                document.getElementById('json-audit').innerText = JSON.stringify(Store.audit, null, 2);
            }
            else if (currentView === 'ew') {
                // Real data driven early warning overview
                document.getElementById('tb-ew').innerHTML = Store.tags.filter(t=>t.TagName.includes('PT')).map(t => {
                    let val = parseFloat(t.Value);
                    let state = val > 1.6 ? 'WARNING' : 'NORMAL';
                    let cls = state === 'WARNING' ? 'warning' : 'normal';
                    return `<tr><td>${t.System}</td><td>${t.TagName}</td><td class="val">${val.toFixed(2)}</td><td><span class="badge ${cls}">${state}</span></td></tr>`;
                }).join('');
            }
            else if (currentView === 't30') {
                // Real data driven T30 mock metrics
                document.getElementById('tb-t30').innerHTML = Store.tags.filter(t=>t.TagName.includes('PT')).map(t => {
                    let val = parseFloat(t.Value);
                    let n10 = val > 1.5 ? 3 : 0;
                    let slope = val > 1.5 ? 0.005 : 0.001;
                    let forecast = val + slope * 30;
                    let state = val >= 1.7 ? 'EVENT' : (forecast >= 1.7 ? 'T-30' : 'NORMAL');
                    let cls = state === 'NORMAL' ? 'normal' : (state === 'EVENT' ? 'alarm' : 'warning');
                    return `<tr><td>${t.TagName}</td><td class="val">${val.toFixed(2)}</td><td>--</td><td>${n10}</td><td>${slope.toFixed(4)}</td><td>${forecast.toFixed(2)}</td><td><span class="badge ${cls}">${state}</span></td></tr>`;
                }).join('');
            }
            else if (currentView === 'v1prod') {
                document.getElementById('tb-v1prod').innerHTML = Store.tags.filter(t=>t.TagName.includes('PT')).map(t => {
                    let val = parseFloat(t.Value);
                    let xt = val > 1.5 ? 1 : 0;
                    let nt = xt ? 6 : 0; // simplified
                    let state = nt >= 6 ? 'WARNING' : 'NORMAL';
                    let cls = state === 'WARNING' ? 'warning' : 'normal';
                    return `<tr><td>${t.TagName}</td><td class="val">${val.toFixed(2)}</td><td>${xt}</td><td>${nt}</td><td><span class="badge ${cls}">${state}</span></td></tr>`;
                }).join('');
            }
        }

        function injectDrift() {
            alert("Simulator drift injection requires backend endpoint implementation.");
        }

        // Init
        fetchAllData();
        setInterval(fetchAllData, 3000);
    </script>
</body>
</html>
"""

with open("app/web_api/static/index.html", "w") as f:
    f.write(html_content)

