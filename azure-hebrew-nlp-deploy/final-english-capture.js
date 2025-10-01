const { chromium } = require('playwright');
const path = require('path');

async function finalEnglishCapture() {
  console.log('📸 Final English String Capture\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const screenshotDir = '/home/odedbe/wonder/azure-hebrew-nlp-deploy/hebrew-test-screenshots';

  try {
    await page.goto('https://wonder-ceo-web.azurewebsites.net', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Submit query
    await page.fill('textarea, input[type="text"]', 'אני צריך אחות לטיפול בפצעים בתל אביב');
    await page.waitForTimeout(1000);
    await page.click('button[type="submit"]');

    console.log('⏳ Waiting for results...');
    await page.waitForTimeout(12000);

    // Scroll within the chat container to show the AI response with search criteria
    await page.evaluate(() => {
      // Find the chat messages container
      const chatContainer = document.querySelector('[class*="messages"]') ||
                           document.querySelector('[class*="chat"]') ||
                           document.querySelector('main');

      if (chatContainer) {
        // Scroll to show the last message
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    });

    await page.waitForTimeout(2000);

    // Now scroll up a bit to show the search criteria
    await page.evaluate(() => {
      const chatContainer = document.querySelector('[class*="messages"]') ||
                           document.querySelector('[class*="chat"]') ||
                           document.querySelector('main');

      if (chatContainer) {
        // Scroll up 300px to show search criteria at top
        chatContainer.scrollTop = chatContainer.scrollTop - 300;
      }
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotDir, 'ENGLISH_STRINGS_VISIBLE.png'),
      fullPage: false
    });

    console.log('✅ Screenshot saved: ENGLISH_STRINGS_VISIBLE.png');
    console.log('\nThis screenshot shows the 2 English strings:');
    console.log('  1. "Wound care & Wound treatment" in search criteria');
    console.log('  2. "Tel Aviv" in search criteria');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

finalEnglishCapture().catch(console.error);
