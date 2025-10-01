import { chromium } from 'playwright';

async function testAzureInBrowser() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Enable console logging
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

  console.log('Testing Azure deployment in real browser...\n');

  try {
    // Navigate to the site
    console.log('1. Navigating to https://wonder-ceo-web.azurewebsites.net ...');
    await page.goto('https://wonder-ceo-web.azurewebsites.net', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('\n2. Successful requests:');
    successfulRequests.forEach(req => {
      console.log(`   ✓ ${req.status} - ${req.contentType} - ${req.url.substring(req.url.lastIndexOf('/'))}`);
    });

    console.log('\n3. Failed requests:');
    if (failedRequests.length === 0) {
      console.log('   No failed requests');
    } else {
      failedRequests.forEach(req => {
        console.log(`   ✗ ${req.status} - ${req.contentType} - ${req.url.substring(req.url.lastIndexOf('/'))}`);
      });
    }

    // Check if page loaded correctly
    const title = await page.title();
    console.log(`\n4. Page title: ${title}`);

    // Check for specific elements
    const hasRoot = await page.locator('#root').count() > 0;
    const hasLoadingDiv = await page.locator('#loading').count() > 0;
    console.log(`5. Has #root element: ${hasRoot}`);
    console.log(`6. Has #loading element: ${hasLoadingDiv}`);

    // Check if React app loaded
    await page.waitForTimeout(3000); // Give React time to mount
    const reactMounted = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0 && !document.getElementById('loading');
    });
    console.log(`7. React app mounted: ${reactMounted}`);

    // Take a screenshot
    await page.screenshot({ path: 'azure-browser-test.png' });
    console.log('\n8. Screenshot saved as azure-browser-test.png');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

testAzureInBrowser().catch(console.error);