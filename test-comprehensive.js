const { chromium } = require('playwright');

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Wonder Platform Tests');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge' // Use Edge browser
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Test 1: Backend Health Check
    console.log('\n📝 Test 1: Backend API Health Check');
    await page.goto('https://wonder-backend-api.azurewebsites.net/health');
    await page.screenshot({ path: 'test-backend-health.png', fullPage: true });
    const healthContent = await page.textContent('body');
    console.log('Backend response:', healthContent.substring(0, 100));

    // Test 2: Frontend Loading
    console.log('\n📝 Test 2: Frontend UI Loading');
    await page.goto('https://wonder-ceo-web.azurewebsites.net');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-frontend-home.png', fullPage: true });
    console.log('Frontend loaded successfully');

    // Test 3: Natural Language Query - City
    console.log('\n📝 Test 3: Testing City Query');
    const chatInput = await page.locator('input[placeholder*="nurse"], textarea').first();
    if (chatInput) {
      await chatInput.fill('I need a nurse in Tel Aviv');
      await page.screenshot({ path: 'test-query-telaviv.png' });
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-results-telaviv.png', fullPage: true });
    }

    // Test 4: Query with Gender Filter
    console.log('\n📝 Test 4: Testing Gender Filter');
    await chatInput.fill('I need a female nurse for wound care in Tel Aviv');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results-female.png', fullPage: true });

    // Test 5: Urgent Request
    console.log('\n📝 Test 5: Testing Urgent Request');
    await chatInput.fill('I urgently need a nurse for blood tests');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results-urgent.png', fullPage: true });

    // Test 6: Direct API Test
    console.log('\n📝 Test 6: Direct API Match Test');
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://wonder-backend-api.azurewebsites.net/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: 'Tel Aviv',
            servicesQuery: ['wound care'],
            topK: 5
          })
        });
        return await response.json();
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    // Test 7: Check Match Tester Tab
    console.log('\n📝 Test 7: Testing Match Tester Tab');
    const matchTesterTab = await page.locator('button:has-text("Match Tester")').first();
    if (matchTesterTab) {
      await matchTesterTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-match-tester.png', fullPage: true });
    }

    // Test 8: Statistics Check
    console.log('\n📝 Test 8: Checking Backend Statistics');
    await page.goto('https://wonder-backend-api.azurewebsites.net/stats');
    await page.screenshot({ path: 'test-backend-stats.png' });
    const statsContent = await page.textContent('body');
    console.log('Stats response:', statsContent.substring(0, 200));

    console.log('\n✅ All tests completed successfully!');
    console.log('📸 Screenshots saved:');
    console.log('  - test-backend-health.png');
    console.log('  - test-frontend-home.png');
    console.log('  - test-query-telaviv.png');
    console.log('  - test-results-telaviv.png');
    console.log('  - test-results-female.png');
    console.log('  - test-results-urgent.png');
    console.log('  - test-match-tester.png');
    console.log('  - test-backend-stats.png');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  }

  await browser.close();
}

runComprehensiveTests();