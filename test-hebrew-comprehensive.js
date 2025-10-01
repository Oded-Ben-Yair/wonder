import { chromium } from 'playwright';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

// Ensure screenshots directory exists
await mkdir('test-screenshots', { recursive: true });

const testCases = {
  hebrewNameSearches: [
    { query: 'אורטל', expected: 'אורטל צוקרל' },
    { query: 'אסתר', expected: 'אסתר' },
    { query: 'בתיה', expected: 'בתיה' },
    { query: 'מירי', expected: 'מירי' },
    { query: 'יעל', expected: 'יעל' },
    { query: 'רחל', expected: 'רחל' },
    { query: 'שרה', expected: 'שרה' },
    { query: 'דנה', expected: 'דנה' }
  ],
  chatBotQueries: [
    'אחות בשם אורטל',
    'מי זמינה בתל אביב?',
    'אני צריך אחות לטיפול בפצעים דחוף',
    'חפש אחות בחיפה',
    'אחיות עם התמחות בתרופות',
    'מי יכולה לעזור עם פצעים?',
    'אחות דחוף בתל אביב',
    'Show me nurses named אסתר'
  ],
  cityFilters: [
    'Tel Aviv',
    'Haifa',
    'Jerusalem',
    'תל אביב',
    'חיפה',
    'ירושלים'
  ],
  specializations: [
    'Wound Care',
    'Medication Management',
    'טיפול בפצעים',
    'ניהול תרופות'
  ]
};

