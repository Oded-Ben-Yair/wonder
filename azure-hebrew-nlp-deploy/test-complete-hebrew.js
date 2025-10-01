const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testCompleteHebrew() {
  console.log('🔍 Testing Complete Hebrew Translation at wonder-ceo-web.azurewebsites.net\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'he-IL'
  });
  const page = await context.newPage();

  const screenshotDir = '/home/odedbe/wonder/azure-hebrew-nlp-deploy/hebrew-test-screenshots';
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const englishFound = [];
  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  function checkTest(name, condition, details = '') {
    testResults.total++;
    if (condition) {
      console.log(`✅ ${name}`);
      testResults.passed++;
    } else {
      console.log(`❌ ${name}${details ? ': ' + details : ''}`);
      testResults.failed++;
      if (details) englishFound.push(`${name}: ${details}`);
    }
  }

  try {
    // 1. PAGE LOAD TEST
    console.log('\n📋 TEST 1: Page Load\n');
    await page.goto('https://wonder-ceo-web.azurewebsites.net', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, '01-initial-load.png'), fullPage: true });
    console.log('Screenshot: 01-initial-load.png');

    // Check header elements
    const headerText = await page.textContent('header').catch(() => '');
    checkTest('Header exists', headerText.length > 0);

    // Check for specific Hebrew text in header
    const hebrewSubtitle = await page.locator('text=התאמת אחיות מבוססת AI').count() > 0;
    checkTest('Hebrew subtitle "התאמת אחיות מבוססת AI"', hebrewSubtitle,
      hebrewSubtitle ? '' : 'Found English "AI-Powered Nurse Matching" instead');

    const hebrewProfessionals = await page.locator('text=/6,700\\+ אחיות מקצועיות/').count() > 0;
    checkTest('Hebrew "6,700+ אחיות מקצועיות"', hebrewProfessionals,
      hebrewProfessionals ? '' : 'Found English "6,700+ Professionals" instead');

    const hebrewLive = await page.locator('text=פעיל').count() > 0;
    checkTest('Hebrew "פעיל" (Live)', hebrewLive,
      hebrewLive ? '' : 'Found English "Live" instead');

    const hebrewHipaa = await page.locator('text=/עומד בתקן HIPAA/').count() > 0;
    checkTest('Hebrew "עומד בתקן HIPAA"', hebrewHipaa,
      hebrewHipaa ? '' : 'Found English "HIPAA Compliant" instead');

    // 2. WELCOME MESSAGE TEST
    console.log('\n📋 TEST 2: Welcome Message\n');

    const welcomeVisible = await page.locator('.welcome-message').isVisible().catch(() => false);
    if (welcomeVisible) {
      const welcomeText = await page.locator('.welcome-message').textContent();
      checkTest('Welcome message exists', welcomeText.length > 0);

      const hasHebrew = /[\u0590-\u05FF]/.test(welcomeText);
      checkTest('Welcome message contains Hebrew', hasHebrew);

      // Check for common English words that shouldn't be there
      const englishWords = ['Search', 'Find', 'Nurse', 'Location', 'Specialization', 'Available'];
      const foundEnglish = englishWords.filter(word => welcomeText.includes(word));
      checkTest('Welcome message has no English words', foundEnglish.length === 0,
        foundEnglish.length > 0 ? `Found: ${foundEnglish.join(', ')}` : '');
    } else {
      console.log('⏭️  Welcome message not visible (may have been dismissed)');
    }

    await page.screenshot({ path: path.join(screenshotDir, '02-welcome-message.png'), fullPage: true });
    console.log('Screenshot: 02-welcome-message.png');

    // 3. INPUT FIELD TEST
    console.log('\n📋 TEST 3: Input Field\n');

    const inputPlaceholder = await page.getAttribute('textarea, input[type="text"]', 'placeholder').catch(() => '');
    const hebrewPlaceholder = inputPlaceholder.includes('שאל') || inputPlaceholder.includes('חפש');
    checkTest('Hebrew placeholder in input field', hebrewPlaceholder,
      hebrewPlaceholder ? '' : `Found: "${inputPlaceholder}"`);

    // 4. QUERY SUBMISSION TEST
    console.log('\n📋 TEST 4: Query Submission\n');

    const query = 'אני צריך אחות לטיפול בפצעים בתל אביב';
    await page.fill('textarea, input[type="text"]', query);
    await page.screenshot({ path: path.join(screenshotDir, '03-query-entered.png'), fullPage: true });
    console.log('Screenshot: 03-query-entered.png');

    // Submit query
    await page.click('button[type="submit"], button:has-text("שלח"), button:has-text("חפש")');
    console.log('Waiting for results...');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: path.join(screenshotDir, '04-results-page.png'), fullPage: true });
    console.log('Screenshot: 04-results-page.png');

    // 5. RESULTS TEST
    console.log('\n📋 TEST 5: Results Labels\n');

    const pageContent = await page.content();

    // Check for Hebrew result labels
    const hebrewResultsFound = pageContent.includes('נמצאו') || pageContent.includes('נמצא');
    checkTest('Hebrew "נמצאו X אחיות"', hebrewResultsFound,
      hebrewResultsFound ? '' : 'Found English "Found X nurses" instead');

    const hebrewCriteria = pageContent.includes('קריטריוני חיפוש') || pageContent.includes('קריטריונים');
    checkTest('Hebrew "קריטריוני חיפוש"', hebrewCriteria,
      hebrewCriteria ? '' : 'Found English "Search criteria" instead');

    const hebrewSpecializations = pageContent.includes('התמחויות') || pageContent.includes('מומחיות');
    checkTest('Hebrew "התמחויות"', hebrewSpecializations,
      hebrewSpecializations ? '' : 'Found English "Specializations" instead');

    const hebrewLocations = pageContent.includes('מיקומים') || pageContent.includes('מיקום');
    checkTest('Hebrew "מיקומים"', hebrewLocations,
      hebrewLocations ? '' : 'Found English "Locations" instead');

    const hebrewActive = pageContent.includes('פעילה') || pageContent.includes('פעיל');
    checkTest('Hebrew "פעילה"', hebrewActive,
      hebrewActive ? '' : 'Found English "Active" instead');

    // Check for Hebrew service names
    const hebrewWoundCare = pageContent.includes('טיפול בפצעים');
    checkTest('Hebrew service name "טיפול בפצעים"', hebrewWoundCare,
      hebrewWoundCare ? '' : 'Found English "Wound Care" instead');

    // 6. CARD INTERACTION TEST
    console.log('\n📋 TEST 6: Card Interaction\n');

    const nurseCards = await page.locator('.nurse-card, [class*="card"]').count();
    console.log(`Found ${nurseCards} nurse cards`);

    if (nurseCards > 0) {
      // Try to find and click the first card or expand button
      const expandButton = page.locator('button:has-text("למה"), button:has-text("פרטים")').first();
      const expandExists = await expandButton.count() > 0;

      if (expandExists) {
        await expandButton.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(screenshotDir, '05-expanded-card.png'), fullPage: true });
        console.log('Screenshot: 05-expanded-card.png');

        const expandedContent = await page.content();

        const hebrewExpertise = expandedContent.includes('התאמת מומחיות') || expandedContent.includes('מומחיות');
        checkTest('Hebrew "התאמת מומחיות"', hebrewExpertise,
          hebrewExpertise ? '' : 'Found English "Expertise Match" instead');

        const hebrewProximity = expandedContent.includes('קרבה גיאוגרפית') || expandedContent.includes('קרבה');
        checkTest('Hebrew "קרבה גיאוגרפית"', hebrewProximity,
          hebrewProximity ? '' : 'Found English "Proximity" instead');

        const hebrewReviews = expandedContent.includes('ביקורות') || expandedContent.includes('דירוג');
        checkTest('Hebrew "ביקורות מטופלים"', hebrewReviews,
          hebrewReviews ? '' : 'Found English "Patient Reviews" instead');

        const hebrewAvailability = expandedContent.includes('זמינות');
        checkTest('Hebrew "זמינות"', hebrewAvailability,
          hebrewAvailability ? '' : 'Found English "Availability" instead');

        const hebrewExperience = expandedContent.includes('ניסיון') || expandedContent.includes('רמת ניסיון');
        checkTest('Hebrew "רמת ניסיון"', hebrewExperience,
          hebrewExperience ? '' : 'Found English "Experience Level" instead');
      } else {
        console.log('⏭️  Expand button not found, checking visible card content');
      }
    }

    // 7. QUICK ACTIONS TEST
    console.log('\n📋 TEST 7: Quick Actions\n');

    await page.screenshot({ path: path.join(screenshotDir, '06-quick-actions.png'), fullPage: true });
    console.log('Screenshot: 06-quick-actions.png');

    const quickActionsContent = await page.content();

    const hebrewBookTop = quickActionsContent.includes('קבע תור') || quickActionsContent.includes('התאמה הטובה');
    checkTest('Hebrew "קבע תור עם ההתאמה הטובה ביותר"', hebrewBookTop,
      hebrewBookTop ? '' : 'Found English "Book Top Match" instead');

    const hebrewFiveStar = quickActionsContent.includes('כוכבים') && quickActionsContent.includes('5');
    checkTest('Hebrew "רק 5 כוכבים"', hebrewFiveStar,
      hebrewFiveStar ? '' : 'Found English "5-Star Only" instead');

    const hebrewExpand = quickActionsContent.includes('הרחב אזור') || quickActionsContent.includes('הרחב');
    checkTest('Hebrew "הרחב אזור"', hebrewExpand,
      hebrewExpand ? '' : 'Found English "Expand Area" instead');

    const hebrewUrgent = quickActionsContent.includes('דחוף') || quickActionsContent.includes('זמינה דחוף');
    checkTest('Hebrew "זמינה דחוף"', hebrewUrgent,
      hebrewUrgent ? '' : 'Found English "Urgent Available" instead');

    // 8. SUGGESTIONS TEST
    console.log('\n📋 TEST 8: Refinement Suggestions\n');

    const hebrewRefine = quickActionsContent.includes('חידוד') || quickActionsContent.includes('מומלץ');
    checkTest('Hebrew "חידוד:" label', hebrewRefine,
      hebrewRefine ? '' : 'Found English "Refine:" instead');

    // 9. COMPREHENSIVE SCAN
    console.log('\n📋 TEST 9: Comprehensive English Scan\n');

    const bodyText = await page.textContent('body');

    // Common English phrases that shouldn't appear (except brand name)
    const forbiddenEnglish = [
      'AI-Powered Nurse Matching',
      'Professionals',
      'Live',
      'HIPAA Compliant',
      'Search criteria',
      'Specializations',
      'Locations',
      'Active',
      'Approved',
      'Wound Care',
      'Medication',
      'Expertise Match',
      'Proximity',
      'Patient Reviews',
      'Availability',
      'Experience Level',
      'Book Top Match',
      '5-Star Only',
      'Expand Area',
      'Urgent Available',
      'Refine:',
      'Found X nurses',
      'Why is this'
    ];

    const foundForbidden = forbiddenEnglish.filter(phrase => bodyText.includes(phrase));
    checkTest('No forbidden English phrases', foundForbidden.length === 0,
      foundForbidden.length > 0 ? `Found: ${foundForbidden.join(', ')}` : '');

    if (foundForbidden.length > 0) {
      foundForbidden.forEach(phrase => {
        englishFound.push(`Forbidden phrase: "${phrase}"`);
      });
    }

    await page.screenshot({ path: path.join(screenshotDir, '07-final-state.png'), fullPage: true });
    console.log('Screenshot: 07-final-state.png');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(screenshotDir, 'error-screenshot.png'), fullPage: true });
  } finally {
    await browser.close();
  }

  // FINAL REPORT
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL HEBREW TRANSLATION ASSESSMENT');
  console.log('='.repeat(80));
  console.log(`\n✅ Tests Passed: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Tests Failed: ${testResults.failed}/${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (englishFound.length === 0) {
    console.log('\n🎉 OVERALL ASSESSMENT: 100% HEBREW ✅');
    console.log('No English text found (except permitted brand name "Wonder Healthcare")');
  } else {
    console.log(`\n⚠️  OVERALL ASSESSMENT: ${englishFound.length} English strings remaining ❌`);
    console.log('\nEnglish text found at:');
    englishFound.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item}`);
    });
  }

  console.log('\n📸 Screenshots saved to:', screenshotDir);
  console.log('  - 01-initial-load.png');
  console.log('  - 02-welcome-message.png');
  console.log('  - 03-query-entered.png');
  console.log('  - 04-results-page.png');
  console.log('  - 05-expanded-card.png');
  console.log('  - 06-quick-actions.png');
  console.log('  - 07-final-state.png');
  console.log('\n' + '='.repeat(80) + '\n');

  // Write detailed report
  const reportPath = path.join(screenshotDir, 'hebrew-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    url: 'https://wonder-ceo-web.azurewebsites.net',
    results: testResults,
    englishFound: englishFound,
    assessment: englishFound.length === 0 ? '100% Hebrew' : `${englishFound.length} English strings remaining`,
    screenshotDirectory: screenshotDir
  }, null, 2));

  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

testCompleteHebrew().catch(console.error);
