// Test with exact browser headers from a real browser
const BASE_URL = 'https://wonder-ceo-web.azurewebsites.net';

async function testWithExactBrowserHeaders() {
  console.log('Testing with exact browser headers...\n');

  // These are the exact headers a browser sends
  const headers = {
    'Accept': 'text/css,*/*;q=0.1',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Referer': BASE_URL + '/',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'style',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  try {
    const response = await fetch(`${BASE_URL}/assets/index-DyY3J5xT.css`, { headers });
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    if (response.status === 500) {
      const text = await response.text();
      console.log('Error response:', text);
    } else {
      const text = await response.text();
      console.log(`Success - CSS length: ${text.length} bytes`);
    }
  } catch (err) {
    console.log(`ERROR: ${err.message}`);
  }
}

testWithExactBrowserHeaders().catch(console.error);