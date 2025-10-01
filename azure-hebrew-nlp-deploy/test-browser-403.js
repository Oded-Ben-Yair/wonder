const puppeteer = require('puppeteer');

(async () => {
  console.log('Testing Azure website for 403 errors...\n');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Track all network requests
  const failedRequests = [];

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    if (status >= 400) {
      console.log(`❌ ${status} - ${url}`);
      failedRequests.push({ url, status });
    } else if (url.includes('azurewebsites.net')) {
      console.log(`✅ ${status} - ${url}`);
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });

  try {
    console.log('Navigating to https://wonder-hebrew-works.azurewebsites.net ...\n');
    const response = await page.goto('https://wonder-hebrew-works.azurewebsites.net', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log(`\nMain page status: ${response.status()}`);

    // Check if React app loaded
    const content = await page.content();
    const hasReact = content.includes('root') || content.includes('React');
    const hasHebrew = content.includes('אחות') || content.includes('חפש');

    console.log(`React app loaded: ${hasReact ? 'Yes' : 'No'}`);
    console.log(`Hebrew content found: ${hasHebrew ? 'Yes' : 'No'}`);

    // Try to get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check for specific elements
    const appRoot = await page.$('#root');
    console.log(`App root element found: ${appRoot ? 'Yes' : 'No'}`);

    if (failedRequests.length > 0) {
      console.log('\n⚠️  Failed requests summary:');
      failedRequests.forEach(req => {
        console.log(`   - ${req.status}: ${req.url}`);
      });
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  }

  await browser.close();
})();