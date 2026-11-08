const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const targets = [
  { url: 'http://localhost:5173/', name: 'figure_ui_01_plant_overview.png', desc: 'Plant Overview' },
  { url: 'http://localhost:5173/sensors', name: 'figure_ui_02_live_sensors.png', desc: 'Live Sensor Data' },
  { url: 'http://localhost:5173/submain/PCW01', name: 'figure_ui_03_submain_pid.png', desc: 'Submain P&ID Detail' },
  { url: 'http://localhost:5173/historian', name: 'figure_ui_04_historian_trend.png', desc: 'Historian Trend' },
  { url: 'http://localhost:5173/live-trend', name: 'figure_ui_05_live_trend.png', desc: 'Live Trend' },
  { url: 'http://localhost:5173/alarms', name: 'figure_ui_06_alarm_center.png', desc: 'Alarm Center' },
  { url: 'http://localhost:5173/t30', name: 'figure_ui_07_prediction_t30.png', desc: 'Prediction T-30' },
  { url: 'http://localhost:5173/modbus', name: 'figure_ui_08_modbus_simulator.png', desc: 'Modbus Simulator' },
  { url: 'http://localhost:5173/model-info', name: 'figure_ui_09_model_info.png', desc: 'Prediction Model Info' }
];

const destDirs = [
  path.resolve(__dirname, '../../thesis/figures'),
  path.resolve(__dirname, '../thesis/figures'),
  path.resolve('/Users/benchen1981/.gemini/antigravity-ide/brain/e2d8da10-2c1f-4d47-810a-14493dcd7112')
];

destDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

(async () => {
  console.log('Launching Puppeteer for academic UI evidence capture (1920x1080)...');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();

  // First visit root to ensure store is initialized
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 1500));

  // Inject active drift scenario into PCW01 PT sensor to show active prediction and alarm state
  await page.evaluate(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('pcw_sim_configs') || '{}');
      cfg['PCW01.Submain01.PT_S'] = {
        tagId: 'PCW01.Submain01.PT_S',
        scenario: 'DRIFT_UP',
        driftRatePerMin: 0.05,
        stepOffset: 0.15,
        baseValue: 2.20
      };
      localStorage.setItem('pcw_sim_configs', JSON.stringify(cfg));
    } catch (e) {
      console.error(e);
    }
  });

  for (const t of targets) {
    console.log(`Navigating to ${t.desc} (${t.url})...`);
    await page.goto(t.url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // If on modbus page, click to simulator tab for an extra screenshot
    for (const dir of destDirs) {
      const outPath = path.join(dir, t.name);
      await page.screenshot({ path: outPath, fullPage: false });
    }
    console.log(`Saved screenshot: ${t.name}`);

    if (t.url.includes('/modbus')) {
      try {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const txt = await page.evaluate(el => el.textContent, btn);
          if (txt && txt.includes('Sensor Simulator')) {
            await btn.click();
            await new Promise(r => setTimeout(r, 1000));
            for (const dir of destDirs) {
              const simOut = path.join(dir, 'figure_ui_08b_modbus_tuning.png');
              await page.screenshot({ path: simOut, fullPage: false });
            }
            console.log('Saved screenshot: figure_ui_08b_modbus_tuning.png');
            break;
          }
        }
      } catch (err) {
        console.error('Error switching modbus tab:', err);
      }
    }
  }

  await browser.close();
  console.log('Academic UI evidence capture complete!');
})();
