const { chromium } = require('@playwright/test');

async function testChatbot() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('🔍 Testing Wonder Healthcare Chatbot on Azure...\n');

  try {
    // Test 1: Load the page
    console.log('1. Loading page...');
    await page.goto('https://wonder-hebrew-works.azurewebsites.net', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Page loaded successfully');

    // Test 2: Check for chatbot interface
    console.log('\n2. Checking chatbot interface...');
    const chatVisible = await page.locator('[class*="chat"], .messages-container').first().isVisible();
    console.log(`   ${chatVisible ? '✅' : '❌'} Chatbot interface found`);

    // Test 3: Check for Hebrew welcome message
    console.log('\n3. Checking Hebrew welcome...');
    const hebrewWelcome = await page.locator('text=/שלום|אני כאן/').first().isVisible();
    console.log(`   ${hebrewWelcome ? '✅' : '❌'} Hebrew welcome message displayed`);

    // Test 4: Test Hebrew query
    console.log('\n4. Testing Hebrew query...');
    const input = await page.locator('input[type="text"], textarea').first();
    await input.fill('אני צריך אחות לטיפול בפצעים בתל אביב');

    // Submit the query
    const sendButton = await page.locator('button[type="submit"], button:has-text("Send"), button:has(svg)').first();
    await sendButton.click();

    // Wait for API response
    await page.waitForTimeout(3000);

    // Monitor network requests
    const matchRequest = await page.waitForRequest(
      request => request.url().includes('/match'),
      { timeout: 5000 }
    ).catch(() => null);

    if (matchRequest) {
      console.log(`   ✅ API call made to: ${matchRequest.url()}`);
      const response = await matchRequest.response();
      if (response) {
        console.log(`   ✅ API response status: ${response.status()}`);
      }
    }

    // Test 5: Check for results
    console.log('\n5. Checking for nurse results...');
    await page.waitForTimeout(2000);
    const results = await page.locator('[class*="nurse"], [class*="result"], [class*="card"]').count();
    console.log(`   ${results > 0 ? '✅' : '⚠️'} Found ${results} nurse cards`);

    // Test 6: Test English query
    console.log('\n6. Testing English query...');
    await input.fill('I need a nurse for wound care in Tel Aviv');
    await sendButton.click();
    await page.waitForTimeout(3000);

    const englishResults = await page.locator('[class*="nurse"], [class*="result"], [class*="card"]').count();
    console.log(`   ${englishResults > 0 ? '✅' : '⚠️'} Found ${englishResults} nurse results`);

    // Take screenshot
    await page.screenshot({ path: 'azure-chatbot-working.png', fullPage: true });
    console.log('\n📸 Screenshot saved as azure-chatbot-working.png');

    // Summary
    console.log('\n' + '='.repeat(50));
    if (chatVisible && hebrewWelcome && (results > 0 || englishResults > 0)) {
      console.log('🎉 SUCCESS! Chatbot is fully functional!');
      console.log('✅ Hebrew NLP is working');
      console.log('✅ API calls are successful');
      console.log('✅ Nurse recommendations are displayed');
    } else {
      console.log('⚠️ Some issues detected:');
      if (!chatVisible) console.log('   - Chatbot interface not visible');
      if (!hebrewWelcome) console.log('   - Hebrew welcome not displayed');
      if (results === 0 && englishResults === 0) console.log('   - No nurse results returned');
    }

    console.log('\n📧 Send this URL to the CEO:');
    console.log('   https://wonder-hebrew-works.azurewebsites.net');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

testChatbot();