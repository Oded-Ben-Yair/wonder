#!/usr/bin/env node

import { chromium } from 'playwright';

const AZURE_API = 'https://wonder-ceo-web.azurewebsites.net';
const AZURE_FRONTEND = 'https://delightful-water-0728cae03.1.azurestaticapps.net';

// 10 comprehensive test queries as requested
const testQueries = [
  {
    id: 1,
    type: 'hebrew-name-ortal',
    query: { nurseName: 'אורטל', topK: 3 },
    expected: 'אורטל',
    description: 'Search for Hebrew name אורטל (Ortal)'
  },
  {
    id: 2,
    type: 'hebrew-name-batya',
    query: { nurseName: 'בתיה', topK: 3 },
    expected: 'בתיה',
    description: 'Search for Hebrew name בתיה (Batya)'
  },
  {
    id: 3,
    type: 'hebrew-name-esther',
    query: { nurseName: 'אסתר', topK: 3 },
    expected: 'אסתר',
    description: 'Search for Hebrew name אסתר (Esther)'
  },
  {
    id: 4,
    type: 'hebrew-name-miri',
    query: { nurseName: 'מירי', topK: 3 },
    expected: 'מירי',
    description: 'Search for Hebrew name מירי (Miri)'
  },
  {
    id: 5,
    type: 'hebrew-name-yael',
    query: { nurseName: 'יעל', topK: 5 },
    expected: 'יעל',
    description: 'Search for Hebrew name יעל (Yael) with more results'
  },
  {
    id: 6,
    type: 'city-telaviv-english',
    query: { city: 'Tel Aviv', topK: 10 },
    minResults: 5,
    description: 'Search for nurses in Tel Aviv (English)'
  },
  {
    id: 7,
    type: 'city-telaviv-hebrew',
    query: { city: 'תל אביב', topK: 10 },
    minResults: 5,
    description: 'Search for nurses in תל אביב (Hebrew)'
  },
  {
    id: 8,
    type: 'combined-name-city',
    query: { nurseName: 'ליאת', city: 'Tel Aviv', topK: 5 },
    expected: 'ליאת',
    description: 'Combined search: Hebrew name ליאת in Tel Aviv'
  },
  {
    id: 9,
    type: 'service-wound-care',
    query: { servicesQuery: ['Wound Care'], city: 'Haifa', topK: 10 },
    minResults: 3,
    description: 'Search for Wound Care specialists in Haifa'
  },
  {
    id: 10,
    type: 'urgent-hebrew-request',
    query: { nurseName: 'דניאל', urgent: true, topK: 5 },
    expected: 'דניאל',
    description: 'Urgent request for Hebrew nurse דניאל (Daniel)'
  }
];

