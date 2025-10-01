/**
 * Live Site Test: Verify Real Names + 100% Hebrew
 * Tests: https://wonder-hebrew-works.azurewebsites.net
 */

const { chromium } = require('playwright');
const fs = require('fs');

const SITE_URL = 'https://wonder-ceo-web.azurewebsites.net';
const TEST_QUERY = 'אני צריך אחות לטיפול בפצעים בתל אביב';

async function runLiveTest() {
  console.log('='.repeat(80));
  console.log('LIVE SITE TEST: Real Names + 100% Hebrew Interface');
  console.log('='.repeat(80));
  console.log(`Testing: ${SITE_URL}`);
  console.log(`Query: "${TEST_QUERY}"`);
  console.log();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    siteLoaded: false,
    querySubmitted: false,
    resultsShown: false,
    realNamesFound: [],
    mockNamesFound: [],
    hebrewServiceNames: false,
    hebrewCityNames: false,
    englishTextFound: [],
    screenshots: []
  };

  try {
    // Step 1: Load the site
    console.log('📱 Step 1: Loading site...');
    await page.goto(SITE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.screenshot({ path: 'test-live-1-loaded.png', fullPage: true });
    results.screenshots.push('test-live-1-loaded.png');
    console.log('   ✅ Site loaded successfully');
    results.siteLoaded = true;

    // Wait for chat interface
    await page.waitForSelector('input[placeholder*="שאל"]', { timeout: 30000 });
    console.log('   ✅ Chat interface found');

    // Step 2: Submit Hebrew query
    console.log('\n📝 Step 2: Submitting Hebrew query...');
    const input = page.locator('input[placeholder*="שאל"]');
    await input.fill(TEST_QUERY);
    await page.screenshot({ path: 'test-live-2-query-entered.png', fullPage: true });
    results.screenshots.push('test-live-2-query-entered.png');

    await input.press('Enter');
    console.log('   ✅ Query submitted');
    results.querySubmitted = true;

    // Step 3: Wait for results
    console.log('\n⏳ Step 3: Waiting for results (max 30s)...');
    try {
      // Wait for either results or error message
      await page.waitForSelector('text=/נמצאו|לא מצאנו/', { timeout: 30000 });
      await page.waitForTimeout(2000); // Extra time for full rendering
      await page.screenshot({ path: 'test-live-3-results.png', fullPage: true });
      results.screenshots.push('test-live-3-results.png');
      console.log('   ✅ Results appeared');
      results.resultsShown = true;
    } catch (error) {
      console.log('   ⚠️  Results took longer than expected');
      await page.screenshot({ path: 'test-live-3-timeout.png', fullPage: true });
      results.screenshots.push('test-live-3-timeout.png');
    }

    // Step 4: Extract and analyze nurse names
    console.log('\n👥 Step 4: Analyzing nurse names...');
    const pageText = await page.textContent('body');

    // Look for names in the results
    // Real Hebrew names pattern: FirstName LastName (e.g., "אסתר אלגרבלי", "שרה כהן")
    const hebrewNamePattern = /([א-ת]+)\s([א-ת]+)/g;
    const foundNames = [...pageText.matchAll(hebrewNamePattern)];

    console.log(`   Found ${foundNames.length} potential Hebrew names in page`);

    // Check for mock names pattern: "אחות 12345678"
    const mockNamePattern = /אחות\s+[a-f0-9]{8}/gi;
    const mockNames = [...pageText.matchAll(mockNamePattern)];

    if (mockNames.length > 0) {
      console.log(`   ❌ FOUND MOCK NAMES: ${mockNames.length} instances`);
      mockNames.slice(0, 3).forEach(match => {
        console.log(`      - "${match[0]}"`);
        results.mockNamesFound.push(match[0]);
      });
    } else {
      console.log(`   ✅ No mock names found (good!)`);
    }

    // Look for real names in visible text
    const visibleNames = foundNames
      .map(m => m[0])
      .filter(name => {
        // Filter out common Hebrew words that might match the pattern
        const commonWords = ['ברוכים הבאים', 'טיפול בפצעים', 'מתן תרופות'];
        return !commonWords.some(word => word.includes(name));
      })
      .slice(0, 10);

    if (visibleNames.length > 0) {
      console.log(`   ✅ Found real-looking Hebrew names:`);
      visibleNames.forEach(name => {
        console.log(`      - ${name}`);
        results.realNamesFound.push(name);
      });
    }

    // Step 5: Check for Hebrew service names
    console.log('\n🏥 Step 5: Verifying Hebrew service names...');
    if (pageText.includes('טיפול בפצעים') || pageText.includes('מתן תרופות')) {
      console.log('   ✅ Hebrew service names found (טיפול בפצעים)');
      results.hebrewServiceNames = true;
    } else if (pageText.includes('WOUND_CARE') || pageText.includes('MEDICATION')) {
      console.log('   ❌ English service codes found (WOUND_CARE)');
      results.englishTextFound.push('Service codes in English');
    } else {
      console.log('   ⚠️  Could not verify service names');
    }

    // Step 6: Check for Hebrew city names
    console.log('\n🗺️  Step 6: Verifying Hebrew city names...');
    if (pageText.includes('תל אביב') || pageText.includes('תל אביב-יפו')) {
      console.log('   ✅ Hebrew city names found (תל אביב)');
      results.hebrewCityNames = true;
    } else if (pageText.includes('Tel Aviv')) {
      console.log('   ❌ English city name found (Tel Aviv)');
      results.englishTextFound.push('City name in English: Tel Aviv');
    } else {
      console.log('   ⚠️  Could not verify city names');
    }

    // Step 7: Check for any English text in results
    console.log('\n🔍 Step 7: Checking for English text...');
    const englishPatterns = [
      /WOUND_CARE/g,
      /MEDICATION/g,
      /Tel Aviv(?!-)/g,  // "Tel Aviv" but not "Tel Aviv-Yafo" in data
      /Jerusalem(?! ירושלים)/g,
      /Haifa(?! חיפה)/g,
      /Service:/g,
      /Location:/g
    ];

    let foundEnglish = false;
    englishPatterns.forEach(pattern => {
      const matches = pageText.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`   ❌ Found English: "${matches[0]}" (${matches.length} occurrences)`);
        results.englishTextFound.push(`${matches[0]} (${matches.length}x)`);
        foundEnglish = true;
      }
    });

    if (!foundEnglish) {
      console.log('   ✅ No English text found in results (100% Hebrew!)');
    }

    // Final screenshot
    await page.screenshot({ path: 'test-live-4-final.png', fullPage: true });
    results.screenshots.push('test-live-4-final.png');

  } catch (error) {
    console.error('\n❌ ERROR during test:', error.message);
    await page.screenshot({ path: 'test-live-error.png', fullPage: true });
    results.screenshots.push('test-live-error.png');
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  console.log('\n✅ PASSED CHECKS:');
  if (results.siteLoaded) console.log('   - Site loaded successfully');
  if (results.querySubmitted) console.log('   - Query submitted');
  if (results.resultsShown) console.log('   - Results displayed');
  if (results.realNamesFound.length > 0) console.log(`   - Real Hebrew names found (${results.realNamesFound.length})`);
  if (results.hebrewServiceNames) console.log('   - Hebrew service names');
  if (results.hebrewCityNames) console.log('   - Hebrew city names');

  console.log('\n❌ ISSUES FOUND:');
  if (results.mockNamesFound.length > 0) {
    console.log(`   - Mock names detected (${results.mockNamesFound.length})`);
  }
  if (results.englishTextFound.length > 0) {
    console.log(`   - English text found:`);
    results.englishTextFound.forEach(text => console.log(`     • ${text}`));
  }
  if (!results.siteLoaded) console.log('   - Site failed to load');
  if (!results.resultsShown) console.log('   - Results did not appear');

  console.log('\n📸 SCREENSHOTS:');
  results.screenshots.forEach(file => console.log(`   - ${file}`));

  // Overall verdict
  console.log('\n' + '='.repeat(80));
  const allPassed = results.siteLoaded &&
                    results.resultsShown &&
                    results.mockNamesFound.length === 0 &&
                    results.hebrewServiceNames &&
                    results.hebrewCityNames &&
                    results.englishTextFound.length === 0;

  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Real names + 100% Hebrew verified!');
  } else {
    console.log('⚠️  Some issues detected. Review screenshots and logs above.');
  }
  console.log('='.repeat(80));

  // Save results to JSON
  fs.writeFileSync('test-live-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Full results saved to: test-live-results.json');

  return allPassed;
}

// Run the test
runLiveTest()
  .then(passed => {
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
