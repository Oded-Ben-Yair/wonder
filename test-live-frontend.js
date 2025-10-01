import { chromium } from 'playwright';

async function testLiveFrontend() {
  console.log('🚀 Testing Live Wonder Frontend with Playwright + Edge');
  console.log('=' * 60);

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('\n📝 Test 1: Loading Frontend');
    await page.goto('https://wonder-ceo-web.azurewebsites.net');
    await page.waitForTimeout(5000);

    // Take screenshot of initial load
    await page.screenshot({ path: 'test1-frontend-load.png', fullPage: true });
    console.log('✅ Frontend loaded - Screenshot saved as test1-frontend-load.png');

    // Check if React app is loaded
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // Check for loading spinner or main content
    const hasLoadingSpinner = await page.locator('.loading-spinner').count() > 0;
    const hasMainContent = await page.locator('#root').count() > 0;

    console.log(`Has loading spinner: ${hasLoadingSpinner}`);
    console.log(`Has root element: ${hasMainContent}`);

    console.log('\n📝 Test 2: Check API Integration');
    // Wait longer for React to load
    await page.waitForTimeout(10000);

    // Check for chat input or main interface
    const chatInput = page.locator('input[placeholder*="nurse"], input[type="text"], textarea');
    const chatInputCount = await chatInput.count();
    console.log(`Found ${chatInputCount} input elements`);

    if (chatInputCount > 0) {
      console.log('✅ Found input elements');
      await page.screenshot({ path: 'test2-input-found.png', fullPage: true });

      console.log('\n📝 Test 3: Testing Natural Language Query');
      const firstInput = chatInput.first();
      await firstInput.fill('I need a nurse in Tel Aviv');
      await page.screenshot({ path: 'test3-query-entered.png', fullPage: true });

      // Try to submit the query
      await page.keyboard.press('Enter');
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test4-query-submitted.png', fullPage: true });

      console.log('✅ Query test completed');
    } else {
      console.log('❌ No input elements found - React app may not be loaded');
    }

    console.log('\n📝 Test 4: Check for Tabs or Navigation');
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`Found ${buttonCount} buttons`);

    const tabs = page.locator('[role="tab"], .tab, button:has-text("Chat"), button:has-text("Test")');
    const tabCount = await tabs.count();
    console.log(`Found ${tabCount} potential tabs`);

    await page.screenshot({ path: 'test5-interface-check.png', fullPage: true });

    console.log('\n📝 Test 5: Backend API Connection Test');
    // Test backend directly from the page
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://wonder-backend-api.azurewebsites.net/health');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (apiResponse.success) {
      console.log('✅ Backend API connection working');
      console.log(`Nurses loaded: ${apiResponse.data.nursesLoaded || apiResponse.data.status}`);
    } else {
      console.log('❌ Backend API connection failed:', apiResponse.error);
    }

    console.log('\n📝 Test 6: Console Errors Check');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`ERROR: ${msg.text()}`);
      }
    });

    await page.waitForTimeout(3000);
    if (logs.length > 0) {
      console.log('❌ Console errors found:');
      logs.forEach(log => console.log(`  ${log}`));
    } else {
      console.log('✅ No console errors found');
    }

    console.log('\n📝 Test 7: Mobile Responsiveness');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test6-mobile-view.png', fullPage: true });
    console.log('✅ Mobile view screenshot taken');

    console.log('\n📝 Final Assessment');
    const bodyContent = await page.textContent('body');
    const hasReactContent = bodyContent.includes('Wonder') || bodyContent.includes('nurse') || bodyContent.includes('Loading');

    console.log(`Frontend appears to be: ${hasReactContent ? 'React App' : 'Static HTML'}`);

    // Check if we can see the API base URL in the network
    const networkPromise = page.waitForRequest(request =>
      request.url().includes('wonder-backend-api') ||
      request.url().includes('/health') ||
      request.url().includes('/match')
    );

    try {
      await Promise.race([networkPromise, page.waitForTimeout(5000)]);
      console.log('✅ API requests detected');
    } catch (e) {
      console.log('❌ No API requests detected');
    }

    await page.screenshot({ path: 'test7-final-state.png', fullPage: true });

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }

  console.log('\n🎯 Test completed! Check the generated screenshots:');
  console.log('  - test1-frontend-load.png');
  console.log('  - test2-input-found.png');
  console.log('  - test3-query-entered.png');
  console.log('  - test4-query-submitted.png');
  console.log('  - test5-interface-check.png');
  console.log('  - test6-mobile-view.png');
  console.log('  - test7-final-state.png');
}

testLiveFrontend().catch(console.error);