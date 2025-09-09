import { chromium } from 'playwright';

async function testChatbot() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Add console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser error:', msg.text());
    }
  });
  
  page.on('requestfailed', request => {
    console.log('Request failed:', request.url(), request.failure());
  });
  
  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    console.log('Typing query in the chatbot input...');
    // The input field at the bottom of the chat
    const input = await page.locator('input[placeholder*="Ask me"]').first();
    await input.fill("Who's available today at 3pm in Tel Aviv?");
    
    console.log('Submitting query by pressing Enter...');
    // Press Enter to submit
    await input.press('Enter');
    
    console.log('Waiting for response...');
    await page.waitForTimeout(5000);
    
    console.log('Getting all text content from chatbot area...');
    // Get the entire chatbot panel content
    const chatContent = await page.locator('.space-y-4').first().textContent();
    console.log('Chat content length:', chatContent?.length);
    
    if (!chatContent) {
      console.log('No chat content found');
    } else if (chatContent.toLowerCase().includes('error')) {
      console.error('ERROR DETECTED in chat');
      console.log('Error context:', chatContent.substring(0, 500));
    } else if (chatContent.includes('found') || chatContent.includes('Nurse') || chatContent.includes('available')) {
      console.log('SUCCESS: Got nurse results without errors');
      
      // Count nurses mentioned
      const nurseMatches = chatContent.match(/Nurse \d+/g) || [];
      console.log(`Found ${nurseMatches.length} nurses mentioned`);
      
      // Look for the actual response pattern
      if (chatContent.includes('I found')) {
        console.log('Bot response detected - extraction successful');
      }
    } else {
      console.log('Response received but unclear if successful');
      console.log('Preview:', chatContent.substring(0, 300));
    }
    
    // Take a final screenshot
    await page.screenshot({ path: 'chatbot-test-result.png', fullPage: true });
    console.log('Screenshot saved as chatbot-test-result.png');
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'chatbot-test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testChatbot();