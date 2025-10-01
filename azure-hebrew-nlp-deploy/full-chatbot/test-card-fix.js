const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  const results = {
    cardInteractivity: false,
    aiInsightsVisible: false,
    chevronAnimation: false,
    consoleErrors: []
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      results.consoleErrors.push(msg.text());
      console.log('❌ Console error:', msg.text());
    }
  });

  try {
    console.log('Step 1: Navigate to https://wonder-ceo-web.azurewebsites.net');
    await page.goto('https://wonder-ceo-web.azurewebsites.net', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log('Step 2: Wait for page load (3 seconds)...');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-card-1-initial.png', fullPage: true });
    console.log('📸 Screenshot saved: test-card-1-initial.png');

    console.log('Step 3: Submit Hebrew query...');
    const hebrewQuery = 'אני צריך אחות לטיפול בפצעים בתל אביב';

    // Find input - try multiple selectors
    let input = await page.locator('input[type="text"]').first().elementHandle();
    if (!input) {
      input = await page.locator('textarea').first().elementHandle();
    }
    if (!input) {
      input = await page.locator('input').first().elementHandle();
    }

    if (input) {
      await page.locator('input, textarea').first().fill(hebrewQuery);
      console.log('✅ Query entered:', hebrewQuery);
      await page.waitForTimeout(1000);

      // Find and click submit button
      const submitBtn = await page.locator('button:has-text("Send"), button:has-text("שלח"), button[type="submit"]').first();
      await submitBtn.click();
      console.log('✅ Submit button clicked');
    } else {
      console.log('⚠️  Could not find input field, trying alternative approach...');
    }

    console.log('Step 4: Wait for nurse results (5 seconds)...');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-card-2-results.png', fullPage: true });
    console.log('📸 Screenshot saved: test-card-2-results.png');

    console.log('Step 5: CRITICAL TEST - Click first nurse card...');

    // Find nurse cards - try multiple approaches
    const cardSelectors = [
      '[data-testid="nurse-card"]',
      '[class*="NurseCard"]',
      '[class*="nurse-card"]',
      'div[role="button"]',
      'article',
      'div > div > div' // Generic card structure
    ];

    let firstCard = null;
    for (const selector of cardSelectors) {
      const cards = await page.locator(selector).all();
      if (cards.length > 0) {
        firstCard = cards[0];
        console.log(`✅ Found ${cards.length} cards using selector: ${selector}`);
        break;
      }
    }

    if (!firstCard) {
      console.log('⚠️  Trying to find any clickable card element...');
      // Get all divs and find ones with onClick or cursor pointer
      const allDivs = await page.locator('div').all();
      for (const div of allDivs) {
        const cursor = await div.evaluate(el => window.getComputedStyle(el).cursor);
        if (cursor === 'pointer') {
          firstCard = div;
          console.log('✅ Found clickable div');
          break;
        }
      }
    }

    if (firstCard) {
      console.log('✅ Found first card, attempting click...');

      // Get initial HTML to compare
      const initialHTML = await firstCard.innerHTML();
      const initialHeight = await firstCard.boundingBox();
      console.log('Initial card height:', initialHeight?.height || 'unknown');

      // Click the card
      await firstCard.click();
      console.log('✅ Card clicked');
      await page.waitForTimeout(2000);

      console.log('Step 6: Verify expanded state...');

      await page.screenshot({ path: 'test-card-3-expanded.png', fullPage: true });
      console.log('📸 Screenshot saved: test-card-3-expanded.png');

      // Check for expanded content
      const expandedHTML = await firstCard.innerHTML();
      const expandedHeight = await firstCard.boundingBox();
      console.log('Expanded card height:', expandedHeight?.height || 'unknown');

      // Check if content changed
      const contentChanged = expandedHTML !== initialHTML;
      const heightIncreased = expandedHeight && initialHeight && expandedHeight.height > initialHeight.height;

      results.cardInteractivity = contentChanged || heightIncreased;
      console.log('Card expanded:', results.cardInteractivity ? '✅' : '❌');

      // Look for specific expanded content
      const pageContent = await page.content();
      const hasSpecializations = pageContent.includes('Specialization') || pageContent.includes('התמחות');
      const hasLocations = pageContent.includes('Location') || pageContent.includes('מיקום');
      const hasInsights = pageContent.includes('AI') || pageContent.includes('Score') || pageContent.includes('ניקוד');

      console.log('Specializations visible:', hasSpecializations ? '✅' : '❌');
      console.log('Locations visible:', hasLocations ? '✅' : '❌');
      console.log('AI Insights visible:', hasInsights ? '✅' : '❌');

      results.aiInsightsVisible = hasInsights;

      // Check for chevron icons
      const chevronDown = await page.locator('svg').filter({ hasText: /down/i }).count();
      const chevronUp = await page.locator('svg').filter({ hasText: /up/i }).count();
      results.chevronAnimation = chevronDown > 0 || chevronUp > 0;

      console.log('Step 7: Chevron icon check...');
      console.log('Chevron animation working:', results.chevronAnimation ? '✅' : '❌');

      console.log('Step 8: Click card again to collapse...');
      await firstCard.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-card-4-collapsed.png', fullPage: true });
      console.log('📸 Screenshot saved: test-card-4-collapsed.png');

      const collapsedHeight = await firstCard.boundingBox();
      console.log('Collapsed card height:', collapsedHeight?.height || 'unknown');

    } else {
      console.log('❌ Could not find any nurse card to test');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'test-card-error.png', fullPage: true });
  }

  // Final report
  console.log('\n=== FINAL TEST RESULTS ===');
  console.log('Card Interactivity:', results.cardInteractivity ? '✅ WORKING' : '❌ FAILED');
  console.log('AI Match Insights:', results.aiInsightsVisible ? '✅ VISIBLE' : '❌ NOT VISIBLE');
  console.log('Chevron Animation:', results.chevronAnimation ? '✅ WORKING' : '❌ NOT WORKING');
  console.log('Console Errors:', results.consoleErrors.length === 0 ? '✅ NONE' : `❌ ${results.consoleErrors.length} errors`);

  if (results.consoleErrors.length > 0) {
    console.log('\nConsole Errors:');
    results.consoleErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
  }

  console.log('\nScreenshots saved:');
  console.log('  - test-card-1-initial.png (initial page load)');
  console.log('  - test-card-2-results.png (after query submission)');
  console.log('  - test-card-3-expanded.png (card expanded)');
  console.log('  - test-card-4-collapsed.png (card collapsed again)');

  await browser.close();

  // Exit with success/failure code
  const allTestsPassed = results.cardInteractivity && results.aiInsightsVisible;
  process.exit(allTestsPassed ? 0 : 1);
})();
