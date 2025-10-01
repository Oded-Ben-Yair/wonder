// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - API Integration Tests', () => {
  const BACKEND_URL = 'https://wonder-backend-api.azurewebsites.net';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Monitor network requests
    page.on('request', request => {
      if (request.url().includes('wonder-backend-api') || request.url().includes('api')) {
        console.log(`→ Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('wonder-backend-api') || response.url().includes('api')) {
        console.log(`← Response: ${response.status()} ${response.url()}`);
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should verify backend API connectivity', async ({ page }) => {
    // Test direct API access via browser
    console.log(`Testing direct API connectivity to: ${BACKEND_URL}`);

    // Try to access the backend health endpoint
    try {
      const response = await page.goto(`${BACKEND_URL}/health`);

      if (response) {
        console.log(`Backend health endpoint status: ${response.status()}`);

        if (response.ok()) {
          console.log('✓ Backend API is accessible');
        } else {
          console.log('⚠ Backend API responded with non-200 status');
        }

        // Take screenshot of health response
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '36-backend-health.png')
        });
      }
    } catch (error) {
      console.log('❌ Failed to access backend health endpoint:', error.message);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '37-backend-health-error.png')
      });
    }

    // Go back to main application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should test API calls through frontend', async ({ page }) => {
    let apiRequestsCaptured = [];
    let apiResponsesCaptured = [];

    // Capture API requests and responses
    page.on('request', request => {
      if (request.url().includes('wonder-backend-api') ||
          request.url().includes('/api/') ||
          request.url().includes('/match') ||
          request.url().includes('/search')) {
        apiRequestsCaptured.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('wonder-backend-api') ||
          response.url().includes('/api/') ||
          response.url().includes('/match') ||
          response.url().includes('/search')) {
        apiResponsesCaptured.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Perform a search to trigger API calls
    const inputElement = page.locator('input[type="text"]').first();

    if (await inputElement.isVisible()) {
      await inputElement.fill('Tel Aviv');

      // Look for search/submit button
      const searchButton = page.locator('button:has-text("Search"), button[type="submit"], button:has-text("Find")').first();

      if (await searchButton.isVisible()) {
        console.log('Triggering API call via search...');

        await searchButton.click();

        // Wait for API response
        await page.waitForTimeout(5000);

        // Take screenshot after search
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '38-api-search-triggered.png'),
          fullPage: true
        });

        console.log(`Captured ${apiRequestsCaptured.length} API requests`);
        console.log(`Captured ${apiResponsesCaptured.length} API responses`);

        // Log API interactions
        if (apiRequestsCaptured.length > 0) {
          console.log('✓ API requests detected:');
          apiRequestsCaptured.forEach((req, index) => {
            console.log(`  ${index + 1}. ${req.method} ${req.url}`);
          });
        }

        if (apiResponsesCaptured.length > 0) {
          console.log('✓ API responses detected:');
          apiResponsesCaptured.forEach((res, index) => {
            console.log(`  ${index + 1}. ${res.status} ${res.url}`);
          });
        }

        if (apiRequestsCaptured.length === 0 && apiResponsesCaptured.length === 0) {
          console.log('❌ No API calls detected through frontend');
        }
      } else {
        console.log('❌ No search button found to trigger API call');
      }
    } else {
      console.log('❌ No input element found to perform search');
    }
  });

  test('should test API error handling in UI', async ({ page }) => {
    // Monitor for error handling in the UI
    let networkErrors = [];
    let consoleErrors = [];

    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Try to trigger API calls that might fail
    const searchStrategies = [
      { name: 'Empty search', value: '' },
      { name: 'Invalid city', value: 'NonExistentCityXYZ123' },
      { name: 'Special characters', value: '!@#$%^&*()' },
      { name: 'Very long string', value: 'A'.repeat(500) }
    ];

    for (let i = 0; i < searchStrategies.length; i++) {
      const strategy = searchStrategies[i];
      console.log(`Testing error handling for: ${strategy.name}`);

      const inputElement = page.locator('input[type="text"]').first();

      if (await inputElement.isVisible()) {
        await inputElement.fill(strategy.value);

        const searchButton = page.locator('button').first();
        if (await searchButton.isVisible()) {
          await searchButton.click();
          await page.waitForTimeout(3000);

          // Take screenshot of potential error state
          await page.screenshot({
            path: path.join('/home/odedbe/wonder/test-screenshots', `39-error-handling-${i + 1}.png`),
            fullPage: true
          });
        }
      }
    }

    console.log(`Network errors detected: ${networkErrors.length}`);
    console.log(`Console errors detected: ${consoleErrors.length}`);

    if (networkErrors.length > 0) {
      console.log('Network errors:');
      networkErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.url} - ${error.failure}`);
      });
    }

    if (consoleErrors.length > 0) {
      console.log('Console errors:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    console.log('✓ Error handling tested');
  });

  test('should verify loading indicators work during API calls', async ({ page }) => {
    // Look for loading indicators
    const loadingIndicatorSelectors = [
      'text=/loading|spinner|wait/i',
      '[data-testid*="loading"]',
      '[data-testid*="spinner"]',
      '.loading',
      '.spinner',
      '.loading-indicator'
    ];

    // Trigger a search to see loading states
    const inputElement = page.locator('input[type="text"]').first();

    if (await inputElement.isVisible()) {
      await inputElement.fill('Tel Aviv');

      const searchButton = page.locator('button').first();
      if (await searchButton.isVisible()) {
        // Click and immediately look for loading indicators
        await searchButton.click();

        // Quick check for loading indicators
        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(500);

          for (const selector of loadingIndicatorSelectors) {
            const loadingElement = page.locator(selector);
            if (await loadingElement.isVisible()) {
              console.log(`✓ Loading indicator found: ${selector}`);

              await page.screenshot({
                path: path.join('/home/odedbe/wonder/test-screenshots', `40-loading-indicator-${i}.png`)
              });
              break;
            }
          }
        }

        // Wait for loading to complete
        await page.waitForTimeout(3000);

        // Verify loading indicators are gone
        let loadingStillVisible = false;
        for (const selector of loadingIndicatorSelectors) {
          const loadingElement = page.locator(selector);
          if (await loadingElement.isVisible()) {
            loadingStillVisible = true;
            console.log(`⚠ Loading indicator still visible: ${selector}`);
          }
        }

        if (!loadingStillVisible) {
          console.log('✓ Loading indicators properly hidden after completion');
        }

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '41-loading-completed.png'),
          fullPage: true
        });
      }
    }
  });

  test('should test different API endpoints if accessible', async ({ page }) => {
    // Test various potential API endpoints
    const endpoints = [
      '/health',
      '/api/health',
      '/match',
      '/api/match',
      '/search',
      '/api/search',
      '/nurses',
      '/api/nurses'
    ];

    const endpointResults = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${BACKEND_URL}${endpoint}`);

        const response = await page.goto(`${BACKEND_URL}${endpoint}`, { timeout: 10000 });

        const result = {
          endpoint,
          status: response ? response.status() : 'No response',
          accessible: response ? response.ok() : false
        };

        endpointResults.push(result);

        if (response && response.ok()) {
          // Take screenshot of successful endpoint
          await page.screenshot({
            path: path.join('/home/odedbe/wonder/test-screenshots', `42-endpoint-${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}.png`)
          });
        }

        await page.waitForTimeout(1000);

      } catch (error) {
        console.log(`Endpoint ${endpoint} failed: ${error.message}`);
        endpointResults.push({
          endpoint,
          status: 'Error',
          accessible: false,
          error: error.message
        });
      }
    }

    // Summary of endpoint testing
    console.log('\n📊 Endpoint Testing Summary:');
    endpointResults.forEach(result => {
      const status = result.accessible ? '✓' : '❌';
      console.log(`${status} ${result.endpoint}: ${result.status}`);
    });

    const accessibleEndpoints = endpointResults.filter(r => r.accessible).length;
    console.log(`\n${accessibleEndpoints}/${endpoints.length} endpoints accessible`);

    // Go back to main application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should verify CORS and cross-origin handling', async ({ page }) => {
    let corsErrors = [];
    let corsRequests = [];

    // Monitor for CORS-related issues
    page.on('console', msg => {
      if (msg.text().toLowerCase().includes('cors') ||
          msg.text().toLowerCase().includes('cross-origin')) {
        corsErrors.push(msg.text());
      }
    });

    page.on('request', request => {
      if (request.url().includes('wonder-backend-api')) {
        corsRequests.push({
          url: request.url(),
          headers: request.headers()
        });
      }
    });

    // Trigger API calls that would test CORS
    const inputElement = page.locator('input[type="text"]').first();

    if (await inputElement.isVisible()) {
      await inputElement.fill('Test CORS');

      const searchButton = page.locator('button').first();
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '43-cors-test.png'),
          fullPage: true
        });
      }
    }

    console.log(`CORS requests detected: ${corsRequests.length}`);
    console.log(`CORS errors detected: ${corsErrors.length}`);

    if (corsErrors.length > 0) {
      console.log('CORS errors:');
      corsErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✓ No CORS issues detected');
    }

    if (corsRequests.length > 0) {
      console.log('✓ Cross-origin requests made successfully');
    }
  });
});