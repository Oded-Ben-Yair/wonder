#!/usr/bin/env node

/**
 * Debug script to examine actual API response structures
 */

import https from 'https';

async function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'wonder-backend-api.azurewebsites.net',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Wonder-API-Debug/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            rawBody: body
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function debugAPI() {
  console.log('=== Debugging API Responses ===\n');

  // Test Health endpoint
  console.log('1. Health Endpoint (/health):');
  try {
    const healthResponse = await makeRequest('GET', '/health');
    console.log('Status:', healthResponse.statusCode);
    console.log('Response:', JSON.stringify(healthResponse.body, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Engines endpoint
  console.log('2. Engines Endpoint (/engines):');
  try {
    const enginesResponse = await makeRequest('GET', '/engines');
    console.log('Status:', enginesResponse.statusCode);
    console.log('Response:', JSON.stringify(enginesResponse.body, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Match endpoint with basic query
  console.log('3. Match Endpoint (/match) - Basic Query:');
  try {
    const matchResponse = await makeRequest('POST', '/match', { city: 'Tel Aviv' });
    console.log('Status:', matchResponse.statusCode);
    console.log('Response:', JSON.stringify(matchResponse.body, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Match endpoint with more specific query
  console.log('4. Match Endpoint (/match) - Specific Query:');
  try {
    const matchResponse = await makeRequest('POST', '/match', {
      city: 'Tel Aviv',
      servicesQuery: ['wound care'],
      topK: 5
    });
    console.log('Status:', matchResponse.statusCode);
    console.log('Response:', JSON.stringify(matchResponse.body, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Match endpoint with empty body to see error response
  console.log('5. Match Endpoint (/match) - Empty Body:');
  try {
    const matchResponse = await makeRequest('POST', '/match', {});
    console.log('Status:', matchResponse.statusCode);
    console.log('Response:', JSON.stringify(matchResponse.body, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

debugAPI().catch(console.error);