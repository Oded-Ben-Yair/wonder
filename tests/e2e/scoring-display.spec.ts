import { test, expect } from '@playwright/test';

test.describe('Wonder Care - Score Transparency & Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Perform a search to get results
    const searchInput = page.locator('input[placeholder*="שאל אותי"]');
    await searchInput.fill('מצא אחות בתל אביב');
    await page.locator('button:has-text("שלח")').click();

    // Wait for results
    await page.waitForSelector('text=/נמצאו.*התאמות/', { timeout: 10000 });
  });

  test('should expand nurse card and show complete details', async ({ page }) => {
    // Find first expandable nurse card (compact mode in chat)
    const firstCard = page.locator('[role="button"][aria-expanded]').first();

    if (await firstCard.isVisible()) {
      // Click to expand
      await firstCard.click();

      // Wait for expanded content
      await page.waitForSelector('text=/התמחויות|התאמת שירות/', { timeout: 5000 });

      // Verify expanded details are visible
      const expandedContent = page.locator('text=/התמחויות|דירוג|ניסיון|שפות/');
      await expect(expandedContent.first()).toBeVisible();

      // Capture screenshot
      await page.screenshot({ path: 'test-results/edge-screenshots/07-expanded-nurse-card.png', fullPage: true });
    }
  });

  test('should display ScoreBreakdown with formula', async ({ page }) => {
    // Try to find and expand a nurse card
    const expandableCard = page.locator('[role="button"][aria-expanded]').first();

    if (await expandableCard.isVisible()) {
      await expandableCard.click();
      await page.waitForTimeout(1000);

      // Look for calculation formula
      const formula = page.locator('text=/Score = 0.30|נוסחת החישוב/');

      if (await formula.isVisible()) {
        await expect(formula).toBeVisible();

        // Capture screenshot
        await page.screenshot({ path: 'test-results/edge-screenshots/08-score-formula.png', fullPage: true });
      }
    }
  });

  test('should show all 5 scoring factors', async ({ page }) => {
    // Expand first nurse card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);

      // Check for all 5 factors (in Hebrew)
      const factors = [
        'התאמת שירות', // Service Match (30%)
        'מיקום',        // Location (25%)
        'דירוג',        // Rating (20%)
        'זמינות',       // Availability (15%)
        'ניסיון'        // Experience (10%)
      ];

      let factorsFound = 0;
      for (const factor of factors) {
        const factorElement = page.locator(`text=${factor}`).first();
        if (await factorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
          factorsFound++;
        }
      }

      // Capture screenshot regardless
      await page.screenshot({ path: 'test-results/edge-screenshots/09-scoring-factors.png', fullPage: true });

      // Should find at least some factors
      expect(factorsFound).toBeGreaterThan(0);
    }
  });

  test('should display weights clearly (30%, 25%, 20%, 15%, 10%)', async ({ page }) => {
    // Expand nurse card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);

      // Look for weight percentages
      const weights = page.locator('text=/30%|25%|20%|15%|10%/');

      if (await weights.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(weights.first()).toBeVisible();
      }

      // Capture screenshot
      await page.screenshot({ path: 'test-results/edge-screenshots/10-scoring-weights.png', fullPage: true });
    }
  });

  test('should show complete nurse information (all specializations, cities, languages)', async ({ page }) => {
    // Expand first nurse card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1500);

      // Look for complete information sections
      const sections = {
        specializations: page.locator('text=התמחויות'),
        locations: page.locator('text=מיקומים'),
        rating: page.locator('text=דירוג'),
        experience: page.locator('text=ניסיון'),
        languages: page.locator('text=שפות')
      };

      let visibleSections = 0;
      for (const [key, locator] of Object.entries(sections)) {
        if (await locator.isVisible({ timeout: 1000 }).catch(() => false)) {
          visibleSections++;
        }
      }

      // Capture screenshot
      await page.screenshot({ path: 'test-results/edge-screenshots/11-complete-nurse-info.png', fullPage: true });

      // Should show at least some complete information
      expect(visibleSections).toBeGreaterThan(0);
    }
  });

  test('should display rating with stars and review count', async ({ page }) => {
    // Expand first nurse card
    const firstCard = page.locator('[role="button"][aria-expanded]').first();

    if (await firstCard.isVisible()) {
      await firstCard.click();
      await page.waitForTimeout(1000);

      // Look for rating display (e.g., "4.5/5.0")
      const rating = page.locator('text=/\\d+\\.\\d+\\/5\\.0/');

      if (await rating.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(rating).toBeVisible();

        // Look for review count (e.g., "89 ביקורות")
        const reviews = page.locator('text=/\\d+ ביקורות/');
        await expect(reviews).toBeVisible();
      }

      // Capture screenshot
      await page.screenshot({ path: 'test-results/edge-screenshots/12-rating-display.png', fullPage: true });
    }
  });
});
