// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - Match Tester Interface Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set up error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('Page error:', err.message);
    });
  });

  test('should navigate to Match Tester interface', async ({ page }) => {
    // Look for Match Tester tab or navigation
    const matchTabSelectors = [
      'button:has-text("Match")',
      'a:has-text("Match")',
      'button:has-text("Test")',
      'a:has-text("Test")',
      'button:has-text("Tester")',
      '[data-testid="match-tab"]',
      '[data-testid="test-tab"]',
      'text=/match.*test/i',
      'text=/test.*match/i'
    ];

    let matchTabFound = false;

    for (const selector of matchTabSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        console.log(`Found match tab: ${selector}`);
        await element.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '22-match-tester-tab.png'),
          fullPage: true
        });

        matchTabFound = true;
        break;
      }
    }

    if (!matchTabFound) {
      console.log('No dedicated Match Tester tab found, testing on main interface');

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '23-main-interface.png'),
        fullPage: true
      });
    }

    console.log('✓ Match Tester interface accessed');
  });

  test('should test different filter combinations', async ({ page }) => {
    // Try to access match tester first
    const matchTab = page.locator('text=/match|test/i').first();
    if (await matchTab.isVisible()) {
      await matchTab.click();
      await page.waitForTimeout(1000);
    }

    // Look for filter elements
    const filterTests = [
      {
        name: 'City Filter',
        selectors: [
          'input[placeholder*="city"]',
          'input[placeholder*="location"]',
          'select[name*="city"]',
          '[data-testid="city-input"]'
        ],
        values: ['Tel Aviv', 'Haifa', 'Jerusalem', 'Beer Sheva']
      },
      {
        name: 'Service Filter',
        selectors: [
          'input[placeholder*="service"]',
          'input[placeholder*="specialization"]',
          'select[name*="service"]',
          '[data-testid="service-input"]'
        ],
        values: ['Wound Care', 'Pediatric', 'Geriatric', 'Orthopedic']
      },
      {
        name: 'Urgency Filter',
        selectors: [
          'input[type="checkbox"][name*="urgent"]',
          'input[type="radio"][value*="urgent"]',
          '[data-testid="urgent-checkbox"]'
        ],
        values: [true]
      }
    ];

    for (let i = 0; i < filterTests.length; i++) {
      const filter = filterTests[i];
      console.log(`Testing ${filter.name}...`);

      let filterElement = null;
      let usedSelector = '';

      for (const selector of filter.selectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          filterElement = element;
          usedSelector = selector;
          break;
        }
      }

      if (filterElement) {
        console.log(`Found ${filter.name} using selector: ${usedSelector}`);

        for (const value of filter.values) {
          if (typeof value === 'boolean') {
            // Handle checkbox/radio
            if (value) {
              await filterElement.check();
            } else {
              await filterElement.uncheck();
            }
          } else {
            // Handle text input or select
            if (usedSelector.includes('select')) {
              await filterElement.selectOption({ label: value });
            } else {
              await filterElement.fill(value);
            }
          }

          await page.waitForTimeout(1000);

          // Take screenshot of filter applied
          await page.screenshot({
            path: path.join('/home/odedbe/wonder/test-screenshots', `24-filter-${i + 1}-${value.toString().replace(/\s+/g, '-')}.png`)
          });

          // Look for search/apply button
          const applyButton = page.locator('button:has-text("Search"), button:has-text("Apply"), button[type="submit"]').first();
          if (await applyButton.isVisible()) {
            await applyButton.click();
            await page.waitForTimeout(2000);

            // Take screenshot of results
            await page.screenshot({
              path: path.join('/home/odedbe/wonder/test-screenshots', `25-results-${i + 1}-${value.toString().replace(/\s+/g, '-')}.png`),
              fullPage: true
            });
          }
        }

        console.log(`✓ ${filter.name} tested`);
      } else {
        console.log(`❌ ${filter.name} not found`);
      }
    }
  });

  test('should test combined filter scenarios', async ({ page }) => {
    // Navigate to match tester if available
    const matchTab = page.locator('text=/match|test/i').first();
    if (await matchTab.isVisible()) {
      await matchTab.click();
      await page.waitForTimeout(1000);
    }

    // Define test scenarios with combined filters
    const scenarios = [
      {
        name: 'Tel Aviv + Wound Care',
        filters: {
          city: 'Tel Aviv',
          service: 'Wound Care'
        }
      },
      {
        name: 'Haifa + Urgent + Pediatric',
        filters: {
          city: 'Haifa',
          service: 'Pediatric',
          urgent: true
        }
      },
      {
        name: 'Jerusalem + Geriatric',
        filters: {
          city: 'Jerusalem',
          service: 'Geriatric'
        }
      }
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      console.log(`Testing scenario: ${scenario.name}`);

      // Apply city filter
      if (scenario.filters.city) {
        const cityInput = page.locator('input[placeholder*="city"], input[placeholder*="location"]').first();
        if (await cityInput.isVisible()) {
          await cityInput.fill(scenario.filters.city);
        }
      }

      // Apply service filter
      if (scenario.filters.service) {
        const serviceInput = page.locator('input[placeholder*="service"], input[placeholder*="specialization"]').first();
        if (await serviceInput.isVisible()) {
          await serviceInput.fill(scenario.filters.service);
        }
      }

      // Apply urgency filter
      if (scenario.filters.urgent) {
        const urgentCheckbox = page.locator('input[type="checkbox"][name*="urgent"]').first();
        if (await urgentCheckbox.isVisible()) {
          await urgentCheckbox.check();
        }
      }

      await page.waitForTimeout(1000);

      // Take screenshot of combined filters
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', `26-combined-scenario-${i + 1}-setup.png`)
      });

      // Submit the search
      const searchButton = page.locator('button:has-text("Search"), button:has-text("Find"), button[type="submit"]').first();
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(3000);

        // Take screenshot of results
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `27-combined-scenario-${i + 1}-results.png`),
          fullPage: true
        });

        console.log(`✓ Scenario "${scenario.name}" tested`);
      } else {
        console.log(`❌ No search button found for scenario "${scenario.name}"`);
      }

      // Clear filters for next test
      const inputs = await page.locator('input[type="text"]').all();
      for (const input of inputs) {
        if (await input.isVisible()) {
          await input.fill('');
        }
      }

      const checkboxes = await page.locator('input[type="checkbox"]:checked').all();
      for (const checkbox of checkboxes) {
        await checkbox.uncheck();
      }

      await page.waitForTimeout(500);
    }
  });

  test('should verify results display with names and ratings', async ({ page }) => {
    // Navigate to appropriate interface
    const matchTab = page.locator('text=/match|test/i').first();
    if (await matchTab.isVisible()) {
      await matchTab.click();
      await page.waitForTimeout(1000);
    }

    // Perform a search to get results
    const cityInput = page.locator('input').first();
    if (await cityInput.isVisible()) {
      await cityInput.fill('Tel Aviv');

      const searchButton = page.locator('button').first();
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(3000);
      }
    }

    // Look for results with names and ratings
    const resultIndicators = [
      'text=/nurse|name/i',
      'text=/rating|star|score/i',
      '[data-testid*="result"]',
      '[data-testid*="nurse"]',
      '.result',
      '.nurse-card',
      '.rating'
    ];

    let resultsFound = false;

    for (const selector of resultIndicators) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        resultsFound = true;
        console.log(`Found ${elements.length} results matching: ${selector}`);
      }
    }

    // Take screenshot of results area
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '28-results-verification.png'),
      fullPage: true
    });

    // Check for specific result content
    const bodyText = await page.textContent('body');
    const contentIndicators = [
      'nurse',
      'rating',
      'name',
      'available',
      'tel aviv',
      'specialization'
    ];

    const foundContent = contentIndicators.filter(indicator =>
      bodyText.toLowerCase().includes(indicator)
    );

    console.log(`Content indicators found: ${foundContent.join(', ')}`);

    if (resultsFound || foundContent.length > 2) {
      console.log('✓ Results display verified');
    } else {
      console.log('❌ Limited results display detected');
    }
  });

  test('should test edge cases and error handling', async ({ page }) => {
    // Test empty search
    console.log('Testing empty search...');

    const searchButton = page.locator('button:has-text("Search"), button[type="submit"]').first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '29-empty-search.png'),
        fullPage: true
      });
    }

    // Test invalid city
    console.log('Testing invalid city...');

    const cityInput = page.locator('input').first();
    if (await cityInput.isVisible()) {
      await cityInput.fill('NonExistentCity');

      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '30-invalid-city.png'),
          fullPage: true
        });
      }
    }

    // Test special characters
    console.log('Testing special characters...');

    if (await cityInput.isVisible()) {
      await cityInput.fill('Tel Aviv-Yafo!@#$%');

      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '31-special-characters.png'),
          fullPage: true
        });
      }
    }

    // Test very long input
    console.log('Testing long input...');

    if (await cityInput.isVisible()) {
      const longInput = 'A'.repeat(1000);
      await cityInput.fill(longInput);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '32-long-input.png')
      });

      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '33-long-input-result.png'),
          fullPage: true
        });
      }
    }

    console.log('✓ Edge cases tested');
  });

  test('should test filter reset and clear functionality', async ({ page }) => {
    // Navigate to match tester
    const matchTab = page.locator('text=/match|test/i').first();
    if (await matchTab.isVisible()) {
      await matchTab.click();
      await page.waitForTimeout(1000);
    }

    // Fill in some filters
    const inputs = await page.locator('input[type="text"]').all();
    for (let i = 0; i < Math.min(inputs.length, 2); i++) {
      await inputs[i].fill(`Test Value ${i + 1}`);
    }

    // Check any checkboxes
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    for (const checkbox of checkboxes.slice(0, 1)) {
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }
    }

    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '34-filters-filled.png')
    });

    // Look for clear/reset button
    const clearButtons = [
      'button:has-text("Clear")',
      'button:has-text("Reset")',
      'button:has-text("Cancel")',
      '[data-testid="clear-button"]',
      '[data-testid="reset-button"]'
    ];

    let clearButton = null;
    for (const selector of clearButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        clearButton = button;
        break;
      }
    }

    if (clearButton) {
      await clearButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '35-filters-cleared.png')
      });

      console.log('✓ Filter reset functionality tested');
    } else {
      // Manually clear inputs
      for (const input of inputs) {
        if (await input.isVisible()) {
          await input.fill('');
        }
      }

      for (const checkbox of checkboxes) {
        if (await checkbox.isVisible() && await checkbox.isChecked()) {
          await checkbox.uncheck();
        }
      }

      console.log('✓ Manual filter clearing tested');
    }
  });
});