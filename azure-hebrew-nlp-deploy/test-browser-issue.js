// Using built-in fetch in Node.js 18+

const BASE_URL = 'http://localhost:5052';

console.log('Testing browser vs curl behavior...\n');

// Test 1: Curl-style request (what works)
async function testCurlStyle() {
  console.log('1. Testing curl-style request for CSS:');
  try {
    const response = await fetch(`${BASE_URL}/assets/index-DyY3J5xT.css`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    const text = await response.text();
    console.log(`   First 50 chars: ${text.substring(0, 50)}...`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

// Test 2: Browser-style request (what fails)
async function testBrowserStyle() {
  console.log('\n2. Testing browser-style request for CSS with cookies:');
  try {
    const response = await fetch(`${BASE_URL}/assets/index-DyY3J5xT.css`, {
      headers: {
        'Accept': 'text/css,*/*;q=0.1',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'ARRAffinity=abc123; ARRAffinitySameSite=abc123',
        'Referer': BASE_URL,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    const text = await response.text();
    console.log(`   First 50 chars: ${text.substring(0, 50)}...`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

// Test 3: Multiple concurrent requests (browser behavior)
async function testConcurrentRequests() {
  console.log('\n3. Testing concurrent requests (browser behavior):');

  const assets = [
    '/assets/index-DMjTUcI8.js',
    '/assets/index-DyY3J5xT.css',
    '/vite.svg'
  ];

  const promises = assets.map(async (path) => {
    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        headers: {
          'Cookie': 'ARRAffinity=abc123',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      return {
        path,
        status: response.status,
        contentType: response.headers.get('content-type')
      };
    } catch (err) {
      return { path, error: err.message };
    }
  });

  const results = await Promise.all(promises);
  results.forEach(r => {
    if (r.error) {
      console.log(`   ${r.path}: ERROR - ${r.error}`);
    } else {
      console.log(`   ${r.path}: ${r.status} - ${r.contentType}`);
    }
  });
}

// Test 4: Check if HTML is returned for static files
async function testErrorResponse() {
  console.log('\n4. Testing if HTML error page is returned:');
  try {
    const response = await fetch(`${BASE_URL}/assets/nonexistent.css`, {
      headers: {
        'Accept': 'text/css',
        'Cookie': 'ARRAffinity=test'
      }
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    const text = await response.text();
    const isHTML = text.includes('<!DOCTYPE') || text.includes('<html');
    console.log(`   Is HTML?: ${isHTML}`);
    if (isHTML) {
      console.log('   ⚠️  Server returns HTML for missing CSS files!');
    }
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

// Run all tests
async function runTests() {
  await testCurlStyle();
  await testBrowserStyle();
  await testConcurrentRequests();
  await testErrorResponse();

  console.log('\n5. Testing actual index.html request:');
  try {
    const response = await fetch(BASE_URL);
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
  } catch (err) {
    console.log(`   ERROR: ${err.message}`);
  }
}

runTests().catch(console.error);