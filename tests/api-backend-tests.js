#!/usr/bin/env node

/**
 * Comprehensive API Test Suite for Wonder Healthcare Platform Backend
 * Tests all endpoints: /health, /engines, /match with various scenarios
 * Measures performance, validates data integrity, and checks edge cases
 */

import https from 'https';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const BASE_URL = 'https://wonder-backend-api.azurewebsites.net';

class APITester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: [],
      performance: {},
      dataIntegrity: {}
    };
  }

  // HTTP request helper with timing
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const options = {
        hostname: 'wonder-backend-api.azurewebsites.net',
        port: 443,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Wonder-API-Test-Suite/1.0'
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
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          try {
            const parsedBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody,
              responseTime: responseTime,
              rawBody: body
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              responseTime: responseTime,
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

  // Test result logging
  logTest(name, passed, message, responseTime = null) {
    this.results.total++;
    const status = passed ? 'PASS' : 'FAIL';
    const color = passed ? colors.green : colors.red;
    const timeStr = responseTime ? ` (${responseTime}ms)` : '';

    console.log(`${color}${status}${colors.reset} ${name}${timeStr}`);
    if (message) {
      console.log(`     ${message}`);
    }

    this.results.tests.push({
      name,
      passed,
      message,
      responseTime
    });

    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
  }

  // Test Health Endpoint
  async testHealthEndpoint() {
    console.log(`\n${colors.bold}${colors.blue}=== Testing Health Endpoint ===${colors.reset}`);

    try {
      const response = await this.makeRequest('GET', '/health');

      // Test 1: Status Code
      this.logTest(
        'Health endpoint returns 200',
        response.statusCode === 200,
        `Got status: ${response.statusCode}`,
        response.responseTime
      );

      // Test 2: Response structure
      const hasStatus = response.body && typeof response.body.status === 'string';
      this.logTest(
        'Health response has status field',
        hasStatus,
        hasStatus ? `Status: "${response.body.status}"` : 'Missing status field'
      );

      // Test 3: Status is "healthy"
      const isHealthy = response.body && response.body.status === 'healthy';
      this.logTest(
        'Health status is "healthy"',
        isHealthy,
        isHealthy ? 'Service is healthy' : `Status: "${response.body?.status}"`
      );

      // Test 4: Nurses loaded count
      const hasNursesLoaded = response.body && typeof response.body.nursesLoaded === 'number';
      this.logTest(
        'Health response has nursesLoaded count',
        hasNursesLoaded,
        hasNursesLoaded ? `Loaded: ${response.body.nursesLoaded} nurses` : 'Missing nursesLoaded field'
      );

      // Test 5: Correct number of nurses (457)
      const correctCount = response.body && response.body.nursesLoaded === 457;
      this.logTest(
        'All 457 nurses are loaded',
        correctCount,
        correctCount ? 'Full dataset loaded' : `Expected 457, got ${response.body?.nursesLoaded}`
      );

      // Performance tracking
      this.results.performance.health = response.responseTime;

    } catch (error) {
      this.logTest(
        'Health endpoint accessible',
        false,
        `Error: ${error.message}`
      );
    }
  }

  // Test Engines Endpoint
  async testEnginesEndpoint() {
    console.log(`\n${colors.bold}${colors.blue}=== Testing Engines Endpoint ===${colors.reset}`);

    try {
      const response = await this.makeRequest('GET', '/engines');

      // Test 1: Status Code
      this.logTest(
        'Engines endpoint returns 200',
        response.statusCode === 200,
        `Got status: ${response.statusCode}`,
        response.responseTime
      );

      // Test 2: Response is array
      const isArray = Array.isArray(response.body);
      this.logTest(
        'Engines response is array',
        isArray,
        isArray ? `Found ${response.body.length} engines` : `Got type: ${typeof response.body}`
      );

      // Test 3: Has engines
      const hasEngines = isArray && response.body.length > 0;
      this.logTest(
        'At least one engine available',
        hasEngines,
        hasEngines ? `Engines: ${response.body.map(e => e.name || e.id || 'unknown').join(', ')}` : 'No engines found'
      );

      // Test 4: Engine structure validation
      if (isArray && response.body.length > 0) {
        const firstEngine = response.body[0];
        const hasValidStructure = firstEngine && (firstEngine.name || firstEngine.id);
        this.logTest(
          'Engine objects have valid structure',
          hasValidStructure,
          hasValidStructure ? `First engine: ${JSON.stringify(firstEngine)}` : 'Invalid engine structure'
        );
      }

      // Performance tracking
      this.results.performance.engines = response.responseTime;

    } catch (error) {
      this.logTest(
        'Engines endpoint accessible',
        false,
        `Error: ${error.message}`
      );
    }
  }

  // Test Match Endpoint with various scenarios
  async testMatchEndpoint() {
    console.log(`\n${colors.bold}${colors.blue}=== Testing Match Endpoint ===${colors.reset}`);

    const testCases = [
      {
        name: 'Basic Tel Aviv query',
        query: { city: 'Tel Aviv' },
        expectResults: true
      },
      {
        name: 'Tel Aviv with topK limit',
        query: { city: 'Tel Aviv', topK: 5 },
        expectResults: true
      },
      {
        name: 'Female gender filter',
        query: { city: 'Tel Aviv', gender: 'FEMALE', topK: 10 },
        expectResults: true
      },
      {
        name: 'Wound care service filter',
        query: { city: 'Tel Aviv', servicesQuery: ['wound care'], topK: 5 },
        expectResults: true
      },
      {
        name: 'Urgent flag test',
        query: { city: 'Tel Aviv', urgent: true, topK: 3 },
        expectResults: true
      },
      {
        name: 'Multiple services query',
        query: { city: 'Tel Aviv', servicesQuery: ['wound care', 'pediatrics'], topK: 5 },
        expectResults: true
      },
      {
        name: 'Large topK value (100)',
        query: { city: 'Tel Aviv', topK: 100 },
        expectResults: true
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`\n${colors.cyan}Testing: ${testCase.name}${colors.reset}`);
        const response = await this.makeRequest('POST', '/match', testCase.query);

        // Test status code
        this.logTest(
          `${testCase.name} - returns 200`,
          response.statusCode === 200,
          `Got status: ${response.statusCode}`,
          response.responseTime
        );

        // Test response structure
        const hasResults = response.body && Array.isArray(response.body.results);
        this.logTest(
          `${testCase.name} - has results array`,
          hasResults,
          hasResults ? `Found ${response.body.results.length} results` : 'Missing results array'
        );

        // Test expected results
        if (testCase.expectResults && hasResults) {
          const hasNurses = response.body.results.length > 0;
          this.logTest(
            `${testCase.name} - returns nurses`,
            hasNurses,
            hasNurses ? `Returned ${response.body.results.length} nurses` : 'No nurses returned'
          );

          // Validate nurse data structure
          if (hasNurses) {
            const firstNurse = response.body.results[0];
            const hasId = firstNurse && firstNurse.id;
            const hasName = firstNurse && (firstNurse.name || firstNurse.nurseName);
            const hasRating = firstNurse && typeof firstNurse.rating === 'number';

            this.logTest(
              `${testCase.name} - nurse has ID`,
              hasId,
              hasId ? `ID: ${firstNurse.id}` : 'Missing nurse ID'
            );

            this.logTest(
              `${testCase.name} - nurse has name`,
              hasName,
              hasName ? `Name: ${firstNurse.name || firstNurse.nurseName}` : 'Missing nurse name'
            );

            this.logTest(
              `${testCase.name} - nurse has rating`,
              hasRating,
              hasRating ? `Rating: ${firstNurse.rating}` : 'Missing or invalid rating'
            );

            // Store first successful query for data integrity analysis
            if (!this.results.dataIntegrity.sampleNurse) {
              this.results.dataIntegrity.sampleNurse = firstNurse;
              this.results.dataIntegrity.totalResults = response.body.results.length;
            }
          }
        }

        // Track performance
        if (!this.results.performance.match) {
          this.results.performance.match = [];
        }
        this.results.performance.match.push({
          name: testCase.name,
          time: response.responseTime
        });

      } catch (error) {
        this.logTest(
          `${testCase.name} - request successful`,
          false,
          `Error: ${error.message}`
        );
      }
    }
  }

  // Test Edge Cases
  async testEdgeCases() {
    console.log(`\n${colors.bold}${colors.blue}=== Testing Edge Cases ===${colors.reset}`);

    const edgeCases = [
      {
        name: 'Empty query object',
        query: {},
        expectError: true
      },
      {
        name: 'Invalid city name',
        query: { city: 'NonExistentCity123' },
        expectError: false // Should return empty results, not error
      },
      {
        name: 'Non-existent service',
        query: { city: 'Tel Aviv', servicesQuery: ['non-existent-service-xyz'] },
        expectError: false
      },
      {
        name: 'Invalid topK value (string)',
        query: { city: 'Tel Aviv', topK: 'invalid' },
        expectError: true
      },
      {
        name: 'Negative topK value',
        query: { city: 'Tel Aviv', topK: -5 },
        expectError: true
      },
      {
        name: 'Very large topK value (1000)',
        query: { city: 'Tel Aviv', topK: 1000 },
        expectError: false
      },
      {
        name: 'Missing required fields',
        query: { topK: 5 },
        expectError: true
      }
    ];

    for (const testCase of edgeCases) {
      try {
        console.log(`\n${colors.yellow}Testing edge case: ${testCase.name}${colors.reset}`);
        const response = await this.makeRequest('POST', '/match', testCase.query);

        if (testCase.expectError) {
          // Should return 400 or similar error status
          const isError = response.statusCode >= 400;
          this.logTest(
            `${testCase.name} - returns error status`,
            isError,
            `Got status: ${response.statusCode}`,
            response.responseTime
          );
        } else {
          // Should return 200 with empty or valid results
          const isSuccess = response.statusCode === 200;
          this.logTest(
            `${testCase.name} - handles gracefully`,
            isSuccess,
            `Got status: ${response.statusCode}, Results: ${response.body?.results?.length || 0}`,
            response.responseTime
          );
        }

      } catch (error) {
        // Network errors should only fail if we didn't expect an error
        this.logTest(
          `${testCase.name} - request handling`,
          testCase.expectError,
          `Network error: ${error.message}`
        );
      }
    }
  }

  // Performance Analysis
  async testPerformance() {
    console.log(`\n${colors.bold}${colors.blue}=== Performance Analysis ===${colors.reset}`);

    // Test response times for standard queries
    const performanceTests = [
      { name: 'Health endpoint', query: null, endpoint: '/health', method: 'GET' },
      { name: 'Simple match query', query: { city: 'Tel Aviv' }, endpoint: '/match', method: 'POST' },
      { name: 'Complex match query', query: { city: 'Tel Aviv', servicesQuery: ['wound care'], gender: 'FEMALE', urgent: true, topK: 10 }, endpoint: '/match', method: 'POST' }
    ];

    const performanceResults = [];

    for (const test of performanceTests) {
      const times = [];

      // Run each test 3 times to get average
      for (let i = 0; i < 3; i++) {
        try {
          const response = await this.makeRequest(test.method, test.endpoint, test.query);
          times.push(response.responseTime);
        } catch (error) {
          console.log(`Performance test failed: ${error.message}`);
        }
      }

      if (times.length > 0) {
        const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        performanceResults.push({
          name: test.name,
          avgTime,
          minTime,
          maxTime,
          samples: times.length
        });

        // Test if under 500ms threshold
        this.logTest(
          `${test.name} - under 500ms`,
          avgTime < 500,
          `Avg: ${avgTime}ms (min: ${minTime}ms, max: ${maxTime}ms)`
        );
      }
    }

    this.results.performance.detailed = performanceResults;
  }

  // Generate comprehensive report
  generateReport() {
    console.log(`\n${colors.bold}${colors.cyan}=== COMPREHENSIVE TEST REPORT ===${colors.reset}`);
    console.log(`${colors.bold}Test Execution Summary:${colors.reset}`);
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`${colors.green}Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.results.failed}${colors.reset}`);
    console.log(`Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

    console.log(`\n${colors.bold}Performance Metrics:${colors.reset}`);
    if (this.results.performance.health) {
      console.log(`Health Endpoint: ${this.results.performance.health}ms`);
    }
    if (this.results.performance.engines) {
      console.log(`Engines Endpoint: ${this.results.performance.engines}ms`);
    }
    if (this.results.performance.detailed) {
      this.results.performance.detailed.forEach(perf => {
        console.log(`${perf.name}: ${perf.avgTime}ms average (${perf.minTime}-${perf.maxTime}ms range)`);
      });
    }

    console.log(`\n${colors.bold}Data Integrity Analysis:${colors.reset}`);
    if (this.results.dataIntegrity.sampleNurse) {
      const nurse = this.results.dataIntegrity.sampleNurse;
      console.log(`Sample Nurse Data:`);
      console.log(`  ID: ${nurse.id || 'Missing'}`);
      console.log(`  Name: ${nurse.name || nurse.nurseName || 'Missing'}`);
      console.log(`  Rating: ${nurse.rating || 'Missing'}`);
      console.log(`  City: ${nurse.city || 'Missing'}`);
      console.log(`  Services: ${nurse.services ? JSON.stringify(nurse.services) : 'Missing'}`);
    }

    console.log(`\n${colors.bold}Failed Tests:${colors.reset}`);
    const failedTests = this.results.tests.filter(test => !test.passed);
    if (failedTests.length === 0) {
      console.log(`${colors.green}No failed tests!${colors.reset}`);
    } else {
      failedTests.forEach(test => {
        console.log(`${colors.red}❌ ${test.name}${colors.reset}`);
        if (test.message) {
          console.log(`   ${test.message}`);
        }
      });
    }

    console.log(`\n${colors.bold}Recommendations:${colors.reset}`);
    const successRate = (this.results.passed / this.results.total) * 100;
    if (successRate >= 95) {
      console.log(`${colors.green}✅ Excellent! API is functioning optimally.${colors.reset}`);
    } else if (successRate >= 80) {
      console.log(`${colors.yellow}⚠️  Good, but some issues found. Review failed tests.${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Multiple issues detected. Immediate attention required.${colors.reset}`);
    }

    // Performance recommendations
    const avgMatchTime = this.results.performance.match
      ? this.results.performance.match.reduce((sum, test) => sum + test.time, 0) / this.results.performance.match.length
      : 0;

    if (avgMatchTime > 1000) {
      console.log(`${colors.red}⚠️  Performance Issue: Match queries averaging ${Math.round(avgMatchTime)}ms (target: <500ms)${colors.reset}`);
    } else if (avgMatchTime > 500) {
      console.log(`${colors.yellow}⚠️  Performance Warning: Match queries averaging ${Math.round(avgMatchTime)}ms (target: <500ms)${colors.reset}`);
    } else if (avgMatchTime > 0) {
      console.log(`${colors.green}✅ Performance Good: Match queries averaging ${Math.round(avgMatchTime)}ms${colors.reset}`);
    }

    return this.results;
  }

  // Run all tests
  async runAllTests() {
    console.log(`${colors.bold}${colors.cyan}Wonder Healthcare Platform - API Test Suite${colors.reset}`);
    console.log(`${colors.bold}Testing Backend: ${BASE_URL}${colors.reset}`);
    console.log(`${colors.bold}Started at: ${new Date().toISOString()}${colors.reset}\n`);

    await this.testHealthEndpoint();
    await this.testEnginesEndpoint();
    await this.testMatchEndpoint();
    await this.testEdgeCases();
    await this.testPerformance();

    return this.generateReport();
  }
}

// Run tests if called directly
const tester = new APITester();
tester.runAllTests()
  .then((results) => {
    console.log(`\n${colors.bold}Test execution completed.${colors.reset}`);
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error(`${colors.red}Test suite failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });

export default APITester;