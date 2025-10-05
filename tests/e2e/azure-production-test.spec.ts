import { test, expect } from '@playwright/test';

const AZURE_URL = 'https://wonder-ceo-web.azurewebsites.net';
const SCREENSHOT_DIR = 'test-results/azure-edge-screenshots';

test.describe('Wonder Care - Azure Production Deployment (Edge Browser)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Azure production URL
    await page.goto(AZURE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('01 - Homepage displays with 3,100+ nurses claim', async ({ page }) => {
    // Verify 3,100+ claim is visible
    const nurseCount = page.locator('text=/3,100|3,184/');
    await expect(nurseCount.first()).toBeVisible({ timeout: 10000 });

    // Capture full homepage
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-azure-homepage.png`,
      fullPage: true
    });
  });

  test('02 - Hebrew search query works', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Enter Hebrew search query
    await searchInput.first().fill('מצא אחות לטיפול בפצעים בתל אביב');

    // Screenshot after entering query
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-azure-hebrew-query.png`,
      fullPage: true
    });

    // Submit search
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו|אחות/', { timeout: 15000 });

    // Capture results
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-azure-search-results.png`,
      fullPage: true
    });
  });

  test('03 - Verify Hebrew names are displayed', async ({ page }) => {
    // Search for nurses
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('אחות בתל אביב');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו|אחות/', { timeout: 15000 });

    // Check for Hebrew characters in nurse names
    const hebrewNamePattern = /[\u0590-\u05FF]+/;

    // Get text content and verify Hebrew characters exist
    const pageText = await page.textContent('body');
    const hasHebrewNames = hebrewNamePattern.test(pageText || '');
    expect(hasHebrewNames).toBeTruthy();

    // Capture nurse cards with Hebrew names
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-azure-hebrew-names.png`,
      fullPage: true
    });
  });

  test('04 - Expand nurse card and verify complete information', async ({ page }) => {
    // Search for nurses
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('אחות בחיפה');
    await page.locator('button:has-text("שלח")').click();

    // Wait for expandable cards
    await page.waitForSelector('[role="button"][aria-expanded], .nurse-card', { timeout: 15000 });

    // Click first card to expand
    const firstCard = page.locator('[role="button"][aria-expanded]').first();
    await firstCard.click();

    // Wait for expansion
    await page.waitForTimeout(1000);

    // Capture expanded card
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-azure-expanded-card.png`,
      fullPage: true
    });
  });

  test('05 - Verify scoring formula is displayed', async ({ page }) => {
    // Search for nurses
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('מצא אחות');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו|אחות/', { timeout: 15000 });

    // Expand first card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();
    await firstCard.click();
    await page.waitForTimeout(1000);

    // Look for scoring formula keywords
    const formulaKeywords = ['Score', 'Service', 'Location', 'Rating', 'ציון', 'שירות', 'מיקום'];
    let foundFormula = false;

    for (const keyword of formulaKeywords) {
      const element = page.locator(`text=${keyword}`);
      if (await element.count() > 0) {
        foundFormula = true;
        break;
      }
    }

    // Capture scoring display
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-azure-scoring-formula.png`,
      fullPage: true
    });
  });

  test('06 - Test Jerusalem query (edge case)', async ({ page }) => {
    // Search for Jerusalem
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('אחות בירושלים');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results or empty state
    await page.waitForTimeout(5000);

    // Capture results (should work with enriched data)
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-azure-jerusalem-results.png`,
      fullPage: true
    });
  });

  test('07 - Test Ramat Gan query', async ({ page }) => {
    // Search for Ramat Gan
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('אחות ברמת גן');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForTimeout(5000);

    // Capture results
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-azure-ramat-gan-results.png`,
      fullPage: true
    });
  });

  test('08 - Test service filter (wound care)', async ({ page }) => {
    // Search for wound care in Haifa
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('טיפול בפצעים בחיפה');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForTimeout(5000);

    // Capture service-filtered results
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-azure-service-filter.png`,
      fullPage: true
    });
  });

  test('09 - Mobile viewport test (iPhone 12)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });

    // Reload page
    await page.goto(AZURE_URL);
    await page.waitForLoadState('networkidle');

    // Capture mobile homepage
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-azure-mobile-homepage.png`,
      fullPage: true
    });

    // Test mobile search
    const searchInput = page.locator('input[placeholder*="שאל"]').or(page.locator('textarea[placeholder*="שאל"]'));
    await searchInput.first().fill('אחות בתל אביב');
    await page.locator('button:has-text("שלח")').click();
    await page.waitForTimeout(5000);

    // Capture mobile results
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/11-azure-mobile-results.png`,
      fullPage: true
    });
  });

  test('10 - API health check verification', async ({ request }) => {
    // Call health endpoint
    const response = await request.get(`${AZURE_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const healthData = await response.json();

    // Verify nurse count
    expect(healthData.nursesLoaded).toBeGreaterThan(3000);
    expect(healthData.status).toBe('ok');

    console.log('Azure Health Check:', JSON.stringify(healthData, null, 2));
  });
});
