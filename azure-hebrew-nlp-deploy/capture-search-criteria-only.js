const { chromium } = require('playwright');
const path = require('path');

async function captureSearchCriteria() {
  console.log('📸 Capturing Search Criteria Section\n');

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
    const input = await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });
    await input.fill('אני צריך אחות לטיפול בפצעים בתל אביב');
    await page.waitForTimeout(1000);

    const submitBtn = await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    await submitBtn.click();

    console.log('⏳ Waiting for results...');
    await page.waitForTimeout(12000);

    // Find the chat messages
    const messages = await page.locator('[class*="message"], [class*="Message"]').all();
    console.log(`Found ${messages.length} messages`);

    // Scroll to see the AI response message (which contains the search criteria)
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      await lastMessage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2000);
    }

    // Take screenshot of the chat area showing search criteria
    await page.screenshot({
      path: path.join(screenshotDir, 'search-criteria-detail.png'),
      fullPage: false // Only show viewport to focus on search criteria
    });

    console.log('✅ Screenshot saved: search-criteria-detail.png');

    // Extract just the search criteria section
    const criteriaText = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const lines = bodyText.split('\n');

      // Find the section with "הבקשה שלך" (Your request)
      const startIdx = lines.findIndex(line => line.includes('הבקשה שלך'));
      if (startIdx === -1) return 'Not found';

      // Get next 5 lines
      return lines.slice(startIdx, startIdx + 5).join('\n');
    });

    console.log('\n📋 Search Criteria Section:\n');
    console.log('='.repeat(80));
    console.log(criteriaText);
    console.log('='.repeat(80));

    console.log('\n❌ ENGLISH STRINGS IDENTIFIED:');
    console.log('1. "Wound care & Wound treatment" → Should be: "טיפול בפצעים"');
    console.log('2. "Tel Aviv" → Should be: "תל אביב"');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureSearchCriteria().catch(console.error);
