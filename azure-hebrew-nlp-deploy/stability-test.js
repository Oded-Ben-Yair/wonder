const https = require('https');

console.log('Testing Azure App Stability...\n');

const testUrl = 'https://wonder-hebrew-works.azurewebsites.net/health';
let successCount = 0;
let failCount = 0;

function makeRequest(num) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    https.get(testUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        if (res.statusCode === 200) {
          successCount++;
          console.log(`✅ Request #${num}: ${res.statusCode} - ${elapsed}ms`);
        } else {
          failCount++;
          console.log(`❌ Request #${num}: ${res.statusCode} - ${elapsed}ms`);
        }
        resolve();
      });
    }).on('error', (err) => {
      failCount++;
      console.log(`❌ Request #${num}: Error - ${err.message}`);
      resolve();
    });
  });
}

async function runTests() {
  // Test 10 requests with delays
  console.log('Testing 10 requests with 2-second intervals...\n');

  for (let i = 1; i <= 10; i++) {
    await makeRequest(i);
    if (i < 10) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${successCount} successful, ${failCount} failed`);

  if (failCount === 0) {
    console.log('✅ App is stable - All requests successful!');
  } else {
    console.log('⚠️  Some requests failed - may need investigation');
  }
}

runTests();