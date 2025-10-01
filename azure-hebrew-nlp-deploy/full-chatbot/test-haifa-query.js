/**
 * Quick test for Haifa query that was failing
 */

const { chromium } = require('playwright');

async function testHaifaQuery() {
  console.log('Testing: חפש אחות למתן תרופות בחיפה');
  console.log('URL: https://wonder-ceo-web.azurewebsites.net');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newContext().then(c => c.newPage());

  try {
    // Load site
    console.log('Loading site...');
    await page.goto('https://wonder-ceo-web.azurewebsites.net', { waitUntil: 'networkidle', timeout: 60000 });
    console.log('✅ Site loaded');

    // Wait for input
    await page.waitForSelector('input[placeholder*="שאל"]', { timeout: 30000 });
    console.log('✅ Chat input ready');

    // Submit query
    const query = 'חפש אחות למתן תרופות בחיפה';
    await page.locator('input[placeholder*="שאל"]').fill(query);
    await page.keyboard.press('Enter');
    console.log(`✅ Query submitted: "${query}"`);

    // Wait for results
    console.log('Waiting for results...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'haifa-test-result.png', fullPage: true });

    // Check results
    const pageText = await page.textContent('body');

    if (pageText.includes('לא מצאנו התאמות')) {
      console.log('❌ FAILED: No matches found');
      console.log('   This means city matching is still broken');
    } else if (pageText.includes('נמצאו')) {
      // Extract number of results
      const match = pageText.match(/נמצאו (\d+)/);
      if (match) {
        console.log(`✅ SUCCESS: Found ${match[1]} nurses in Haifa!`);
      } else {
        console.log('✅ SUCCESS: Results found (count not extracted)');
      }
    } else {
      console.log('⚠️  UNKNOWN: Could not determine if results were found');
    }

    console.log('\n📸 Screenshot saved: haifa-test-result.png');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  } finally {
    await browser.close();
  }
}

testHaifaQuery();
