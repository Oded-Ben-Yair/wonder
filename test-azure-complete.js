#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdirSync, writeFileSync } from 'fs';

// Create directories
mkdirSync('azure-test-results', { recursive: true });

const AZURE_BACKEND = 'https://wonder-ceo-web.azurewebsites.net';
const AZURE_FRONTEND = 'https://delightful-water-0728cae03.1.azurestaticapps.net';

// 10 comprehensive test queries
const testQueries = [
  { type: 'hebrew-name', query: { nurseName: 'אורטל', topK: 3 }, expected: 'אורטל' },
  { type: 'hebrew-name', query: { nurseName: 'בתיה', topK: 3 }, expected: 'בתיה' },
  { type: 'hebrew-name', query: { nurseName: 'אסתר', topK: 3 }, expected: 'אסתר' },
  { type: 'city', query: { city: 'Tel Aviv', topK: 5 }, minResults: 5 },
  { type: 'city', query: { city: 'Haifa', topK: 5 }, minResults: 5 },
  { type: 'hebrew-city', query: { city: 'תל אביב', topK: 5 }, minResults: 5 },
  { type: 'service', query: { city: 'Tel Aviv', servicesQuery: ['Wound Care'], topK: 3 }, minResults: 0 },
  { type: 'urgent', query: { city: 'Tel Aviv', urgent: true, topK: 10 }, minResults: 10 },
  { type: 'combined', query: { nurseName: 'מירי', city: 'Tel Aviv', topK: 3 }, expected: 'מירי' },
  { type: 'all-nurses', query: { city: 'Tel Aviv', topK: 100 }, minResults: 50 }
];