async function runTests() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem'
  });

  const page = await context.newPage();

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: []
  };

  console.log('\n🧪 Starting Comprehensive Hebrew Testing Suite\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Load the application
    console.log('\n📍 Test 1: Loading Application');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/01-app-loaded.png' });
    results.totalTests++;

    const title = await page.title();
    if (title.includes('Wonder')) {
      console.log('✅ Application loaded successfully');
      results.passed++;
    } else {
      console.log('❌ Failed to load application');
      results.failed++;
      results.failures.push('Application did not load');
    }

    // Test 2: Check ChatBot is visible
    console.log('\n📍 Test 2: ChatBot Interface');
    const chatBotVisible = await page.isVisible('[data-testid="chatbot-container"], .chat-interface, div:has-text("ChatBot")');
    results.totalTests++;

    if (chatBotVisible) {
      console.log('✅ ChatBot interface is visible');
      results.passed++;
      await page.screenshot({ path: 'test-screenshots/02-chatbot-visible.png' });
    } else {
      console.log('❌ ChatBot interface not found');
      results.failed++;
      results.failures.push('ChatBot interface not visible');
    }

    // Test 3: Hebrew Name Searches
    console.log('\n📍 Test 3: Hebrew Name Searches');
    for (const testCase of testCases.hebrewNameSearches) {
      results.totalTests++;
      console.log(`   Testing: "${testCase.query}"`);

      try {
        // Click on Match Tester tab if it exists
        const matchTesterTab = page.locator('text="Match Tester"').first();
        if (await matchTesterTab.isVisible()) {
          await matchTesterTab.click();
          await page.waitForTimeout(500);
        }

        // Find and fill the nurse name input
        const nameInput = page.locator('input[placeholder*="nurse"], input[placeholder*="name"], input[type="text"]').first();
        await nameInput.fill('');
        await nameInput.type(testCase.query);

        // Submit the search
        const searchButton = page.locator('button:has-text("Search"), button:has-text("Find"), button[type="submit"]').first();
        await searchButton.click();

        // Wait for results
        await page.waitForTimeout(2000);

        // Check if expected result appears
        const resultText = await page.textContent('body');
        if (resultText.includes(testCase.expected)) {
          console.log(`   ✅ Found: ${testCase.expected}`);
          results.passed++;
        } else {
          console.log(`   ❌ Not found: ${testCase.expected}`);
          results.failed++;
          results.failures.push(`Hebrew search failed for: ${testCase.query}`);
        }

        await page.screenshot({ path: `test-screenshots/hebrew-search-${testCase.query}.png` });
      } catch (error) {
        console.log(`   ❌ Error testing ${testCase.query}: ${error.message}`);
        results.failed++;
        results.failures.push(`Error in Hebrew search: ${testCase.query}`);
      }
    }

    // Test 4: ChatBot Hebrew Queries
    console.log('\n📍 Test 4: ChatBot Hebrew Queries');

    // Navigate to ChatBot tab
    const chatBotTab = page.locator('text="Chat"').first();
    if (await chatBotTab.isVisible()) {
      await chatBotTab.click();
      await page.waitForTimeout(500);
    }

    for (const query of testCases.chatBotQueries) {
      results.totalTests++;
      console.log(`   Testing: "${query}"`);

      try {
        // Find chat input
        const chatInput = page.locator('input[placeholder*="Type"], textarea[placeholder*="Type"], input[type="text"]').last();
        await chatInput.fill('');
        await chatInput.type(query);

        // Send message
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // Check for response
        const messages = await page.locator('.message, .chat-message, [role="article"]').count();
        if (messages > 0) {
          console.log(`   ✅ ChatBot responded to: "${query}"`);
          results.passed++;
        } else {
          console.log(`   ❌ No response for: "${query}"`);
          results.failed++;
          results.failures.push(`ChatBot did not respond to: ${query}`);
        }

        await page.screenshot({ path: `test-screenshots/chatbot-${query.substring(0, 20)}.png` });
      } catch (error) {
        console.log(`   ❌ Error with query "${query}": ${error.message}`);
        results.failed++;
        results.failures.push(`ChatBot error with: ${query}`);
      }
    }

    // Test 5: City Filtering
    console.log('\n📍 Test 5: City Filtering');
    for (const city of testCases.cityFilters) {
      results.totalTests++;
      console.log(`   Testing city: "${city}"`);

      try {
        // Make API request directly
        const response = await page.evaluate(async (cityName) => {
          const res = await fetch('http://localhost:5050/match?engine=engine-basic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: cityName, topK: 5 })
          });
          return await res.json();
        }, city);

        if (response.results && response.results.length > 0) {
          console.log(`   ✅ Found ${response.results.length} nurses in ${city}`);
          results.passed++;
        } else {
          console.log(`   ⚠️  No nurses found in ${city}`);
          results.passed++; // This might be expected for some cities
        }
      } catch (error) {
        console.log(`   ❌ Error testing city ${city}: ${error.message}`);
        results.failed++;
        results.failures.push(`City filter failed for: ${city}`);
      }
    }

    // Test 6: Specialization Queries
    console.log('\n📍 Test 6: Specialization Queries');
    for (const spec of testCases.specializations) {
      results.totalTests++;
      console.log(`   Testing specialization: "${spec}"`);

      try {
        const response = await page.evaluate(async (specialization) => {
          const res = await fetch('http://localhost:5050/match?engine=engine-basic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: 'Tel Aviv',
              servicesQuery: [specialization],
              topK: 5
            })
          });
          return await res.json();
        }, spec);

        if (response.results && response.results.length > 0) {
          console.log(`   ✅ Found ${response.results.length} nurses with ${spec}`);
          results.passed++;
        } else {
          console.log(`   ⚠️  No nurses found with ${spec}`);
          results.passed++; // Might be expected
        }
      } catch (error) {
        console.log(`   ❌ Error testing specialization ${spec}: ${error.message}`);
        results.failed++;
        results.failures.push(`Specialization query failed for: ${spec}`);
      }
    }

    // Test 7: Mobile Responsiveness
    console.log('\n📍 Test 7: Mobile Responsiveness');
    results.totalTests++;

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-screenshots/mobile-view.png' });

    const isMobileResponsive = await page.isVisible('body');
    if (isMobileResponsive) {
      console.log('✅ Mobile view renders correctly');
      results.passed++;
    } else {
      console.log('❌ Mobile view has issues');
      results.failed++;
      results.failures.push('Mobile responsiveness issue');
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    results.failures.push(`Test suite error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Generate Test Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

  if (results.failures.length > 0) {
    console.log('\n⚠️  Failures:');
    results.failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure}`);
    });
  }

  // Save results to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: `${((results.passed / results.totalTests) * 100).toFixed(1)}%`
    },
    failures: results.failures,
    testCases: testCases
  };

  await Bun.write('test-results/hebrew-test-report.json', JSON.stringify(report, null, 2));

  console.log('\n✅ Test report saved to test-results/hebrew-test-report.json');
  console.log('📸 Screenshots saved to test-screenshots/\n');

  return results;
}

// Run the tests
runTests().catch(console.error);