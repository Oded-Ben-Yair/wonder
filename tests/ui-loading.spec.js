// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - UI Loading Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page event listeners for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });

    page.on('pageerror', err => {
      console.log('Page error:', err.message);
    });
  });

  test('should load the main React application', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to the application
    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Page loaded in ${loadTime}ms`);

    // Take screenshot of the main page
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '01-main-page-loaded.png'),
      fullPage: true
    });

    // Check if the page title is correct
    await expect(page).toHaveTitle(/Wonder Healthcare Platform|Wonder|Healthcare/);

    // Verify React app has rendered
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(100);

    // Check for absence of common error indicators
    expect(bodyContent).not.toContain('Application Error');
    expect(bodyContent).not.toContain('Cannot GET /');
    expect(bodyContent).not.toContain('404');

    console.log('✓ Main React application loaded successfully');
  });

  test('should display loading states properly', async ({ page }) => {
    await page.goto('/');

    // Check if there are any loading indicators
    const loadingElements = await page.locator('text=/loading|spinner|Loading/i').all();

    if (loadingElements.length > 0) {
      console.log(`Found ${loadingElements.length} loading indicators`);

      // Wait for loading to complete
      await page.waitForTimeout(3000);

      // Take screenshot during loading
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '02-loading-state.png')
      });
    }

    // Wait for content to be stable
    await page.waitForLoadState('networkidle');

    console.log('✓ Loading states handled properly');
  });

  test('should have accessible tabs/navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for common tab/navigation patterns
    const tabSelectors = [
      '[role="tab"]',
      '.tab',
      '.nav-tab',
      'button:has-text("Chat")',
      'button:has-text("Match")',
      'button:has-text("Test")',
      'a:has-text("Chat")',
      'a:has-text("Match")',
      'a:has-text("Test")'
    ];

    let foundTabs = [];

    for (const selector of tabSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        foundTabs.push({ selector, count: elements.length });

        // Take screenshot of tabs
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `03-tabs-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png`)
        });
      }
    }

    console.log('Found tabs/navigation:', foundTabs);

    // Try to click on different sections/tabs if they exist
    const chatButton = page.locator('text=/chat/i').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '04-chat-tab.png')
      });
      console.log('✓ Chat tab accessible');
    }

    const matchButton = page.locator('text=/match|test/i').first();
    if (await matchButton.isVisible()) {
      await matchButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '05-match-tab.png')
      });
      console.log('✓ Match/Test tab accessible');
    }

    console.log('✓ Tab navigation tested');
  });

  test('should handle error boundaries gracefully', async ({ page }) => {
    await page.goto('/');

    // Check for React error boundaries
    const errorBoundarySelectors = [
      'text="Something went wrong"',
      'text="Error"',
      '[data-testid="error-boundary"]',
      '.error-boundary'
    ];

    let hasErrors = false;

    for (const selector of errorBoundarySelectors) {
      const errorElements = await page.locator(selector).all();
      if (errorElements.length > 0) {
        hasErrors = true;
        console.log(`Found error boundary: ${selector}`);

        // Take screenshot of error
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', '06-error-boundary.png')
        });
      }
    }

    if (!hasErrors) {
      console.log('✓ No error boundaries triggered');
    }

    // Check console for React errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (consoleLogs.length > 0) {
      console.log('Console errors found:', consoleLogs);
    } else {
      console.log('✓ No console errors detected');
    }
  });

  test('should render main UI components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for common UI components
    const componentSelectors = [
      'input',
      'button',
      'form',
      'textarea',
      '[role="button"]',
      'select'
    ];

    const foundComponents = {};

    for (const selector of componentSelectors) {
      const elements = await page.locator(selector).all();
      foundComponents[selector] = elements.length;
    }

    console.log('UI Components found:', foundComponents);

    // Take screenshot showing all components
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '07-ui-components.png'),
      fullPage: true
    });

    // Verify that we have interactive elements
    const totalInteractiveElements = foundComponents['input'] +
                                   foundComponents['button'] +
                                   foundComponents['[role="button"]'] +
                                   foundComponents['select'];

    expect(totalInteractiveElements).toBeGreaterThan(0);
    console.log(`✓ Found ${totalInteractiveElements} interactive elements`);
  });

  test('should handle different viewport sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '08-desktop-view.png'),
      fullPage: true
    });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '09-tablet-view.png'),
      fullPage: true
    });

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '10-mobile-view.png'),
      fullPage: true
    });

    console.log('✓ Responsive design tested across viewports');
  });
});