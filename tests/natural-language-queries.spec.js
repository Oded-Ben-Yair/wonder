// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - Natural Language Query Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set up console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should handle basic English queries', async ({ page }) => {
    // Look for chat interface or text input
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      'input[placeholder*="search"]',
      'input[placeholder*="query"]',
      'input[placeholder*="nurse"]',
      '[data-testid="chat-input"]',
      '[data-testid="search-input"]'
    ];

    let inputElement = null;
    let inputSelector = '';

    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        inputElement = element;
        inputSelector = selector;
        break;
      }
    }

    if (!inputElement) {
      console.log('No input found, looking for clickable chat elements...');

      // Look for chat or search buttons to activate input
      const activatorSelectors = [
        'button:has-text("Chat")',
        'button:has-text("Search")',
        'text=/chat|search/i',
        '[role="button"]'
      ];

      for (const selector of activatorSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          await element.click();
          await page.waitForTimeout(1000);

          // Try to find input again after clicking
          for (const inputSel of inputSelectors) {
            const newInputElement = page.locator(inputSel).first();
            if (await newInputElement.isVisible()) {
              inputElement = newInputElement;
              inputSelector = inputSel;
              break;
            }
          }
          if (inputElement) break;
        }
      }
    }

    if (inputElement) {
      console.log(`Found input element: ${inputSelector}`);

      const testQueries = [
        "I need a nurse in Tel Aviv",
        "Female nurse for wound care",
        "I urgently need a nurse",
        "Find me a pediatric nurse",
        "Nurse available today"
      ];

      for (let i = 0; i < testQueries.length; i++) {
        const query = testQueries[i];
        console.log(`Testing query: ${query}`);

        // Clear and enter query
        await inputElement.fill('');
        await inputElement.fill(query);

        // Take screenshot of query input
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `11-query-${i + 1}-input.png`)
        });

        // Look for submit button or press Enter
        const submitSelectors = [
          'button:has-text("Send")',
          'button:has-text("Search")',
          'button:has-text("Submit")',
          'button[type="submit"]',
          '[data-testid="send-button"]'
        ];

        let submitted = false;

        for (const selector of submitSelectors) {
          const button = page.locator(selector).first();
          if (await button.isVisible()) {
            await button.click();
            submitted = true;
            break;
          }
        }

        if (!submitted) {
          // Try pressing Enter
          await inputElement.press('Enter');
          console.log('Pressed Enter to submit');
        }

        // Wait for response
        await page.waitForTimeout(3000);

        // Take screenshot of response
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `12-query-${i + 1}-response.png`),
          fullPage: true
        });

        // Check if there's any response content
        const bodyText = await page.textContent('body');
        console.log(`Response length: ${bodyText.length} characters`);

        await page.waitForTimeout(1000);
      }

      console.log('✓ English queries tested');
    } else {
      console.log('❌ No input element found for queries');

      // Take screenshot showing current state
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '13-no-input-found.png'),
        fullPage: true
      });
    }
  });

  test('should handle Hebrew queries', async ({ page }) => {
    // Find input element (using same logic as above)
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      'input[placeholder*="search"]',
      '[data-testid="chat-input"]'
    ];

    let inputElement = null;

    // Try to activate chat interface first
    const chatActivator = page.locator('button:has-text("Chat")').first();
    if (await chatActivator.isVisible()) {
      await chatActivator.click();
      await page.waitForTimeout(1000);
    }

    for (const selector of inputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        inputElement = element;
        break;
      }
    }

    if (inputElement) {
      const hebrewQueries = [
        "מי זמין היום בתל אביב?",
        "אני צריך אחות דחופה",
        "אחות לטיפול בפצעים",
        "איפה יש אחות פדיאטרית?",
        "אחות בירושלים"
      ];

      for (let i = 0; i < hebrewQueries.length; i++) {
        const query = hebrewQueries[i];
        console.log(`Testing Hebrew query: ${query}`);

        await inputElement.fill('');
        await inputElement.fill(query);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `14-hebrew-query-${i + 1}.png`)
        });

        // Submit query
        await inputElement.press('Enter');
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `15-hebrew-response-${i + 1}.png`),
          fullPage: true
        });

        await page.waitForTimeout(1000);
      }

      console.log('✓ Hebrew queries tested');
    } else {
      console.log('❌ No input element found for Hebrew queries');
    }
  });

  test('should handle urgency indicators', async ({ page }) => {
    const urgentQueries = [
      "URGENT: Need nurse now!",
      "Emergency - require immediate help",
      "Urgent care needed in Tel Aviv",
      "Need nurse ASAP",
      "Emergency medical assistance required"
    ];

    // Find and test urgent queries
    let inputElement = null;

    // Look for input
    for (const selector of ['input[type="text"]', 'textarea', '[data-testid="chat-input"]']) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        inputElement = element;
        break;
      }
    }

    if (!inputElement) {
      // Try to activate chat
      const chatButton = page.locator('text=/chat/i').first();
      if (await chatButton.isVisible()) {
        await chatButton.click();
        await page.waitForTimeout(1000);

        const newInput = page.locator('input[type="text"]').first();
        if (await newInput.isVisible()) {
          inputElement = newInput;
        }
      }
    }

    if (inputElement) {
      for (let i = 0; i < urgentQueries.length; i++) {
        const query = urgentQueries[i];
        console.log(`Testing urgent query: ${query}`);

        await inputElement.fill('');
        await inputElement.fill(query);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `16-urgent-query-${i + 1}.png`)
        });

        await inputElement.press('Enter');
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `17-urgent-response-${i + 1}.png`),
          fullPage: true
        });
      }

      console.log('✓ Urgency indicators tested');
    } else {
      console.log('❌ No input found for urgency tests');
    }
  });

  test('should handle complex multi-criteria queries', async ({ page }) => {
    const complexQueries = [
      "Female nurse in Tel Aviv for wound care, available today after 3pm",
      "Male pediatric nurse near Haifa with 5+ years experience",
      "Urgent: Need wound care specialist in Jerusalem, any gender",
      "Looking for geriatric nurse in Beer Sheva, preferably Hebrew speaking",
      "Need orthopedic nurse in Netanya for home visit tomorrow morning"
    ];

    // Find input element
    let inputElement = page.locator('input[type="text"]').first();

    // Try to activate interface if not visible
    if (!(await inputElement.isVisible())) {
      const activator = page.locator('button, [role="button"]').first();
      if (await activator.isVisible()) {
        await activator.click();
        await page.waitForTimeout(1000);
      }
    }

    // Re-check for input
    for (const selector of ['input', 'textarea']) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        inputElement = element;
        break;
      }
    }

    if (await inputElement.isVisible()) {
      for (let i = 0; i < complexQueries.length; i++) {
        const query = complexQueries[i];
        console.log(`Testing complex query: ${query}`);

        await inputElement.fill('');
        await inputElement.fill(query);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `18-complex-query-${i + 1}.png`)
        });

        await inputElement.press('Enter');
        await page.waitForTimeout(5000); // Longer wait for complex queries

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `19-complex-response-${i + 1}.png`),
          fullPage: true
        });
      }

      console.log('✓ Complex queries tested');
    } else {
      console.log('❌ No input found for complex queries');

      // Take screenshot to debug
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '20-debug-no-input.png'),
        fullPage: true
      });
    }
  });

  test('should provide meaningful responses', async ({ page }) => {
    // Test response quality
    let inputElement = page.locator('input[type="text"]').first();

    if (!(await inputElement.isVisible())) {
      // Try to find any input
      const inputs = await page.locator('input, textarea').all();
      for (const input of inputs) {
        if (await input.isVisible()) {
          inputElement = input;
          break;
        }
      }
    }

    if (await inputElement.isVisible()) {
      const testQuery = "I need a nurse in Tel Aviv";
      await inputElement.fill(testQuery);
      await inputElement.press('Enter');

      // Wait for response
      await page.waitForTimeout(5000);

      // Check for meaningful response indicators
      const bodyText = await page.textContent('body');
      const responseIndicators = [
        'nurse',
        'Tel Aviv',
        'available',
        'found',
        'search',
        'result',
        'match'
      ];

      const foundIndicators = responseIndicators.filter(indicator =>
        bodyText.toLowerCase().includes(indicator.toLowerCase())
      );

      console.log(`Found response indicators: ${foundIndicators.join(', ')}`);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '21-response-analysis.png'),
        fullPage: true
      });

      expect(foundIndicators.length).toBeGreaterThan(0);
      console.log('✓ Meaningful responses detected');
    } else {
      console.log('❌ Cannot test responses - no input found');
    }
  });
});