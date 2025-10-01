/**
 * Azure Chatbot Diagnostic Test
 * Tests: https://wonder-ceo-web.azurewebsites.net
 *
 * Purpose: Comprehensive diagnosis of Hebrew NLP chatbot functionality
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const AZURE_URL = 'https://wonder-ceo-web.azurewebsites.net';
const TEST_QUERY = 'אני צריך אחות לטיפול בפצעים בתל אביב';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'test-results', 'azure-chatbot-diagnosis');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Azure Chatbot Diagnostic Suite', () => {
  let networkLogs = [];
  let consoleLogs = [];
  let errors = [];

  test.beforeEach(async ({ page }) => {
    // Reset logs
    networkLogs = [];
    consoleLogs = [];
    errors = [];

    // Capture console messages
    page.on('console', msg => {
      const logEntry = {
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date().toISOString()
      };
      consoleLogs.push(logEntry);
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorEntry = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      errors.push(errorEntry);
      console.error('[PAGE ERROR]', error.message);
    });

    // Capture network requests
    page.on('request', request => {
      const requestLog = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString()
      };
      networkLogs.push({ type: 'request', ...requestLog });
      console.log(`[REQUEST] ${request.method()} ${request.url()}`);
    });

    // Capture network responses
    page.on('response', async response => {
      const responseLog = {
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };

      try {
        // Try to get response body for API calls
        if (response.url().includes('/match') || response.url().includes('/api')) {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            responseLog.body = await response.json();
          } else {
            responseLog.body = await response.text();
          }
        }
      } catch (e) {
        responseLog.bodyError = e.message;
      }

      networkLogs.push({ type: 'response', ...responseLog });
      console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    });
  });

  test('Step 1: Initial Page Load', async ({ page }) => {
    console.log('\n=== STEP 1: NAVIGATING TO AZURE DEPLOYMENT ===');

    // Navigate with extended timeout
    const response = await page.goto(AZURE_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log(`Page Response Status: ${response.status()}`);
    console.log(`Page URL: ${page.url()}`);

    // Take initial screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-load.png'),
      fullPage: true
    });

    // Check for basic page elements
    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // Wait a moment for any dynamic content
    await page.waitForTimeout(2000);

    // Document what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log(`Body contains text (first 500 chars): ${bodyText.substring(0, 500)}`);

    // Save diagnostic data
    const diagnosticData = {
      step: 'Initial Load',
      url: page.url(),
      title,
      status: response.status(),
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      networkLogs: [...networkLogs],
      errors: [...errors]
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, '01-initial-load.json'),
      JSON.stringify(diagnosticData, null, 2)
    );

    expect(response.status()).toBe(200);
  });

  test('Step 2: Find Chatbot Interface', async ({ page }) => {
    console.log('\n=== STEP 2: LOCATING CHATBOT INTERFACE ===');

    await page.goto(AZURE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Try multiple strategies to find the chatbot input
    const inputSelectors = [
      'input[placeholder*="Ask"]',
      'input[placeholder*="nurses"]',
      'input[placeholder*="אחות"]',
      'input[type="text"]',
      'textarea',
      '[data-testid="chat-input"]',
      '.chat-input',
      '#chatInput'
    ];

    let foundInput = null;
    let foundSelector = null;

    for (const selector of inputSelectors) {
      try {
        const input = page.locator(selector).first();
        const count = await input.count();

        if (count > 0) {
          const isVisible = await input.isVisible();
          const placeholder = await input.getAttribute('placeholder').catch(() => null);

          console.log(`Found input with selector "${selector}": visible=${isVisible}, placeholder="${placeholder}"`);

          if (isVisible) {
            foundInput = input;
            foundSelector = selector;
            break;
          }
        }
      } catch (e) {
        // Selector not found, continue
      }
    }

    // Take screenshot showing the interface
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-interface-search.png'),
      fullPage: true
    });

    // Get all input elements on page for debugging
    const allInputs = await page.locator('input, textarea').all();
    console.log(`Total input/textarea elements found: ${allInputs.length}`);

    for (let i = 0; i < allInputs.length; i++) {
      try {
        const input = allInputs[i];
        const type = await input.getAttribute('type');
        const placeholder = await input.getAttribute('placeholder');
        const className = await input.getAttribute('class');
        const id = await input.getAttribute('id');
        const isVisible = await input.isVisible();

        console.log(`Input ${i}: type="${type}", placeholder="${placeholder}", class="${className}", id="${id}", visible=${isVisible}`);
      } catch (e) {
        console.log(`Input ${i}: Could not get attributes`);
      }
    }

    // Save diagnostic data
    const diagnosticData = {
      step: 'Find Input',
      foundSelector,
      inputCount: allInputs.length,
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      networkLogs: [...networkLogs],
      errors: [...errors]
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, '02-interface-search.json'),
      JSON.stringify(diagnosticData, null, 2)
    );

    expect(foundInput).not.toBeNull();
  });

  test('Step 3: Enter Hebrew Query', async ({ page }) => {
    console.log('\n=== STEP 3: ENTERING HEBREW QUERY ===');

    await page.goto(AZURE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Find input (using most common pattern)
    const input = page.locator('input[placeholder*="Ask"], input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });

    // Click to focus
    await input.click();
    await page.waitForTimeout(500);

    // Type the Hebrew query slowly
    console.log(`Typing query: ${TEST_QUERY}`);
    await input.fill(TEST_QUERY);
    await page.waitForTimeout(1000);

    // Verify the text was entered
    const inputValue = await input.inputValue();
    console.log(`Input value after typing: ${inputValue}`);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-query-entered.png'),
      fullPage: true
    });

    // Save diagnostic data
    const diagnosticData = {
      step: 'Enter Query',
      query: TEST_QUERY,
      inputValue,
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      networkLogs: [...networkLogs],
      errors: [...errors]
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, '03-query-entered.json'),
      JSON.stringify(diagnosticData, null, 2)
    );

    expect(inputValue).toContain('אחות');
  });

  test('Step 4: Submit Query', async ({ page }) => {
    console.log('\n=== STEP 4: SUBMITTING QUERY ===');

    await page.goto(AZURE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const input = page.locator('input[placeholder*="Ask"], input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(TEST_QUERY);
    await page.waitForTimeout(1000);

    // Clear network logs to focus on submission
    networkLogs = [];

    // Try to find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Search")',
      'button:has-text("Send")',
      'button:has-text("חפש")',
      '[data-testid="submit"]',
      '.submit-button',
      'form button'
    ];

    let submitted = false;

    for (const selector of submitSelectors) {
      try {
        const button = page.locator(selector).first();
        const count = await button.count();

        if (count > 0 && await button.isVisible()) {
          console.log(`Found submit button: ${selector}`);
          await button.click();
          submitted = true;
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }

    // If no button found, try pressing Enter
    if (!submitted) {
      console.log('No submit button found, pressing Enter');
      await input.press('Enter');
    }

    // Wait for network activity
    console.log('Waiting for response...');
    await page.waitForTimeout(3000);

    // Take screenshot after submission
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-query-submitted.png'),
      fullPage: true
    });

    // Look for /match request
    const matchRequests = networkLogs.filter(log =>
      log.type === 'request' && log.url.includes('/match')
    );

    const matchResponses = networkLogs.filter(log =>
      log.type === 'response' && log.url.includes('/match')
    );

    console.log(`\nMatch Requests Found: ${matchRequests.length}`);
    matchRequests.forEach(req => {
      console.log('Request Details:');
      console.log(`  URL: ${req.url}`);
      console.log(`  Method: ${req.method}`);
      console.log(`  Post Data: ${req.postData}`);
    });

    console.log(`\nMatch Responses Found: ${matchResponses.length}`);
    matchResponses.forEach(res => {
      console.log('Response Details:');
      console.log(`  Status: ${res.status}`);
      console.log(`  Body: ${JSON.stringify(res.body, null, 2)}`);
    });

    // Save diagnostic data
    const diagnosticData = {
      step: 'Submit Query',
      matchRequests,
      matchResponses,
      allNetworkLogs: networkLogs,
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      errors: [...errors]
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, '04-query-submitted.json'),
      JSON.stringify(diagnosticData, null, 2)
    );
  });

  test('Step 5: Analyze Response Display', async ({ page }) => {
    console.log('\n=== STEP 5: ANALYZING RESPONSE DISPLAY ===');

    await page.goto(AZURE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    const input = page.locator('input[placeholder*="Ask"], input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill(TEST_QUERY);
    await input.press('Enter');

    // Wait for loading indicator
    try {
      await page.waitForSelector(':has-text("Searching")', { timeout: 5000 });
      console.log('Loading indicator found');
    } catch (e) {
      console.log('No loading indicator found');
    }

    // Wait for results (or timeout)
    await page.waitForTimeout(5000);

    // Take screenshot of results
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-results-display.png'),
      fullPage: true
    });

    // Analyze what's displayed
    const bodyText = await page.locator('body').textContent();

    // Look for common result indicators
    const indicators = {
      hasNurseNames: /[א-ת]{2,}\s+[א-ת]{2,}/.test(bodyText), // Hebrew names pattern
      hasScores: /score|ציון/i.test(bodyText),
      hasLocations: /Tel Aviv|תל אביב|Jerusalem|ירושלים/i.test(bodyText),
      hasError: /error|שגיאה|failed/i.test(bodyText),
      hasNoResults: /no results|אין תוצאות|not found/i.test(bodyText)
    };

    console.log('\nContent Analysis:');
    console.log(`  Has Nurse Names: ${indicators.hasNurseNames}`);
    console.log(`  Has Scores: ${indicators.hasScores}`);
    console.log(`  Has Locations: ${indicators.hasLocations}`);
    console.log(`  Has Error: ${indicators.hasError}`);
    console.log(`  Has No Results: ${indicators.hasNoResults}`);

    // Try to find specific result elements
    const resultSelectors = [
      '.nurse-card',
      '.result-item',
      '[data-testid="nurse-result"]',
      '.match-result'
    ];

    let resultsFound = 0;
    for (const selector of resultSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`Found ${count} results with selector: ${selector}`);
        resultsFound = count;
        break;
      }
    }

    // Get all match responses
    const matchResponses = networkLogs.filter(log =>
      log.type === 'response' && log.url.includes('/match')
    );

    // Save final diagnostic data
    const diagnosticData = {
      step: 'Analyze Display',
      indicators,
      resultsFound,
      bodyTextSample: bodyText.substring(0, 1000),
      matchResponses,
      timestamp: new Date().toISOString(),
      consoleLogs: [...consoleLogs],
      networkLogs: [...networkLogs],
      errors: [...errors]
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, '05-results-analysis.json'),
      JSON.stringify(diagnosticData, null, 2)
    );
  });

  test('COMPLETE DIAGNOSTIC RUN', async ({ page }) => {
    console.log('\n=== COMPLETE DIAGNOSTIC TEST ===\n');

    // Step 1: Load
    console.log('STEP 1: Loading page...');
    const response = await page.goto(AZURE_URL, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    console.log(`✓ Page loaded: ${response.status()}`);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'complete-01-load.png'),
      fullPage: true
    });
    await page.waitForTimeout(2000);

    // Step 2: Find input
    console.log('\nSTEP 2: Finding chatbot input...');
    const input = page.locator('input[placeholder*="Ask"], input[type="text"]').first();
    await input.waitFor({ state: 'visible', timeout: 10000 });
    const placeholder = await input.getAttribute('placeholder');
    console.log(`✓ Input found: ${placeholder}`);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'complete-02-input-found.png'),
      fullPage: true
    });

    // Step 3: Enter query
    console.log('\nSTEP 3: Entering Hebrew query...');
    console.log(`Query: ${TEST_QUERY}`);
    await input.click();
    await input.fill(TEST_QUERY);
    await page.waitForTimeout(1000);
    const inputValue = await input.inputValue();
    console.log(`✓ Query entered: ${inputValue}`);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'complete-03-query-entered.png'),
      fullPage: true
    });

    // Step 4: Submit
    console.log('\nSTEP 4: Submitting query...');
    networkLogs = []; // Clear to focus on submission
    await input.press('Enter');
    console.log('✓ Query submitted');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'complete-04-submitting.png'),
      fullPage: true
    });

    // Step 5: Wait for response
    console.log('\nSTEP 5: Waiting for response...');
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'complete-05-response.png'),
      fullPage: true
    });

    // Analysis
    console.log('\n=== ANALYSIS ===');

    const matchRequests = networkLogs.filter(log =>
      log.type === 'request' && log.url.includes('/match')
    );

    const matchResponses = networkLogs.filter(log =>
      log.type === 'response' && log.url.includes('/match')
    );

    console.log(`\nNetwork Activity:`);
    console.log(`  Match Requests: ${matchRequests.length}`);
    console.log(`  Match Responses: ${matchResponses.length}`);

    if (matchRequests.length > 0) {
      console.log('\nMatch Request Details:');
      matchRequests.forEach(req => {
        console.log(`  URL: ${req.url}`);
        console.log(`  Method: ${req.method}`);
        if (req.postData) {
          console.log(`  Payload: ${req.postData}`);
        }
      });
    }

    if (matchResponses.length > 0) {
      console.log('\nMatch Response Details:');
      matchResponses.forEach(res => {
        console.log(`  Status: ${res.status}`);
        if (res.body) {
          console.log(`  Body: ${JSON.stringify(res.body, null, 2)}`);
        }
      });
    }

    console.log(`\nConsole Logs: ${consoleLogs.length}`);
    consoleLogs.forEach(log => {
      console.log(`  [${log.type}] ${log.text}`);
    });

    console.log(`\nErrors: ${errors.length}`);
    errors.forEach(err => {
      console.log(`  ${err.message}`);
    });

    // Check what's displayed
    const bodyText = await page.locator('body').textContent();
    const hasResults = /score|ציון|nurse|אחות/i.test(bodyText);
    const hasError = /error|שגיאה|failed/i.test(bodyText);

    console.log('\nDisplay Analysis:');
    console.log(`  Has Results: ${hasResults}`);
    console.log(`  Has Error: ${hasError}`);

    // Save complete report
    const completeReport = {
      testQuery: TEST_QUERY,
      azureUrl: AZURE_URL,
      timestamp: new Date().toISOString(),
      steps: {
        load: { status: response.status() },
        inputFound: { placeholder },
        queryEntered: { value: inputValue },
        submission: {
          matchRequests: matchRequests.length,
          matchResponses: matchResponses.length
        },
        display: { hasResults, hasError }
      },
      networkLogs,
      consoleLogs,
      errors,
      matchRequestDetails: matchRequests,
      matchResponseDetails: matchResponses
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'COMPLETE-REPORT.json'),
      JSON.stringify(completeReport, null, 2)
    );

    console.log('\n✓ Complete diagnostic finished');
    console.log(`Report saved to: ${path.join(SCREENSHOT_DIR, 'COMPLETE-REPORT.json')}`);
  });
});
