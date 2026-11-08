const puppeteer = require('puppeteer');
const fs = require('fs');

const sensors = ['PT-01', 'TT-01', 'FT-01', 'PT-02', 'TT-02', 'FT-02', 'PT-03', 'TT-03', 'PT-04', 'TT-04'];
const scenarios = ['DRIFT_UP', 'DRIFT_DOWN', 'STEP', 'SPIKE', 'NONE'];
const pages = ['t30', 'historian'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1920, height: 1080 } });
  const page = await browser.newPage();
  
  if (!fs.existsSync('../evidence/batch')) {
      fs.mkdirSync('../evidence/batch', { recursive: true });
  }

  let count = 0;
  
  console.log('Starting batch screenshot generation...');
  
  for (const sensor of sensors) {
    for (const scenario of scenarios) {
      if (count >= 100) break;
      
      console.log(`Setting up ${sensor} with ${scenario}`);
      
      // Navigate to app root to inject localStorage
      await page.goto('http://localhost:5173');
      
      // Inject config
      await page.evaluate(({sensor, scenario}) => {
         const simCfg = JSON.parse(localStorage.getItem('pcw_sim_configs') || '{}');
         simCfg[sensor] = {
             tagId: sensor,
             scenario: scenario,
             driftRatePerMin: 0.1,
             stepOffset: 2.0
         };
         localStorage.setItem('pcw_sim_configs', JSON.stringify(simCfg));
         // Clear historian so backfill picks up the new scenario
         localStorage.removeItem('pcw_hist_v4');
      }, {sensor, scenario});
      
      // Cycle through pages
      for (const p of pages) {
         if (count >= 100) break;
         await page.goto(`http://localhost:5173/${p}`);
         
         // Wait for charts to render
         await new Promise(r => setTimeout(r, 2000));
         
         const filename = `../evidence/batch/Proof_${String(count + 1).padStart(3, '0')}_${sensor}_${scenario}_${p}.png`;
         await page.screenshot({ path: filename, fullPage: true });
         console.log(`Saved ${filename}`);
         count++;
      }
    }
  }

  await browser.close();
  console.log('Done generating 100 screenshots!');
})();
