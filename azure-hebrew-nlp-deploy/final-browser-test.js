const puppeteer = require('puppeteer');

(async () => {
  console.log('Final Azure Website Test\n' + '='.repeat(50));

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const errors = [];
  const successes = [];

  page.on('response', response => {
    const url = response.url();
    const status = response.status();

    if (url.includes('azurewebsites.net')) {
      if (status >= 400) {
        errors.push(`${status} - ${url.substring(url.lastIndexOf('/'))}`);
      } else {
        successes.push(`${status} - ${url.substring(url.lastIndexOf('/'))}`);
      }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console Error:', msg.text());
    }
  });

  try {
    console.log('Loading https://wonder-hebrew-works.azurewebsites.net\n');

    const response = await page.goto('https://wonder-hebrew-works.azurewebsites.net', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Check main resources
    console.log('✅ Successful Resources:');
    successes.forEach(s => console.log(`   ${s}`));

    if (errors.length > 0) {
      console.log('\n❌ Failed Resources:');
      errors.forEach(e => console.log(`   ${e}`));
    } else {
      console.log('\n✅ No 403 or 404 errors found!');
    }

    // Check page content
    const title = await page.title();
    const hasHebrew = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('אחות') || text.includes('חפש') || text.includes('שלום');
    });

    console.log('\n📋 Page Status:');
    console.log(`   Title: ${title}`);
    console.log(`   Hebrew Content: ${hasHebrew ? '✅ Found' : '❌ Not Found'}`);

    // Test API
    const apiResponse = await page.evaluate(async () => {
      try {
        const res = await fetch('/health');
        return { status: res.status, ok: res.ok };
      } catch (e) {
        return { error: e.message };
      }
    });

    console.log(`   Health API: ${apiResponse.ok ? '✅ Working' : '❌ Failed'}`);

    // Take screenshot
    await page.screenshot({ path: 'azure-final-test.png' });
    console.log('\n📸 Screenshot saved as azure-final-test.png');

  } catch (error) {
    console.error('Error during test:', error.message);
  }

  await browser.close();
  console.log('\n' + '='.repeat(50));
  console.log('Test Complete!');
})();