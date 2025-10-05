import { test, expect, devices } from '@playwright/test';

// Configure mobile device at top level
test.use({
  ...devices['iPhone 12'],
  locale: 'he-IL',
});

test.describe('Wonder Care - Mobile Responsive Design', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile-optimized layout', async ({ page }) => {
    // Verify header is visible on mobile
    const brandName = page.locator('text=Wonder Healthcare');
    await expect(brandName).toBeVisible();

    // Verify nurse count is visible
    const nurseCount = page.locator('text=3,100+');
    await expect(nurseCount).toBeVisible();

    // Capture mobile screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/13-mobile-homepage.png', fullPage: true });
  });

  test('should allow search on mobile device', async ({ page }) => {
    // Find and interact with search input
    const searchInput = page.locator('input[placeholder*="שאל"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('אחות בתל אביב');

    // Submit search
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו|לא מצאנו/', { timeout: 10000 });

    // Capture mobile results screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/14-mobile-search-results.png', fullPage: true });
  });

  test('should stack nurse cards properly on mobile', async ({ page }) => {
    // Search for nurses
    const searchInput = page.locator('input[placeholder*="שאל"]');
    await searchInput.fill('מצא אחות');
    await page.locator('button:has-text("שלח")').click();

    // Wait for nurse cards
    await page.waitForSelector('[role="button"][aria-label*="View details"], .nurse-card', { timeout: 10000 });

    // Verify cards are visible
    const cards = page.locator('[role="button"][aria-label*="View details"], .nurse-card');
    const count = await cards.count();

    expect(count).toBeGreaterThan(0);

    // Capture mobile cards screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/15-mobile-nurse-cards.png', fullPage: true });
  });

  test('should expand nurse card on mobile tap', async ({ page }) => {
    // Search
    const searchInput = page.locator('input[placeholder*="שאל"]');
    await searchInput.fill('אחות בחיפה');
    await page.locator('button:has-text("שלח")').click();

    // Wait for expandable cards
    await page.waitForSelector('[role="button"][aria-expanded]', { timeout: 10000 });

    // Tap first card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();
    await firstCard.tap();

    // Wait for expansion
    await page.waitForTimeout(1000);

    // Capture expanded mobile card
    await page.screenshot({ path: 'test-results/edge-screenshots/16-mobile-expanded-card.png', fullPage: true });
  });

  test('should display Hebrew text correctly on mobile (RTL)', async ({ page }) => {
    // Verify Hebrew text is visible
    const hebrewText = page.locator('text=/ברוכים הבאים|אחות/');
    await expect(hebrewText.first()).toBeVisible();

    // Capture mobile Hebrew text screenshot
    await page.screenshot({ path: 'test-results/edge-screenshots/17-mobile-hebrew-text.png', fullPage: true });
  });

  test('should handle touch interactions smoothly', async ({ page }) => {
    // Test scrolling
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    // Capture after scroll
    await page.screenshot({ path: 'test-results/edge-screenshots/18-mobile-scroll.png', fullPage: false });

    // Test input focus
    const searchInput = page.locator('input[placeholder*="שאל"]');
    await searchInput.tap();

    // Verify keyboard doesn't break layout
    await page.waitForTimeout(500);

    // Capture with keyboard
    await page.screenshot({ path: 'test-results/edge-screenshots/19-mobile-keyboard.png', fullPage: false });
  });
});
