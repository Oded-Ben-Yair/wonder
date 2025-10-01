import { chromium } from 'playwright';

async function testLocalInBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Track network requests
  const failedRequests = [];
  const successfulRequests = [];

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || 'unknown';

    if (status >= 400) {
      failedRequests.push({ url, status, contentType });
    } else {
      successfulRequests.push({ url, status, contentType });
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text());
    }
  });

  console.log('Testing local server in real browser...\n');

  try {
    // Navigate to the site
    console.log('1. Navigating to http://localhost:5053 ...');
    await page.goto('http://localhost:5053', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log('\n2. Successful requests:');
    successfulRequests.forEach(req => {
      const file = req.url.substring(req.url.lastIndexOf('/'));
      console.log(`   ✓ ${req.status} - ${req.contentType} - ${file}`);
    });

    console.log('\n3. Failed requests:');
    if (failedRequests.length === 0) {
      console.log('   No failed requests - GOOD!');
    } else {
      failedRequests.forEach(req => {
        const file = req.url.substring(req.url.lastIndexOf('/'));
        console.log(`   ✗ ${req.status} - ${req.contentType} - ${file}`);
      });
    }

    // Check if React app loaded
    await page.waitForTimeout(2000);
    const reactMounted = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !document.getElementById('loading');
    });
    console.log(`\n4. React app mounted: ${reactMounted}`);

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

testLocalInBrowser().catch(console.error);