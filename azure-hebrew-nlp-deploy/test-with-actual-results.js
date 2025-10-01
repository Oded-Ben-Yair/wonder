const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testWithActualResults() {
  console.log('🔍 Testing With Actual Nurse Results\n');

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

    console.log('📝 Submitting query: "אני צריך אחות לטיפול בפצעים בתל אביב"');

    // Find and fill the input
    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill('אני צריך אחות לטיפול בפצעים בתל אביב');
    await page.waitForTimeout(1000);

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    console.log('⏳ Waiting for results to load (15 seconds)...');
    await page.waitForTimeout(15000); // Wait 15 seconds for full results

    // Take screenshot
    await page.screenshot({ path: path.join(screenshotDir, 'results-with-nurses.png'), fullPage: true });
    console.log('📸 Screenshot saved: results-with-nurses.png');

    // Check if nurse cards are visible
    const nurseCardCount = await page.locator('.nurse-card, [class*="NurseCard"], [class*="result"]').count();
    console.log(`\n🏥 Found ${nurseCardCount} nurse cards\n`);

    // Get all visible text
    const pageText = await page.evaluate(() => document.body.innerText);

    // Save full text
    fs.writeFileSync(
      path.join(screenshotDir, 'results-page-text.txt'),
      pageText
    );

    console.log('📄 Page Text Content:\n');
    console.log('='.repeat(80));
    console.log(pageText);
    console.log('='.repeat(80));

    // Check for specific English phrases that might appear in results
    const criticalEnglish = {
      'Found': 'Should be "נמצאו" or "נמצא"',
      'nurses': 'Should be "אחיות"',
      'Search criteria': 'Should be "קריטריוני חיפוש"',
      'Specializations': 'Should be "התמחויות"',
      'Locations': 'Should be "מיקומים"',
      'Active': 'Should be "פעילה"',
      'Approved': 'Should be "מאושרת"',
      'Wound Care': 'Should be "טיפול בפצעים"',
      'Book Top Match': 'Should be "קבע תור עם ההתאמה הטובה ביותר"',
      '5-Star Only': 'Should be "רק 5 כוכבים"',
      'Expand Area': 'Should be "הרחב אזור"',
      'Urgent Available': 'Should be "זמינה דחוף"',
      'Refine': 'Should be "חידוד"',
      'Why is this': 'Should be "למה זו"',
      'Expertise Match': 'Should be "התאמת מומחיות"',
      'Proximity': 'Should be "קרבה גיאוגרפית"',
      'Patient Reviews': 'Should be "ביקורות מטופלים"',
      'Availability': 'Should be "זמינות"',
      'Experience Level': 'Should be "רמת ניסיון"'
    };

    console.log('\n🔍 English String Detection:\n');
    const foundEnglish = [];

    for (const [english, hebrew] of Object.entries(criticalEnglish)) {
      const found = pageText.includes(english);
      if (found) {
        console.log(`❌ "${english}" found - ${hebrew}`);
        foundEnglish.push({ english, hebrew });
      } else {
        console.log(`✅ "${english}" not found (good!)`);
      }
    }

    console.log('\n' + '='.repeat(80));
    if (foundEnglish.length === 0) {
      console.log('✅ ✅ ✅  100% HEBREW - NO ENGLISH TEXT DETECTED  ✅ ✅ ✅');
    } else {
      console.log(`❌ ${foundEnglish.length} English strings detected:`);
      foundEnglish.forEach(({ english, hebrew }) => {
        console.log(`   • "${english}" → ${hebrew}`);
      });
    }
    console.log('='.repeat(80));

    // Check HTML for hidden English
    const html = await page.content();
    fs.writeFileSync(
      path.join(screenshotDir, 'results-page-html.html'),
      html
    );
    console.log('\n💾 Full HTML saved to: results-page-html.html');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-final.png'), fullPage: true });
  } finally {
    await browser.close();
  }
}

testWithActualResults().catch(console.error);
