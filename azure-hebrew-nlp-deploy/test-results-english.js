const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testResultsPage() {
  console.log('🔍 Testing Results Page for English Text\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'he-IL'
  });
  const page = await context.newPage();

  const screenshotDir = '/home/odedbe/wonder/azure-hebrew-nlp-deploy/hebrew-test-screenshots';

  try {
    await page.goto('https://wonder-ceo-web.azurewebsites.net', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Submit query
    const query = 'אני צריך אחות לטיפול בפצעים בתל אביב';
    await page.fill('textarea, input[type="text"]', query);
    await page.click('button[type="submit"], button:has-text("שלח"), button:has-text("חפש")');

    console.log('Waiting for results...');
    await page.waitForTimeout(8000); // Wait longer for results to fully render

    await page.screenshot({ path: path.join(screenshotDir, 'results-detailed.png'), fullPage: true });

    // Get all text content from the page
    const pageText = await page.evaluate(() => document.body.innerText);

    console.log('\n📝 Full Page Text Content:\n');
    console.log('='.repeat(80));
    console.log(pageText);
    console.log('='.repeat(80));

    // Search for specific English strings
    const englishStrings = [
      'Found',
      'Search criteria',
      'Specializations',
      'Locations',
      'Active',
      'Approved',
      'Wound Care',
      'Book Top Match',
      '5-Star Only',
      'Expand Area',
      'Urgent Available',
      'Refine',
      'Why is this',
      'Expertise Match',
      'Proximity',
      'Patient Reviews',
      'Availability',
      'Experience Level'
    ];

    console.log('\n🔍 Searching for English strings:\n');
    const foundEnglish = [];

    for (const str of englishStrings) {
      if (pageText.includes(str)) {
        console.log(`❌ Found: "${str}"`);
        foundEnglish.push(str);

        // Try to find the context
        const lines = pageText.split('\n');
        for (const line of lines) {
          if (line.includes(str)) {
            console.log(`   Context: ${line.trim().substring(0, 100)}...`);
            break;
          }
        }
      } else {
        console.log(`✅ Not found: "${str}"`);
      }
    }

    console.log('\n' + '='.repeat(80));
    if (foundEnglish.length === 0) {
      console.log('🎉 NO ENGLISH TEXT FOUND - 100% HEBREW!');
    } else {
      console.log(`⚠️  Found ${foundEnglish.length} English strings:`);
      foundEnglish.forEach(str => console.log(`   - ${str}`));
    }
    console.log('='.repeat(80) + '\n');

    // Save text to file for inspection
    fs.writeFileSync(
      path.join(screenshotDir, 'page-text-content.txt'),
      pageText
    );
    console.log('💾 Full page text saved to: page-text-content.txt\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-results.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testResultsPage().catch(console.error);
