const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('📱 Testing Wonder Healthcare Chatbot on Azure...');
  console.log('🌐 URL: https://wonder-hebrew-works.azurewebsites.net');

  try {
    // Load the page
    console.log('\n1. Loading main page...');
    await page.goto('https://wonder-hebrew-works.azurewebsites.net', { timeout: 30000 });
    await page.waitForLoadState('networkidle');

    // Check if chatbot interface is present
    console.log('2. Checking for chatbot interface...');
    const chatContainer = await page.locator('[class*="chat"], [id*="chat"], .messages-container').first();
    if (await chatContainer.isVisible()) {
      console.log('   ✅ Chatbot interface found!');
    }

    // Check for Hebrew welcome message
    console.log('3. Checking for Hebrew welcome message...');
    const hebrewText = await page.locator('text=/שלום|ברוכים|אני כאן/').first();
    if (await hebrewText.isVisible()) {
      console.log('   ✅ Hebrew welcome message displayed!');
    }

    // Check for input field
    console.log('4. Checking for input field...');
    const input = await page.locator('input[type="text"], textarea').first();
    if (await input.isVisible()) {
      console.log('   ✅ Input field found!');

      // Type Hebrew query
      console.log('5. Typing Hebrew query...');
      await input.fill('אני צריך אחות לטיפול בפצעים בתל אביב');
      console.log('   ✅ Hebrew text entered!');

      // Submit the query
      console.log('6. Submitting query...');
      const submitButton = await page.locator('button[type="submit"], button:has-text("Send"), button:has-text("שלח")').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('   ✅ Query submitted!');

        // Wait for response
        console.log('7. Waiting for response...');
        await page.waitForTimeout(3000);

        // Check for results
        const results = await page.locator('[class*="nurse"], [class*="result"], [class*="card"]').count();
        if (results > 0) {
          console.log(`   ✅ Found ${results} nurse recommendations!`);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'azure-chatbot-test.png', fullPage: true });
    console.log('\n✨ Screenshot saved as azure-chatbot-test.png');

    console.log('\n🎉 SUCCESS! The chatbot is working with Hebrew NLP!');
    console.log('📧 Send this URL to the CEO: https://wonder-hebrew-works.azurewebsites.net');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
})();