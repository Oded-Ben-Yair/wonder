import { chromium } from 'playwright';

async function testPolishedSystem() {
  console.log('🎯 FINAL QA TEST: Polished Wonder Healthcare Platform');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--disable-web-security']
  });

  const page = await browser.newContext().then(c => c.newPage());

  try {
    console.log('\n📋 Test 1: Pure Chat Interface (No Tabs)');
    await page.goto('https://wonder-ceo-web.azurewebsites.net');
    await page.waitForTimeout(3000);

    // Verify no tabs are visible
    const chatOnlyButton = await page.locator('text=Chat Only').count();
    const splitViewButton = await page.locator('text=Split View').count();
    const testOnlyButton = await page.locator('text=Test Only').count();

    console.log(`❌ Chat Only button: ${chatOnlyButton === 0 ? 'REMOVED ✅' : 'STILL VISIBLE ❌'}`);
    console.log(`❌ Split View button: ${splitViewButton === 0 ? 'REMOVED ✅' : 'STILL VISIBLE ❌'}`);
    console.log(`❌ Test Only button: ${testOnlyButton === 0 ? 'REMOVED ✅' : 'STILL VISIBLE ❌'}`);

    await page.screenshot({ path: 'qa-test-1-pure-interface.png', fullPage: true });

    console.log('\n📋 Test 2: Professional Nurse Names');
    const input = page.locator('input[placeholder*="Ask me"]');
    await input.fill("Who's available today at 3pm in Tel Aviv?");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'qa-test-2-professional-names.png', fullPage: true });

    // Check if we can see professional names in the chat
    const chatContent = await page.textContent('.chat-bubble.bot');
    const hasGenericNames = chatContent && chatContent.includes('Nurse 0127d89a');
    const hasProfessionalNames = chatContent && (
      chatContent.includes('Rachel') ||
      chatContent.includes('David') ||
      chatContent.includes('Sarah') ||
      chatContent.includes('Pearl') ||
      chatContent.includes('Cohen')
    );

    console.log(`Professional Names: ${hasProfessionalNames ? '✅ WORKING' : '❌ STILL GENERIC'}`);
    console.log(`Generic Names: ${hasGenericNames ? '❌ STILL PRESENT' : '✅ REMOVED'}`);

    console.log('\n📋 Test 3: Fixed Rating Display');
    const hasMatchPercentage = chatContent && chatContent.match(/\d+% match/);
    const hasNaNPercentage = chatContent && chatContent.includes('NaN%');
    const hasStarRating = chatContent && chatContent.includes('⭐');

    console.log(`Match Percentages: ${hasMatchPercentage ? '✅ WORKING' : '❌ NOT SHOWING'}`);
    console.log(`NaN Errors: ${hasNaNPercentage ? '❌ STILL PRESENT' : '✅ FIXED'}`);
    console.log(`Star Ratings: ${hasStarRating ? '✅ SHOWING' : '❌ MISSING'}`);

    console.log('\n📋 Test 4: Additional Queries');
    await input.fill("I need wound care specialists urgently");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'qa-test-3-wound-care.png', fullPage: true });

    await input.fill("Find 5 nurses for medication management");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(8000);
    await page.screenshot({ path: 'qa-test-4-medication.png', fullPage: true });

    console.log('\n📋 Test 5: Mobile Responsiveness');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'qa-test-5-mobile.png', fullPage: true });

    console.log('\n📋 Test 6: Professional Appearance Check');
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'qa-test-6-final-desktop.png', fullPage: true });

    console.log('\n🎉 QA TESTING COMPLETED!');
    console.log('📸 Screenshots saved:');
    console.log('  - qa-test-1-pure-interface.png');
    console.log('  - qa-test-2-professional-names.png');
    console.log('  - qa-test-3-wound-care.png');
    console.log('  - qa-test-4-medication.png');
    console.log('  - qa-test-5-mobile.png');
    console.log('  - qa-test-6-final-desktop.png');

  } finally {
    await browser.close();
  }
}

testPolishedSystem().catch(console.error);