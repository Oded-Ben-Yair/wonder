const puppeteer = require('puppeteer');
const fs = require('fs');

const QUERIES = [
  {
    id: 1,
    text: "אני צריך אחות לטיפול בפצעים בתל אביב",
    expectedCity: "Tel Aviv",
    description: "wound care Tel Aviv"
  },
  {
    id: 2,
    text: "מי זמינה היום בשעה 15:00 בתל אביב?",
    expectedCity: "Tel Aviv",
    description: "available today 3pm Tel Aviv"
  },
  {
    id: 3,
    text: "חפש אחות למתן תרופות בחיפה",
    expectedCity: "Haifa",
    description: "medication Haifa"
  },
  {
    id: 4,
    text: "אחות דחוף לטיפול בפצע ברמת גן",
    expectedCity: "Ramat Gan",
    description: "urgent wound care Ramat Gan"
  },
  {
    id: 5,
    text: "מצא 5 אחיות בנתניה",
    expectedCity: "Netanya",
    description: "find 5 nurses Netanya"
  },
  {
    id: 6,
    text: "אחות לטיפול בקשישים בירושלים",
    expectedCity: "Jerusalem",
    description: "elderly care Jerusalem"
  },
  {
    id: 7,
    text: "מי יכולה להגיע היום לפתח תקווה?",
    expectedCity: "Petach Tikva",
    description: "available today Petach Tikva"
  },
  {
    id: 8,
    text: "צריך אחות לבדיקת לחץ דם בראשון לציון",
    expectedCity: "Rishon Lezion",
    description: "blood pressure Rishon Lezion"
  }
];

