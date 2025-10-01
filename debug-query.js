import { chromium } from 'playwright';

async function debugQuery() {
  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--disable-web-security']
  });

  const page = await browser.newContext().then(c => c.newPage());

  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });

  // Capture network requests
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/match')) {
      requests.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData()
      });
    }
  });

  try {
    await page.goto('https://wonder-ceo-web.azurewebsites.net');
    await page.waitForTimeout(3000);

    // Click Chat Only
    await page.click('text=Chat Only');
    await page.waitForTimeout(1000);

    const input = page.locator('input[placeholder*="Ask me"]');
    await input.fill("Who's available today at 3pm in Tel Aviv?");
    await page.keyboard.press('Enter');

    // Wait for request
    await page.waitForTimeout(8000);

    console.log('\n📊 Console Logs:');
    logs.forEach(log => console.log(log));

    console.log('\n🌐 Network Requests:');
    requests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
      if (req.postData) {
        console.log('Payload:', req.postData);
      }
    });

  } finally {
    await browser.close();
  }
}

debugQuery().catch(console.error);