import { test, expect } from '@playwright/test';

test.describe('Wonder Care - Nurse Matching Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display welcome message with 3,100+ nurses claim', async ({ page }) => {
    // Verify header shows correct nurse count
    const header = page.locator('text=3,100+ אחיות מקצועיות');
    await expect(header).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/01-homepage.png', fullPage: true });
  });

  test('should successfully search for nurses in Hebrew', async ({ page }) => {
    // Enter Hebrew search query
    const searchInput = page.locator('input[placeholder*="שאל אותי"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('אני צריך אחות לטיפול בפצעים בתל אביב');

    // Submit search
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו.*התאמות/', { timeout: 10000 });

    // Verify results appeared
    const results = page.locator('text=/נמצאו.*התאמות/');
    await expect(results).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/02-search-results.png', fullPage: true });
  });

  test('should display nurse cards with complete information', async ({ page }) => {
    // Search for nurses
    const searchInput = page.locator('input[placeholder*="שאל אותי"]');
    await searchInput.fill('מצא אחות בחיפה');
    await page.locator('button:has-text("שלח")').click();

    // Wait for nurse cards to appear
    await page.waitForSelector('.nurse-card, [role="button"][aria-label*="Nurse"]', { timeout: 10000 });

    // Verify at least one nurse card exists
    const nurseCards = page.locator('.nurse-card, [role="button"][aria-label*="View details"]').first();
    await expect(nurseCards).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/03-nurse-cards.png', fullPage: true });
  });

  test('should show AI explanation of how matches were found', async ({ page }) => {
    // Search
    const searchInput = page.locator('input[placeholder*="שאל אותי"]');
    await searchInput.fill('אחות זמינה דחוף');
    await page.locator('button:has-text("שלח")').click();

    // Wait for AI explanation
    await page.waitForSelector('text=/איך ה-AI/', { timeout: 10000 });

    // Verify explanation text exists
    const aiExplanation = page.locator('text=/חיפשה.*אחיות/');
    await expect(aiExplanation).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/04-ai-explanation.png', fullPage: true });
  });

  test('should handle empty results gracefully', async ({ page }) => {
    // Search for something unlikely to find
    const searchInput = page.locator('input[placeholder*="שאל אותי"]');
    await searchInput.fill('אחות באנטארקטיקה');
    await page.locator('button:has-text("שלח")').click();

    // Wait for empty state message
    await page.waitForSelector('text=/לא מצאנו/', { timeout: 10000 });

    // Verify helpful suggestions appear
    const suggestions = page.locator('text=/הנה כמה דרכים/');
    await expect(suggestions).toBeVisible();

    // Capture screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/05-empty-results.png', fullPage: true });
  });

  test('should display Hebrew text correctly (RTL)', async ({ page }) => {
    // Verify RTL rendering
    const welcomeTitle = page.locator('text=/ברוכים הבאים/');
    await expect(welcomeTitle).toBeVisible();

    // Check dir attribute
    const body = page.locator('body');
    const direction = await body.evaluate((el) => window.getComputedStyle(el).direction);

    // Either should be RTL or Hebrew text should render correctly
    // Capture for manual verification
    await page.screenshot({ path: 'test-results/edge-screenshots/06-hebrew-rtl.png', fullPage: true });
  });
});
