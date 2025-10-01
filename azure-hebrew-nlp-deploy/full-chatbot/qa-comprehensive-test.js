const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const TEST_URL = 'https://wonder-ceo-web.azurewebsites.net';
const SCREENSHOT_DIR = path.join(__dirname, 'qa-test-screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const testResults = {
  pageLoad: { status: '❌', details: [] },
  uiElements: { status: '❌', details: [] },
  chatInterface: { status: '❌', details: [] },
  hebrewQuery: { status: '❌', details: [] },
  interactiveCards: { status: '❌', details: [] },
  userFriendlyContent: { status: '❌', details: [] },
  screenshots: []
};

async function runTests() {
  console.log('🧪 Starting Comprehensive QA Test Suite');
  console.log('🌐 Target: ' + TEST_URL);
  console.log('📸 Screenshots will be saved to: ' + SCREENSHOT_DIR);
  console.log('=' .repeat(80));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    // ===== TEST 1: PAGE LOAD =====
    console.log('\n📋 TEST 1: PAGE LOAD');
    console.log('-'.repeat(80));

    const loadStartTime = Date.now();
    const response = await page.goto(TEST_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    const loadTime = Date.now() - loadStartTime;

    const status = response.status();
    testResults.pageLoad.details.push(`HTTP Status: ${status}`);
    testResults.pageLoad.details.push(`Load Time: ${loadTime}ms`);

    if (status === 200 && loadTime < 10000) {
      testResults.pageLoad.status = '✅';
      console.log(`✅ Page loaded successfully (${loadTime}ms, HTTP ${status})`);
    } else {
      console.log(`❌ Page load issues (${loadTime}ms, HTTP ${status})`);
    }

    // Take initial screenshot
    const screenshot1 = path.join(SCREENSHOT_DIR, '01-initial-page-load.png');
    await page.screenshot({ path: screenshot1, fullPage: true });
    testResults.screenshots.push(screenshot1);
    console.log(`📸 Screenshot saved: ${screenshot1}`);

    // ===== TEST 2: UI ELEMENTS =====
    console.log('\n📋 TEST 2: UI ELEMENTS');
    console.log('-'.repeat(80));

    let uiScore = 0;
    let uiTotal = 0;

    // Check header
    uiTotal++;
    const header = await page.locator('text=/Wonder Healthcare/i').first();
    if (await header.count() > 0) {
      uiScore++;
      testResults.uiElements.details.push('✅ Header "Wonder Healthcare" found');
      console.log('✅ Header "Wonder Healthcare" found');
    } else {
      testResults.uiElements.details.push('❌ Header "Wonder Healthcare" NOT found');
      console.log('❌ Header "Wonder Healthcare" NOT found');
    }

    // Check HIPAA badge
    uiTotal++;
    const hipaaBadge = await page.locator('text=/HIPAA/i').first();
    if (await hipaaBadge.count() > 0) {
      uiScore++;
      testResults.uiElements.details.push('✅ HIPAA badge found');
      console.log('✅ HIPAA badge found');
    } else {
      testResults.uiElements.details.push('❌ HIPAA badge NOT found');
      console.log('❌ HIPAA badge NOT found');
    }

    // Check 6,700+ Professionals text
    uiTotal++;
    const professionalsText = await page.locator('text=/6,700\\+.*Professional/i').first();
    if (await professionalsText.count() > 0) {
      uiScore++;
      testResults.uiElements.details.push('✅ "6,700+ Professionals" text found');
      console.log('✅ "6,700+ Professionals" text found');
    } else {
      testResults.uiElements.details.push('❌ "6,700+ Professionals" text NOT found');
      console.log('❌ "6,700+ Professionals" text NOT found');
    }

    // Check Live status indicator
    uiTotal++;
    const liveIndicator = await page.locator('text=/Live/i').first();
    if (await liveIndicator.count() > 0) {
      uiScore++;
      testResults.uiElements.details.push('✅ Live status indicator found');
      console.log('✅ Live status indicator found');
    } else {
      testResults.uiElements.details.push('❌ Live status indicator NOT found');
      console.log('❌ Live status indicator NOT found');
    }

    // Check for gradient styling
    uiTotal++;
    const bodyBg = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).background;
    });
    if (bodyBg.includes('gradient') || bodyBg.includes('linear')) {
      uiScore++;
      testResults.uiElements.details.push('✅ Gradient styling detected');
      console.log('✅ Gradient styling detected');
    } else {
      testResults.uiElements.details.push(`⚠️ No gradient detected (background: ${bodyBg.substring(0, 100)}...)`);
      console.log(`⚠️ No gradient detected`);
    }

    testResults.uiElements.status = (uiScore >= 4) ? '✅' : '❌';
    console.log(`📊 UI Elements Score: ${uiScore}/${uiTotal}`);

    // ===== TEST 3: CHAT INTERFACE =====
    console.log('\n📋 TEST 3: CHAT INTERFACE');
    console.log('-'.repeat(80));

    let chatScore = 0;
    let chatTotal = 0;

    // Check for input field
    chatTotal++;
    const chatInput = await page.locator('input[type="text"], textarea').first();
    if (await chatInput.count() > 0) {
      chatScore++;
      const placeholder = await chatInput.getAttribute('placeholder');
      testResults.chatInterface.details.push(`✅ Chat input found (placeholder: "${placeholder}")`);
      console.log(`✅ Chat input found (placeholder: "${placeholder}")`);

      // Check for Hebrew placeholder
      if (placeholder && /[\u0590-\u05FF]/.test(placeholder)) {
        chatScore++;
        testResults.chatInterface.details.push('✅ Hebrew placeholder text detected');
        console.log('✅ Hebrew placeholder text detected');
      } else {
        testResults.chatInterface.details.push('⚠️ No Hebrew placeholder detected');
        console.log('⚠️ No Hebrew placeholder detected');
      }
      chatTotal++;
    } else {
      testResults.chatInterface.details.push('❌ Chat input NOT found');
      console.log('❌ Chat input NOT found');
    }

    // Check for submit button
    chatTotal++;
    const submitButton = await page.locator('button[type="submit"], button:has-text("שלח"), button:has-text("Send")').first();
    if (await submitButton.count() > 0) {
      chatScore++;
      const buttonText = await submitButton.textContent();
      testResults.chatInterface.details.push(`✅ Submit button found (text: "${buttonText}")`);
      console.log(`✅ Submit button found`);
    } else {
      testResults.chatInterface.details.push('❌ Submit button NOT found');
      console.log('❌ Submit button NOT found');
    }

    testResults.chatInterface.status = (chatScore >= 2) ? '✅' : '❌';
    console.log(`📊 Chat Interface Score: ${chatScore}/${chatTotal}`);

    const screenshot2 = path.join(SCREENSHOT_DIR, '02-chat-interface.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    testResults.screenshots.push(screenshot2);
    console.log(`📸 Screenshot saved: ${screenshot2}`);

    // ===== TEST 4: HEBREW QUERY =====
    console.log('\n📋 TEST 4: HEBREW QUERY TEST');
    console.log('-'.repeat(80));

    const hebrewQuery = 'אני צריך אחות לטיפול בפצעים בתל אביב';
    console.log(`🔤 Typing query: "${hebrewQuery}"`);

    await chatInput.fill(hebrewQuery);
    await page.waitForTimeout(1000);

    const screenshot3 = path.join(SCREENSHOT_DIR, '03-query-entered.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    testResults.screenshots.push(screenshot3);
    console.log(`📸 Screenshot saved: ${screenshot3}`);

    console.log('🖱️  Clicking submit button...');
    await submitButton.click();

    console.log('⏳ Waiting for results (up to 15 seconds)...');
    try {
      // Wait for results to appear - look for nurse cards
      await page.waitForSelector('[class*="card"], [class*="result"], [class*="nurse"]', {
        timeout: 15000
      });

      await page.waitForTimeout(2000); // Give time for all results to render

      const screenshot4 = path.join(SCREENSHOT_DIR, '04-query-results.png');
      await page.screenshot({ path: screenshot4, fullPage: true });
      testResults.screenshots.push(screenshot4);
      console.log(`📸 Screenshot saved: ${screenshot4}`);

      // Check for nurse results
      const nurseCards = await page.locator('[class*="card"], [class*="result"], [class*="nurse"]').all();
      testResults.hebrewQuery.details.push(`✅ Found ${nurseCards.length} result elements`);
      console.log(`✅ Found ${nurseCards.length} result elements`);

      // Check for Hebrew names
      const pageContent = await page.content();
      const hasHebrewNames = /[\u0590-\u05FF]{2,}/.test(pageContent);
      if (hasHebrewNames) {
        testResults.hebrewQuery.details.push('✅ Hebrew text detected in results');
        console.log('✅ Hebrew text detected in results');
      } else {
        testResults.hebrewQuery.details.push('⚠️ No Hebrew text detected in results');
        console.log('⚠️ No Hebrew text detected in results');
      }

      if (nurseCards.length > 0) {
        testResults.hebrewQuery.status = '✅';
      } else {
        testResults.hebrewQuery.details.push('❌ No nurse result cards found');
        console.log('❌ No nurse result cards found');
      }

    } catch (error) {
      testResults.hebrewQuery.details.push(`❌ Timeout waiting for results: ${error.message}`);
      console.log(`❌ Timeout waiting for results: ${error.message}`);
    }

    // ===== TEST 5: INTERACTIVE CARDS =====
    console.log('\n📋 TEST 5: INTERACTIVE CARDS TEST');
    console.log('-'.repeat(80));

    try {
      // Find all nurse cards
      const cards = await page.locator('[class*="card"], [class*="result"], [class*="nurse"]').all();

      if (cards.length > 0) {
        console.log(`🔍 Found ${cards.length} cards, testing first card...`);

        const firstCard = cards[0];

        // Check if card is clickable (has pointer cursor or button role)
        const isClickable = await firstCard.evaluate(el => {
          const style = window.getComputedStyle(el);
          const role = el.getAttribute('role');
          return style.cursor === 'pointer' || role === 'button' || el.tagName === 'BUTTON';
        });

        if (isClickable) {
          testResults.interactiveCards.details.push('✅ Card has clickable styling/attributes');
          console.log('✅ Card has clickable styling/attributes');
        } else {
          testResults.interactiveCards.details.push('⚠️ Card does not appear clickable');
          console.log('⚠️ Card does not appear clickable');
        }

        // Try to click the card
        console.log('🖱️  Clicking first nurse card...');
        await firstCard.click();
        await page.waitForTimeout(2000); // Wait for any animations/expansions

        const screenshot5 = path.join(SCREENSHOT_DIR, '05-card-clicked.png');
        await page.screenshot({ path: screenshot5, fullPage: true });
        testResults.screenshots.push(screenshot5);
        console.log(`📸 Screenshot saved: ${screenshot5}`);

        // Check for drawer, modal, or expansion
        const hasDrawer = await page.locator('[class*="drawer"], [class*="modal"], [class*="expanded"]').count() > 0;
        const hasInsights = await page.locator('text=/AIMatchInsights/i, text=/Score/i, text=/Match/i').count() > 0;

        if (hasDrawer || hasInsights) {
          testResults.interactiveCards.details.push('✅ Interaction detected (drawer/modal/insights appeared)');
          console.log('✅ Interaction detected (drawer/modal/insights appeared)');
          testResults.interactiveCards.status = '✅';
        } else {
          testResults.interactiveCards.details.push('⚠️ No visible change after clicking');
          console.log('⚠️ No visible change after clicking');
        }

      } else {
        testResults.interactiveCards.details.push('❌ No cards available to test');
        console.log('❌ No cards available to test');
      }

    } catch (error) {
      testResults.interactiveCards.details.push(`❌ Error testing cards: ${error.message}`);
      console.log(`❌ Error testing cards: ${error.message}`);
    }

    // ===== TEST 6: USER-FRIENDLY CONTENT =====
    console.log('\n📋 TEST 6: USER-FRIENDLY CONTENT TEST');
    console.log('-'.repeat(80));

    const pageText = await page.content();

    let contentScore = 0;
    let contentTotal = 0;

    // Check for technical jargon (should NOT be present)
    contentTotal++;
    const hasTechnicalJargon = /WOUND_CARE|MEDICATION_ADMIN|VITAL_SIGNS|POST_OP/i.test(pageText);
    if (!hasTechnicalJargon) {
      contentScore++;
      testResults.userFriendlyContent.details.push('✅ No technical service codes visible');
      console.log('✅ No technical service codes visible (WOUND_CARE, etc.)');
    } else {
      testResults.userFriendlyContent.details.push('❌ Technical jargon found (WOUND_CARE, etc.)');
      console.log('❌ Technical jargon found (WOUND_CARE, etc.)');
    }

    // Check for numeric ID chains (should NOT be present)
    contentTotal++;
    const hasNumericIds = /\d{4}→\d{4}→\d{4}/.test(pageText);
    if (!hasNumericIds) {
      contentScore++;
      testResults.userFriendlyContent.details.push('✅ No technical ID chains visible');
      console.log('✅ No technical ID chains visible (6703→1043→1043)');
    } else {
      testResults.userFriendlyContent.details.push('❌ Technical ID chains found');
      console.log('❌ Technical ID chains found (6703→1043→1043)');
    }

    // Check for friendly service names
    contentTotal++;
    const hasFriendlyServices = /Wound Care|Medication|Vital Signs|Post-?Op/i.test(pageText);
    if (hasFriendlyServices) {
      contentScore++;
      testResults.userFriendlyContent.details.push('✅ Friendly service names found');
      console.log('✅ Friendly service names found (Wound Care, etc.)');
    } else {
      testResults.userFriendlyContent.details.push('⚠️ No friendly service names detected');
      console.log('⚠️ No friendly service names detected');
    }

    testResults.userFriendlyContent.status = (contentScore >= 2) ? '✅' : '❌';
    console.log(`📊 User-Friendly Content Score: ${contentScore}/${contentTotal}`);

    const screenshot6 = path.join(SCREENSHOT_DIR, '06-final-state.png');
    await page.screenshot({ path: screenshot6, fullPage: true });
    testResults.screenshots.push(screenshot6);
    console.log(`📸 Screenshot saved: ${screenshot6}`);

  } catch (error) {
    console.error('❌ Test suite error:', error);
    testResults.error = error.message;
  } finally {
    await browser.close();
  }

  // ===== FINAL REPORT =====
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE QA TEST REPORT');
  console.log('='.repeat(80));

  console.log('\n🎯 Test Results Summary:');
  console.log(`${testResults.pageLoad.status} 1. Page Load Test`);
  testResults.pageLoad.details.forEach(d => console.log(`   ${d}`));

  console.log(`\n${testResults.uiElements.status} 2. UI Elements Test`);
  testResults.uiElements.details.forEach(d => console.log(`   ${d}`));

  console.log(`\n${testResults.chatInterface.status} 3. Chat Interface Test`);
  testResults.chatInterface.details.forEach(d => console.log(`   ${d}`));

  console.log(`\n${testResults.hebrewQuery.status} 4. Hebrew Query Test`);
  testResults.hebrewQuery.details.forEach(d => console.log(`   ${d}`));

  console.log(`\n${testResults.interactiveCards.status} 5. Interactive Cards Test`);
  testResults.interactiveCards.details.forEach(d => console.log(`   ${d}`));

  console.log(`\n${testResults.userFriendlyContent.status} 6. User-Friendly Content Test`);
  testResults.userFriendlyContent.details.forEach(d => console.log(`   ${d}`));

  console.log('\n📸 Screenshots Captured:');
  testResults.screenshots.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));

  // Overall assessment
  const passedTests = [
    testResults.pageLoad.status,
    testResults.uiElements.status,
    testResults.chatInterface.status,
    testResults.hebrewQuery.status,
    testResults.interactiveCards.status,
    testResults.userFriendlyContent.status
  ].filter(s => s === '✅').length;

  console.log('\n' + '='.repeat(80));
  console.log(`🏆 OVERALL ASSESSMENT: ${passedTests}/6 tests passed`);

  if (passedTests === 6) {
    console.log('✅ EXCELLENT: All UX/UI improvements are working perfectly!');
  } else if (passedTests >= 4) {
    console.log('⚠️  GOOD: Most improvements are working, some issues need attention');
  } else {
    console.log('❌ NEEDS WORK: Significant issues detected, UX/UI improvements not fully deployed');
  }
  console.log('='.repeat(80));

  // Save results to JSON
  const resultsFile = path.join(SCREENSHOT_DIR, 'test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Full results saved to: ${resultsFile}`);
}

runTests().catch(console.error);
