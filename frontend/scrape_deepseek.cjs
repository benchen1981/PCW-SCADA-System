const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log('Navigating to DeepSeek share link...');
  await page.goto('https://chat.deepseek.com/share/excyxpzellbnyrmo9w', { waitUntil: 'networkidle2' });
  
  // Wait for the chat to load
  await new Promise(r => setTimeout(r, 3000));
  
  console.log('Extracting text...');
  const text = await page.evaluate(() => {
    // Attempt to find the chat container. DeepSeek shares usually have a main container.
    // If we can't find specific message bubbles, we'll just grab the innerText of the body,
    // but try to be smart about it.
    const messages = document.querySelectorAll('.ds-markdown, .markdown-body, [class*="message"]');
    if (messages.length > 0) {
        let content = '';
        document.querySelectorAll('[class*="chat-block"], [class*="message-wrapper"], .ds-markdown').forEach(el => {
            content += el.innerText + '\n\n';
        });
        if (content.trim().length > 100) return content;
    }
    
    // Fallback: just get the whole page text but skip the top nav
    return document.body.innerText;
  });
  
  fs.writeFileSync('../deepseek_share.md', text);
  console.log('Saved to deepseek_share.md');
  
  await browser.close();
})();
