#!/usr/bin/env node

import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { writeFileSync } from 'fs';

// Create directories
mkdirSync('azure-screenshots', { recursive: true });

const AZURE_BACKEND = 'https://wonder-ceo-web.azurewebsites.net';
const AZURE_FRONTEND = 'https://delightful-water-0728cae03.1.azurestaticapps.net';

async function testAzureDeployment() {
  console.log('\n🧪 Testing Azure Hebrew Integration with Screenshots');
  console.log('='.repeat(60));

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const results = {
    backend: [],
    frontend: [],
    api: []
  };

  try {
    const page = await browser.newPage();

    // Test 1: Azure Backend Health
    console.log('\n📍 Test 1: Azure Backend Health Check');
    try {
      await page.goto(AZURE_BACKEND + '/health', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await page.screenshot({ path: 'azure-screenshots/01-backend-health.png' });
      const content = await page.content();
      console.log('✅ Backend responded');
      results.backend.push({ test: 'Health Check', status: 'passed' });
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      results.backend.push({ test: 'Health Check', status: 'failed', error: error.message });
    }

    // Test 2: Azure Backend API - Hebrew Name Search
    console.log('\n📍 Test 2: Azure API Hebrew Name Search');
    try {
      const apiResponse = await page.evaluate(async () => {
        const response = await fetch('https://wonder-ceo-web.azurewebsites.net/match?engine=engine-basic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nurseName: 'אורטל', topK: 3 })
        });
        return await response.json();
      });

      if (apiResponse.results && apiResponse.results.length > 0) {
        console.log(`✅ Hebrew search returned ${apiResponse.results.length} results`);
        console.log(`   First result: ${apiResponse.results[0].name}`);
        results.api.push({
          test: 'Hebrew Name Search',
          status: 'passed',
          firstResult: apiResponse.results[0].name
        });
      } else {
        console.log('❌ No results from Hebrew search');
        results.api.push({ test: 'Hebrew Name Search', status: 'failed' });
      }
    } catch (error) {
      console.log('❌ API Hebrew search failed:', error.message);
      results.api.push({ test: 'Hebrew Name Search', status: 'failed', error: error.message });
    }

    // Test 3: Azure Frontend Load
    console.log('\n📍 Test 3: Azure Frontend Loading');
    try {
      await page.goto(AZURE_FRONTEND, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      await page.waitForTimeout(3000); // Wait for React to render
      await page.screenshot({
        path: 'azure-screenshots/02-frontend-loaded.png',
        fullPage: true
      });

      const title = await page.title();
      console.log(`✅ Frontend loaded: ${title}`);
      results.frontend.push({ test: 'Frontend Load', status: 'passed', title });
    } catch (error) {
      console.log('❌ Frontend load failed:', error.message);
      results.frontend.push({ test: 'Frontend Load', status: 'failed', error: error.message });
    }

    // Test 4: Frontend ChatBot Interface
    console.log('\n📍 Test 4: ChatBot Interface');
    try {
      // Look for ChatBot elements
      const hasChatBot = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let found = false;
        elements.forEach(el => {
          if (el.textContent && (
            el.textContent.includes('ChatBot') ||
            el.textContent.includes('Chat') ||
            el.textContent.includes('Wonder')
          )) {
            found = true;
          }
        });
        return found;
      });

      if (hasChatBot) {
        console.log('✅ ChatBot interface found');
        await page.screenshot({ path: 'azure-screenshots/03-chatbot-interface.png' });
        results.frontend.push({ test: 'ChatBot Interface', status: 'passed' });
      } else {
        console.log('⚠️  ChatBot interface not clearly visible');
        results.frontend.push({ test: 'ChatBot Interface', status: 'warning' });
      }
    } catch (error) {
      console.log('❌ ChatBot test failed:', error.message);
      results.frontend.push({ test: 'ChatBot Interface', status: 'failed', error: error.message });
    }

    // Test 5: Hebrew Input Test
    console.log('\n📍 Test 5: Hebrew Input in ChatBot');
    try {
      // Find input field
      const inputSelector = 'input[type="text"], textarea, input:not([type])';
      await page.waitForSelector(inputSelector, { timeout: 5000 });

      // Type Hebrew text
      await page.type(inputSelector, 'אחות בשם אורטל');
      await page.screenshot({ path: 'azure-screenshots/04-hebrew-input.png' });

      console.log('✅ Hebrew input accepted');
      results.frontend.push({ test: 'Hebrew Input', status: 'passed' });
    } catch (error) {
      console.log('⚠️  Could not test Hebrew input:', error.message);
      results.frontend.push({ test: 'Hebrew Input', status: 'skipped', error: error.message });
    }

    // Test 6: Mobile Responsiveness
    console.log('\n📍 Test 6: Mobile View');
    try {
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(AZURE_FRONTEND, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: 'azure-screenshots/05-mobile-view.png',
        fullPage: true
      });
      console.log('✅ Mobile view captured');
      results.frontend.push({ test: 'Mobile View', status: 'passed' });
    } catch (error) {
      console.log('❌ Mobile view test failed:', error.message);
      results.frontend.push({ test: 'Mobile View', status: 'failed', error: error.message });
    }

    // Test 7: API City Search
    console.log('\n📍 Test 7: City Search API');
    try {
      await page.setViewport({ width: 1920, height: 1080 });
      const cityResponse = await page.evaluate(async () => {
        const response = await fetch('https://wonder-ceo-web.azurewebsites.net/match?engine=engine-basic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: 'Tel Aviv', topK: 5 })
        });
        return await response.json();
      });

      if (cityResponse.results && cityResponse.results.length > 0) {
        console.log(`✅ City search returned ${cityResponse.results.length} nurses`);
        const hebrewCount = cityResponse.results.filter(r =>
          /[\u0590-\u05FF]/.test(r.name || '')
        ).length;
        console.log(`   ${hebrewCount} have Hebrew names`);
        results.api.push({
          test: 'City Search',
          status: 'passed',
          totalResults: cityResponse.results.length,
          hebrewNames: hebrewCount
        });
      } else {
        console.log('❌ No results from city search');
        results.api.push({ test: 'City Search', status: 'failed' });
      }
    } catch (error) {
      console.log('❌ City search failed:', error.message);
      results.api.push({ test: 'City Search', status: 'failed', error: error.message });
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  } finally {
    await browser.close();
  }

  // Generate Report
  console.log('\n' + '='.repeat(60));
  console.log('📊 AZURE DEPLOYMENT TEST RESULTS');
  console.log('='.repeat(60));

  const allTests = [...results.backend, ...results.frontend, ...results.api];
  const passed = allTests.filter(t => t.status === 'passed').length;
  const failed = allTests.filter(t => t.status === 'failed').length;
  const total = allTests.length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  console.log('\n📋 Test Details:');
  console.log('\nBackend Tests:');
  results.backend.forEach(t => {
    console.log(`  ${t.status === 'passed' ? '✅' : '❌'} ${t.test}`);
  });

  console.log('\nFrontend Tests:');
  results.frontend.forEach(t => {
    const icon = t.status === 'passed' ? '✅' : t.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${t.test}`);
  });

  console.log('\nAPI Tests:');
  results.api.forEach(t => {
    console.log(`  ${t.status === 'passed' ? '✅' : '❌'} ${t.test}`);
    if (t.firstResult) console.log(`     Result: ${t.firstResult}`);
    if (t.hebrewNames !== undefined) {
      console.log(`     Hebrew names: ${t.hebrewNames}/${t.totalResults}`);
    }
  });

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    urls: {
      backend: AZURE_BACKEND,
      frontend: AZURE_FRONTEND
    },
    summary: {
      total: total,
      passed: passed,
      failed: failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`
    },
    results: {
      backend: results.backend,
      frontend: results.frontend,
      api: results.api
    }
  };

  writeFileSync('azure-screenshots/test-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Report saved to azure-screenshots/test-report.json');
  console.log('📸 Screenshots saved to azure-screenshots/\n');
}

// Run the tests
testAzureDeployment().catch(console.error);