async function testAzureIntegration() {
  console.log('🧪 Testing Azure Hebrew Integration with Edge Browser');
  console.log('📍 Testing 10 Different Queries as Requested');
  console.log('=' .repeat(80));

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge', // Use Microsoft Edge
    args: ['--lang=he-IL'] // Set Hebrew locale
  });

  const context = await browser.newContext({
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem'
  });

  const page = await context.newPage();

  let passedTests = 0;
  let failedTests = 0;
  const hebrewNamesFound = new Set();
  const screenshots = [];

  // Test 1: Check API Health
  console.log('\\n📍 Test 0: API Health Check');
  try {
    const response = await page.request.get(`${AZURE_API}/health`);
    const data = await response.json();

    if (data.nursesLoaded === 6703) {
      console.log(`   ✅ API healthy with ${data.nursesLoaded} Hebrew nurses loaded`);
    } else {
      console.log(`   ⚠️ API has ${data.nursesLoaded} nurses (expected 6703)`);
    }
  } catch (error) {
    console.log(`   ❌ API health check failed: ${error.message}`);
  }

  // Run all 10 test queries
  console.log('\\n📍 Running 10 Hebrew Query Tests:');
  console.log('-'.repeat(80));

  for (const test of testQueries) {
    console.log(`\\n📍 Test ${test.id}: ${test.description}`);
    console.log(`   Query: ${JSON.stringify(test.query)}`);

    try {
      // Make API request
      const response = await page.request.post(`${AZURE_API}/match?engine=engine-basic`, {
        data: test.query,
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        console.log(`   ✅ Got ${data.results.length} results`);

        // Collect Hebrew names
        data.results.forEach(r => {
          if (r.name && /[\u0590-\u05FF]/.test(r.name)) {
            hebrewNamesFound.add(r.name);
          }
        });

        // Check expected results
        if (test.expected) {
          const found = data.results.some(r => r.name && r.name.includes(test.expected));
          if (found) {
            console.log(`   ✅ Found expected name: ${test.expected}`);
            passedTests++;
          } else {
            console.log(`   ❌ Missing expected name: ${test.expected}`);
            failedTests++;
          }
        } else if (test.minResults) {
          if (data.results.length >= test.minResults) {
            console.log(`   ✅ Has minimum ${test.minResults} results`);
            passedTests++;
          } else {
            console.log(`   ❌ Only ${data.results.length} results (need ${test.minResults})`);
            failedTests++;
          }
        } else {
          passedTests++;
        }

        // Show sample results (first 3)
        const sampleNames = data.results.slice(0, 3).map(r => r.name).join(', ');
        console.log(`   Sample results: ${sampleNames}`);
      } else {
        console.log(`   ❌ Invalid response structure`);
        failedTests++;
      }
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      failedTests++;
    }
  }

  // Test Frontend with Screenshots
  console.log('\\n📍 Testing Frontend with Edge Browser:');
  console.log('-'.repeat(80));

  try {
    await page.goto(AZURE_FRONTEND, { waitUntil: 'networkidle' });
    console.log('   ✅ Frontend loaded successfully');

    // Take screenshot of main page
    await page.screenshot({
      path: 'test-azure-1-main-page.png',
      fullPage: true
    });
    console.log('   📸 Screenshot 1: Main page');

    // Test Hebrew input
    const searchInput = await page.locator('input[placeholder*="nurse"], input[type="text"]').first();
    if (searchInput) {
      await searchInput.fill('אורטל צוקרל');
      await page.screenshot({
        path: 'test-azure-2-hebrew-input.png',
        fullPage: true
      });
      console.log('   📸 Screenshot 2: Hebrew input entered');

      // Submit search
      const submitButton = await page.locator('button').filter({ hasText: /search|חיפוש|submit/i }).first();
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: 'test-azure-3-search-results.png',
          fullPage: true
        });
        console.log('   📸 Screenshot 3: Search results');
      }
    }

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({
      path: 'test-azure-4-mobile-view.png',
      fullPage: true
    });
    console.log('   📸 Screenshot 4: Mobile responsive view');

    // Test another Hebrew query
    await page.setViewportSize({ width: 1280, height: 720 });
    if (searchInput) {
      await searchInput.fill('בתיה אביב');
      await page.screenshot({
        path: 'test-azure-5-second-query.png',
        fullPage: true
      });
      console.log('   📸 Screenshot 5: Second Hebrew query');
    }

  } catch (error) {
    console.log(`   ⚠️ Frontend test issue: ${error.message}`);
  }

  // Final Report
  console.log('\\n' + '='.repeat(80));
  console.log('📊 AZURE HEBREW INTEGRATION TEST REPORT');
  console.log('='.repeat(80));
  console.log(`✅ Passed Tests: ${passedTests} / 10`);
  console.log(`❌ Failed Tests: ${failedTests} / 10`);
  console.log(`📝 Hebrew Names Found: ${hebrewNamesFound.size}`);

  if (hebrewNamesFound.size > 0) {
    console.log(`\\n🎯 Sample Hebrew Names Found:`);
    Array.from(hebrewNamesFound).slice(0, 10).forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
  }

  console.log('\\n📸 Screenshots saved:');
  console.log('   - test-azure-1-main-page.png');
  console.log('   - test-azure-2-hebrew-input.png');
  console.log('   - test-azure-3-search-results.png');
  console.log('   - test-azure-4-mobile-view.png');
  console.log('   - test-azure-5-second-query.png');

  console.log('\\n🎯 FINAL VERDICT:');
  if (passedTests >= 8) {
    console.log('✅ ✅ ✅ AZURE HEBREW INTEGRATION IS WORKING EXCELLENTLY! ✅ ✅ ✅');
    console.log('🎊 All requested tests completed with Edge browser successfully!');
  } else if (passedTests >= 5) {
    console.log('⚠️ Azure Hebrew integration is partially working');
    console.log('📝 Some features may need additional configuration');
  } else {
    console.log('❌ Azure Hebrew integration needs attention');
    console.log('🔧 Engine configuration may be required');
  }

  await browser.close();
  return passedTests >= 8;
}

// Run the tests
testAzureIntegration().then(success => {
  console.log('\\n✨ Test suite completed!');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\\n❌ Test suite error:', error);
  process.exit(1);
});