async function testQuery(browser, query) {
  const page = await browser.newPage();
  const results = {
    queryId: query.id,
    queryText: query.text,
    description: query.description,
    expectedCity: query.expectedCity,
    actualCity: null,
    nurseNameSent: null,
    resultsCount: 0,
    hebrewNamesFound: false,
    status: 'FAIL',
    error: null,
    networkRequest: null,
    response: null
  };

  try {
    console.log(`\n[Query ${query.id}] Testing: "${query.text}" (${query.description})`);

    // Capture network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/match')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    const responses = [];
    page.on('response', async response => {
      if (response.url().includes('/match')) {
        try {
          const json = await response.json();
          responses.push({
            status: response.status(),
            data: json
          });
        } catch (e) {
          responses.push({
            status: response.status(),
            error: e.message
          });
        }
      }
    });

    // Navigate to the site
    await page.goto('https://wonder-ceo-web.azurewebsites.net', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log(`[Query ${query.id}] Page loaded`);

    // Wait for chat interface
    await page.waitForSelector('textarea, input[type="text"]', { timeout: 10000 });

    // Find the input field
    const input = await page.$('textarea') || await page.$('input[type="text"]');
    if (!input) {
      throw new Error('Could not find input field');
    }

    // Clear and type the query
    await input.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await input.type(query.text);
    console.log(`[Query ${query.id}] Query entered`);

    // Submit (look for send button or press Enter)
    const sendButton = await page.$('button[type="submit"]') || 
                       await page.$('button:has-text("שלח")') ||
                       await page.$('button:has-text("Send")');
    
    if (sendButton) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log(`[Query ${query.id}] Query submitted`);

    // Wait for response
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check network request
    if (requests.length > 0) {
      const matchRequest = requests[requests.length - 1];
      results.networkRequest = matchRequest;
      
      if (matchRequest.postData) {
        try {
          const postData = JSON.parse(matchRequest.postData);
          results.actualCity = postData.city || postData.municipality || null;
          results.nurseNameSent = postData.nurseName || postData.name || null;
          console.log(`[Query ${query.id}] Request data:`, JSON.stringify(postData, null, 2));
        } catch (e) {
          console.log(`[Query ${query.id}] Could not parse POST data`);
        }
      }
    }

    // Check response
    if (responses.length > 0) {
      const matchResponse = responses[responses.length - 1];
      results.response = matchResponse;
      
      if (matchResponse.data && matchResponse.data.matches) {
        results.resultsCount = matchResponse.data.matches.length;
        console.log(`[Query ${query.id}] Results count: ${results.resultsCount}`);
        
        // Check for Hebrew names
        if (results.resultsCount > 0) {
          const firstMatch = matchResponse.data.matches[0];
          const hasHebrewName = /[\u0590-\u05FF]/.test(firstMatch.name || firstMatch.nurseName || '');
          results.hebrewNamesFound = hasHebrewName;
          console.log(`[Query ${query.id}] Hebrew names found: ${hasHebrewName}`);
          console.log(`[Query ${query.id}] First nurse: ${firstMatch.name || firstMatch.nurseName}`);
        }
      }
    }

    // Take screenshot
    await page.screenshot({ 
      path: `/home/odedbe/wonder/test-results/query-${query.id}-screenshot.png`,
      fullPage: true 
    });

    // Determine status
    const cityMatches = results.actualCity && 
                       (results.actualCity.toLowerCase().includes(query.expectedCity.toLowerCase()) ||
                        query.expectedCity.toLowerCase().includes(results.actualCity.toLowerCase()));
    const noNurseName = results.nurseNameSent === null || results.nurseNameSent === undefined;
    const hasResults = results.resultsCount > 0;

    if (cityMatches && noNurseName && hasResults) {
      results.status = 'PASS';
    } else {
      results.status = 'FAIL';
      if (!cityMatches) results.error = 'City mismatch';
      if (!noNurseName) results.error = 'nurseName was sent';
      if (!hasResults) results.error = 'No results returned';
    }

    console.log(`[Query ${query.id}] Status: ${results.status}`);

  } catch (error) {
    results.error = error.message;
    results.status = 'ERROR';
    console.error(`[Query ${query.id}] Error:`, error.message);
    
    try {
      await page.screenshot({ 
        path: `/home/odedbe/wonder/test-results/query-${query.id}-error.png`,
        fullPage: true 
      });
    } catch (e) {}
  } finally {
    await page.close();
  }

  return results;
}

async function main() {
  console.log('Starting Hebrew Query Tests...\n');
  console.log('Target: https://wonder-ceo-web.azurewebsites.net');
  console.log('Queries to test: 8\n');

  // Create results directory
  if (!fs.existsSync('/home/odedbe/wonder/test-results')) {
    fs.mkdirSync('/home/odedbe/wonder/test-results');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const allResults = [];

  for (const query of QUERIES) {
    const result = await testQuery(browser, query);
    allResults.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait between queries
  }

  await browser.close();

  // Generate summary table
  console.log('\n\n' + '='.repeat(80));
  console.log('HEBREW QUERY TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log('| Query # | Description | City Extracted | Expected | Results | Hebrew | Status |');
  console.log('|---------|-------------|----------------|----------|---------|--------|--------|');

  allResults.forEach(r => {
    const city = r.actualCity || 'N/A';
    const results = r.resultsCount || 0;
    const hebrew = r.hebrewNamesFound ? 'Yes' : 'No';
    const status = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`| ${r.queryId} | ${r.description.substring(0, 20).padEnd(20)} | ${city.padEnd(14)} | ${r.expectedCity.padEnd(8)} | ${results.toString().padEnd(7)} | ${hebrew.padEnd(6)} | ${status} |`);
  });

  // Summary statistics
  const passCount = allResults.filter(r => r.status === 'PASS').length;
  const failCount = allResults.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;
  const successRate = ((passCount / allResults.length) * 100).toFixed(1);

  console.log('\n' + '-'.repeat(80));
  console.log(`Total Queries: ${allResults.length}`);
  console.log(`Passed: ${passCount} ✅`);
  console.log(`Failed: ${failCount} ❌`);
  console.log(`Success Rate: ${successRate}%`);
  console.log('-'.repeat(80) + '\n');

  // Detailed failures
  const failures = allResults.filter(r => r.status !== 'PASS');
  if (failures.length > 0) {
    console.log('\nFAILURE DETAILS:\n');
    failures.forEach(f => {
      console.log(`Query ${f.queryId}: "${f.queryText}"`);
      console.log(`  Expected City: ${f.expectedCity}`);
      console.log(`  Actual City: ${f.actualCity || 'N/A'}`);
      console.log(`  Results Count: ${f.resultsCount}`);
      console.log(`  nurseName Sent: ${f.nurseNameSent || 'N/A'}`);
      console.log(`  Error: ${f.error || 'N/A'}`);
      console.log(`  Screenshot: test-results/query-${f.queryId}-screenshot.png`);
      console.log('');
    });
  }

  // Save detailed results to JSON
  fs.writeFileSync(
    '/home/odedbe/wonder/test-results/hebrew-queries-results.json',
    JSON.stringify(allResults, null, 2)
  );

  console.log('Detailed results saved to: test-results/hebrew-queries-results.json\n');
}

main().catch(console.error);