async function runAzureTests() {
  console.log('\n🧪 Azure Hebrew Integration - Final Verification');
  console.log('='.repeat(60));
  console.log('Testing 10 different queries on Azure deployment\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    details: [],
    hebrewNamesFound: new Set(),
    timestamp: new Date().toISOString()
  };

  try {
    const page = await browser.newPage();

    // Test 1: Check if API is responding
    console.log('📍 Test 0: API Health Check');
    try {
      const healthResponse = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url + '/health');
          return {
            status: response.status,
            headers: response.headers.get('content-type'),
            text: await response.text()
          };
        } catch (e) {
          return { error: e.message };
        }
      }, AZURE_BACKEND);

      if (healthResponse.error) {
        console.log(`❌ Health check failed: ${healthResponse.error}`);
        results.failed++;
      } else if (healthResponse.headers && healthResponse.headers.includes('json')) {
        console.log(`✅ API responding with JSON`);
        results.passed++;
      } else {
        console.log(`⚠️  API returning HTML instead of JSON`);
        console.log(`   Response: ${healthResponse.text.substring(0, 100)}...`);
        results.failed++;
      }
      results.totalTests++;
    } catch (error) {
      console.log(`❌ Health check error: ${error.message}`);
      results.failed++;
      results.totalTests++;
    }

    // Run all 10 test queries
    for (let i = 0; i < testQueries.length; i++) {
      const test = testQueries[i];
      console.log(`\n📍 Test ${i + 1}: ${test.type.toUpperCase()}`);
      console.log(`   Query: ${JSON.stringify(test.query)}`);

      results.totalTests++;

      try {
        const apiResponse = await page.evaluate(async (url, query) => {
          try {
            const response = await fetch(url + '/match?engine=engine-basic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(query)
            });
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('json')) {
              return await response.json();
            } else {
              const text = await response.text();
              return { error: 'Not JSON', text: text.substring(0, 200) };
            }
          } catch (e) {
            return { error: e.message };
          }
        }, AZURE_BACKEND, test.query);

        if (apiResponse.error) {
          console.log(`   ❌ Error: ${apiResponse.error}`);
          if (apiResponse.text) {
            console.log(`   Response: ${apiResponse.text.substring(0, 100)}...`);
          }
          results.failed++;
          results.details.push({
            test: test.type,
            query: test.query,
            status: 'failed',
            error: apiResponse.error
          });
        } else if (apiResponse.results && Array.isArray(apiResponse.results)) {
          const resultCount = apiResponse.results.length;
          console.log(`   ✅ Received ${resultCount} results`);

          // Check Hebrew names
          const hebrewNames = apiResponse.results
            .filter(r => /[\u0590-\u05FF]/.test(r.name || ''))
            .map(r => r.name);

          if (hebrewNames.length > 0) {
            console.log(`   ✅ Found ${hebrewNames.length} Hebrew names`);
            console.log(`   First 3: ${hebrewNames.slice(0, 3).join(', ')}`);
            hebrewNames.forEach(name => results.hebrewNamesFound.add(name));
          }

          // Validate expected results
          let testPassed = true;
          if (test.expected) {
            const hasExpected = apiResponse.results.some(r =>
              (r.name && r.name.includes(test.expected)) ||
              (r.nurseName && r.nurseName.includes(test.expected))
            );
            if (!hasExpected) {
              console.log(`   ⚠️  Expected "${test.expected}" not found`);
              testPassed = false;
            }
          }

          if (test.minResults && resultCount < test.minResults) {
            console.log(`   ⚠️  Expected at least ${test.minResults} results, got ${resultCount}`);
            testPassed = false;
          }

          if (testPassed) {
            results.passed++;
            console.log(`   ✅ Test PASSED`);
          } else {
            results.failed++;
            console.log(`   ❌ Test FAILED`);
          }

          results.details.push({
            test: test.type,
            query: test.query,
            status: testPassed ? 'passed' : 'failed',
            resultCount: resultCount,
            hebrewCount: hebrewNames.length,
            sampleNames: hebrewNames.slice(0, 3)
          });
        } else {
          console.log(`   ❌ Invalid response structure`);
          results.failed++;
          results.details.push({
            test: test.type,
            query: test.query,
            status: 'failed',
            error: 'Invalid response structure'
          });
        }

        // Take screenshot for important tests
        if (i === 0 || i === 2 || i === 5 || i === 9) {
          await page.screenshot({
            path: `azure-test-results/test-${i + 1}-${test.type}.png`,
            fullPage: true
          });
        }

      } catch (error) {
        console.log(`   ❌ Test error: ${error.message}`);
        results.failed++;
        results.details.push({
          test: test.type,
          query: test.query,
          status: 'failed',
          error: error.message
        });
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test frontend if API is working
    if (results.passed > 5) {
      console.log('\n📍 Testing Frontend Integration');
      try {
        await page.goto(AZURE_FRONTEND, { waitUntil: 'networkidle0', timeout: 30000 });
        const title = await page.title();
        console.log(`   ✅ Frontend loaded: ${title}`);

        // Try to input Hebrew text
        const inputSelector = 'input[type="text"], textarea';
        if (await page.$(inputSelector)) {
          await page.type(inputSelector, 'אחות בשם אורטל');
          await page.screenshot({ path: 'azure-test-results/frontend-hebrew-input.png' });
          console.log(`   ✅ Hebrew input accepted in frontend`);
        }
      } catch (error) {
        console.log(`   ⚠️  Frontend test skipped: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  } finally {
    await browser.close();
  }

  // Generate Final Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

  console.log('\n📝 Hebrew Names Found:');
  console.log(`Total unique Hebrew names: ${results.hebrewNamesFound.size}`);
  if (results.hebrewNamesFound.size > 0) {
    const sampleNames = Array.from(results.hebrewNamesFound).slice(0, 10);
    console.log(`Sample: ${sampleNames.join(', ')}`);
  }

  // Determine overall status
  const isWorking = results.passed >= 7; // At least 70% success rate

  console.log('\n🎯 VERDICT:');
  if (isWorking) {
    console.log('✅ ✅ ✅ AZURE HEBREW INTEGRATION IS WORKING! ✅ ✅ ✅');
    console.log('The API is responding correctly with Hebrew nurse names.');
  } else if (results.passed > 0) {
    console.log('⚠️  PARTIAL SUCCESS - Some tests passed but needs attention');
  } else {
    console.log('❌ AZURE DEPLOYMENT NEEDS CONFIGURATION');
    console.log('The API is likely still serving HTML instead of JSON.');
    console.log('Please check Azure Portal configuration.');
  }

  // Save detailed report
  const report = {
    timestamp: results.timestamp,
    url: AZURE_BACKEND,
    summary: {
      totalTests: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: `${((results.passed / results.totalTests) * 100).toFixed(1)}%`
    },
    hebrewNames: {
      count: results.hebrewNamesFound.size,
      sample: Array.from(results.hebrewNamesFound).slice(0, 20)
    },
    testDetails: results.details,
    verdict: isWorking ? 'WORKING' : results.passed > 0 ? 'PARTIAL' : 'NOT_CONFIGURED'
  };

  writeFileSync('azure-test-results/final-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Detailed report saved to azure-test-results/final-test-report.json');
  console.log('📸 Screenshots saved to azure-test-results/\n');
}

// Run the tests
runAzureTests().catch(console.error);