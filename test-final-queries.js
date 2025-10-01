import { chromium } from 'playwright';

async function testFinalQueries() {
  console.log('🎯 Testing Final Query Fixes');

  const browser = await chromium.launch({
    headless: false,
    channel: 'msedge',
    args: ['--disable-web-security']
  });

  const page = await browser.newContext().then(c => c.newPage());

  try {
    await page.goto('https://wonder-ceo-web.azurewebsites.net');
    await page.waitForTimeout(5000);

    // Click "Chat Only" button to get clean interface
    await page.click('text=Chat Only');
    await page.waitForTimeout(2000);

    const input = page.locator('input[placeholder*="Ask me"]');

    console.log('\n📋 Test 1: Tel Aviv Query');
    await input.fill("Who's available today at 3pm in Tel Aviv?");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'final-test-1.png', fullPage: true });

    console.log('\n📋 Test 2: Wound Care Query');
    await input.fill("I need wound care specialists urgently");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'final-test-2.png', fullPage: true });

    console.log('\n📋 Test 3: Medication Query');
    await input.fill("Find 5 nurses for medication management");
    await page.keyboard.press('Enter');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'final-test-3.png', fullPage: true });

    console.log('\n✅ All tests completed - check screenshots');

  } finally {
    await browser.close();
  }
}

testFinalQueries().catch(console.error);