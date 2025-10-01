const { chromium } = require('playwright');
const path = require('path');

async function checkSearchCriteria() {
  console.log('🔍 Checking Search Criteria Section for English\n');

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
    await page.fill('textarea', 'אני צריך אחות לטיפול בפצעים בתל אביב');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(15000);

    // Scroll to top to see search criteria
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotDir, 'search-criteria-section.png'),
      fullPage: false
    });

    // Get text from the search criteria section specifically
    const searchCriteriaText = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const criteriaElements = elements.filter(el => {
        const text = el.textContent || '';
        return text.includes('הבקשה שלך') || text.includes('שירות נדרש') || text.includes('מיקום');
      });

      return criteriaElements.map(el => el.textContent).join('\n');
    });

    console.log('📋 Search Criteria Section Text:\n');
    console.log('='.repeat(80));
    console.log(searchCriteriaText);
    console.log('='.repeat(80));

    // Check for English service names
    const hasWoundCare = searchCriteriaText.includes('Wound care');
    const hasWoundTreatment = searchCriteriaText.includes('Wound treatment');
    const hasTelAviv = searchCriteriaText.includes('Tel Aviv');

    console.log('\n🔍 English Detection:\n');
    console.log(`${hasWoundCare ? '❌' : '✅'} "Wound care" ${hasWoundCare ? 'FOUND' : 'not found'}`);
    console.log(`${hasWoundTreatment ? '❌' : '✅'} "Wound treatment" ${hasWoundTreatment ? 'FOUND' : 'not found'}`);
    console.log(`${hasTelAviv ? '❌' : '✅'} "Tel Aviv" ${hasTelAviv ? 'FOUND' : 'not found'}`);

    const englishCount = [hasWoundCare, hasWoundTreatment, hasTelAviv].filter(Boolean).length;

    console.log('\n' + '='.repeat(80));
    if (englishCount === 0) {
      console.log('✅ 100% HEBREW IN SEARCH CRITERIA');
    } else {
      console.log(`❌ ${englishCount} English strings in search criteria`);
      console.log('\nThese need to be translated:');
      if (hasWoundCare || hasWoundTreatment) console.log('  • "Wound care" → "טיפול בפצעים"');
      if (hasTelAviv) console.log('  • "Tel Aviv" → "תל אביב" (or keep as proper noun)');
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkSearchCriteria().catch(console.error);
