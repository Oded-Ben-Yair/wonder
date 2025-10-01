const { chromium } = require('playwright');
const path = require('path');

async function captureEnglishStrings() {
  console.log('📸 Capturing English Strings with Visual Highlights\n');

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
    await page.waitForTimeout(15000);

    // Scroll to top to show search criteria
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    // Highlight English strings with red borders
    await page.evaluate(() => {
      // Find all text nodes containing "Wound care" or "Tel Aviv"
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const englishNodes = [];
      let node;

      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.includes('Wound care') || text.includes('Wound treatment') ||
            (text.includes('Tel Aviv') && !text.includes('תל'))) {
          englishNodes.push(node.parentElement);
        }
      }

      // Highlight parent elements
      englishNodes.forEach((el, index) => {
        if (el) {
          el.style.border = '3px solid red';
          el.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
          el.style.padding = '5px';

          // Add label
          const label = document.createElement('div');
          label.style.cssText = `
            position: absolute;
            background: red;
            color: white;
            padding: 5px 10px;
            font-weight: bold;
            z-index: 10000;
            font-size: 14px;
            margin-top: -25px;
          `;
          label.textContent = `❌ ENGLISH STRING ${index + 1}`;
          el.style.position = 'relative';
          el.insertBefore(label, el.firstChild);
        }
      });

      console.log(`Highlighted ${englishNodes.length} English elements`);
    });

    await page.waitForTimeout(2000);

    // Take screenshot showing highlighted English
    await page.screenshot({
      path: path.join(screenshotDir, 'english-strings-highlighted.png'),
      fullPage: true
    });

    console.log('✅ Screenshot saved: english-strings-highlighted.png');

    // Get the exact text
    const englishText = await page.evaluate(() => {
      const texts = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        if (text.includes('Wound care') || text.includes('Wound treatment')) {
          texts.push({ type: 'Service Name', text: text });
        }
        if (text.includes('Tel Aviv') && !text.includes('תל')) {
          texts.push({ type: 'City Name', text: text });
        }
      }

      return texts;
    });

    console.log('\n📋 English Strings Found:\n');
    englishText.forEach((item, index) => {
      console.log(`${index + 1}. [${item.type}]: "${item.text}"`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureEnglishStrings().catch(console.error);
