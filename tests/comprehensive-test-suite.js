#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Comprehensive Test Suite
 * 
 * This test suite validates:
 * 1. All 3 matching engines (Azure GPT, Basic, Fuzzy)
 * 2. Natural language processing
 * 3. API endpoints
 * 4. Data validation
 * 5. Performance metrics
 * 6. Error handling
 * 
 * Created by: Tester Agent
 * Date: 2025-09-09
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

const GATEWAY_BASE_URL = 'http://localhost:5050';
const UI_BASE_URL = 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000, // 30 seconds per test
  retries: 2,
  parallel: false, // Run tests sequentially for accurate timing
  reportFormat: 'detailed'
};

// Test data - realistic queries matching the CLAUDE.md specifications
const TEST_QUERIES = [
  {
    name: "Tel Aviv General Care - Natural Language",
    query: "Who's available today at 3pm in Tel Aviv?",
    structured: {
      city: "Tel Aviv",
      servicesQuery: ["General Care"],
      topK: 3
    },
    expected: {
      minResults: 1,
      maxResults: 3,
      maxResponseTime: 10000
    }
  },
  {
    name: "Jerusalem Pediatric Urgent - Natural Language", 
    query: "Find pediatric nurse in Jerusalem urgently",
    structured: {
      city: "Jerusalem", 
      servicesQuery: ["Pediatric Care"],
      urgent: true,
      topK: 5
    },
    expected: {
      minResults: 1,
      maxResults: 5,
      maxResponseTime: 8000
    }
  },
  {
    name: "Wound Care Specialist - Natural Language",
    query: "I need wound care specialist",
    structured: {
      servicesQuery: ["Wound Care"],
      expertiseQuery: ["wound care"],
      topK: 3
    },
    expected: {
      minResults: 1,
      maxResults: 3,
      maxResponseTime: 10000
    }
  },
  {
    name: "Hebrew City - Haifa",
    query: "מחפש אחות בחיפה",
    structured: {
      city: "Haifa",
      servicesQuery: ["General Care"],
      topK: 3
    },
    expected: {
      minResults: 1,
      maxResults: 3,
      maxResponseTime: 10000
    }
  },
  {
    name: "Edge Case - Empty Query",
    query: "",
    structured: {},
    expected: {
      shouldError: true,
      errorType: "validation"
    }
  },
  {
    name: "Edge Case - Invalid City",
    query: "Find nurses in NonexistentCity",
    structured: {
      city: "NonexistentCity",
      servicesQuery: ["General Care"],
      topK: 3
    },
    expected: {
      minResults: 0,
      maxResults: 0,
      maxResponseTime: 5000
    }
  }
];

// Test results storage
class TestResults {
  constructor() {
    this.results = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        startTime: null,
        endTime: null,
        duration: 0,
        coverage: {}
      },
      engines: {
        'engine-azure-gpt': { tests: [], health: null, performance: {} },
        'engine-basic': { tests: [], health: null, performance: {} },
        'engine-fuzzy': { tests: [], health: null, performance: {} }
      },
      api: { tests: [], performance: {} },
      data: { validation: [], issues: [] },
      ui: { tests: [], accessibility: [] },
      issues: [],
      recommendations: []
    };
  }

  addTest(category, testName, result) {
    this.results[category].tests.push({
      name: testName,
      ...result,
      timestamp: new Date().toISOString()
    });
    
    this.results.summary.totalTests++;
    if (result.status === 'passed') this.results.summary.passed++;
    else if (result.status === 'failed') this.results.summary.failed++;
    else if (result.status === 'skipped') this.results.summary.skipped++;
  }

  addIssue(severity, description, category, recommendation) {
    this.results.issues.push({
      severity,
      description,
      category,
      recommendation,
      timestamp: new Date().toISOString()
    });
  }

  addRecommendation(category, description, priority) {
    this.results.recommendations.push({
      category,
      description,
      priority,
      timestamp: new Date().toISOString()
    });
  }
}

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, options = {}) {
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      timeout: TEST_CONFIG.timeout,
      ...options
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      duration,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      ok: false,
      status: 0,
      error: error.message,
      duration
    };
  }
}

// Test Suite Classes
class EngineTestSuite {
  constructor(testResults) {
    this.results = testResults;
  }

  async testEngineHealth(engineName) {
    console.log(`🔍 Testing ${engineName} health...`);
    
    const startTime = performance.now();
    const response = await makeRequest(`${GATEWAY_BASE_URL}/engines`);
    const endTime = performance.now();
    
    if (!response.ok) {
      this.results.addTest('engines', `${engineName}-health`, {
        status: 'failed',
        error: response.error || 'Failed to get engine status',
        duration: response.duration
      });
      return false;
    }
    
    const engine = response.data.engines.find(e => e.name === engineName);
    const isHealthy = engine && engine.healthy;
    
    this.results.engines[engineName].health = {
      healthy: isHealthy,
      configured: engine?.configured,
      message: engine?.message,
      checkDuration: endTime - startTime
    };
    
    this.results.addTest('engines', `${engineName}-health`, {
      status: isHealthy ? 'passed' : 'failed',
      details: engine,
      duration: endTime - startTime
    });
    
    if (!isHealthy) {
      this.results.addIssue('high', `Engine ${engineName} is not healthy: ${engine?.message}`, 
        'engine', `Check configuration and dependencies for ${engineName}`);
    }
    
    return isHealthy;
  }

  async testEngineMatching(engineName, testQuery) {
    console.log(`🔍 Testing ${engineName} with query: "${testQuery.name}"`);
    
    const startTime = performance.now();
    
    const requestBody = {
      ...testQuery.structured,
      engine: engineName
    };
    
    const response = await makeRequest(`${GATEWAY_BASE_URL}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Analyze results
    const testResult = {
      duration,
      query: testQuery.name,
      engine: engineName
    };
    
    if (!response.ok) {
      if (testQuery.expected.shouldError) {
        testResult.status = 'passed';
        testResult.details = 'Expected error occurred';
      } else {
        testResult.status = 'failed';
        testResult.error = response.error || `HTTP ${response.status}`;
        this.results.addIssue('high', `Engine ${engineName} failed for query "${testQuery.name}": ${testResult.error}`,
          'engine', `Debug engine ${engineName} matching logic`);
      }
    } else {
      const results = response.data.results || [];
      const resultCount = results.length;
      
      // Validate result count
      const expected = testQuery.expected;
      let countValid = true;
      
      if (expected.minResults !== undefined && resultCount < expected.minResults) {
        countValid = false;
        testResult.error = `Expected at least ${expected.minResults} results, got ${resultCount}`;
      }
      
      if (expected.maxResults !== undefined && resultCount > expected.maxResults) {
        countValid = false;
        testResult.error = `Expected at most ${expected.maxResults} results, got ${resultCount}`;
      }
      
      // Validate response time
      const timeValid = !expected.maxResponseTime || duration <= expected.maxResponseTime;
      if (!timeValid) {
        testResult.error = `Response time ${Math.round(duration)}ms exceeded limit ${expected.maxResponseTime}ms`;
      }
      
      // Validate result structure
      const structureValid = results.every(result => 
        result.id && 
        typeof result.score === 'number' && 
        result.score >= 0 && 
        result.score <= 1 &&
        result.reason
      );
      
      if (!structureValid) {
        testResult.error = 'Invalid result structure - missing id, score, or reason';
      }
      
      testResult.status = (countValid && timeValid && structureValid) ? 'passed' : 'failed';
      testResult.details = {
        resultCount,
        responseTime: Math.round(duration),
        results: results.map(r => ({
          id: r.id,
          score: r.score,
          reason: r.reason?.substring(0, 100) + '...'
        }))
      };
      
      // Record performance metrics
      this.results.engines[engineName].performance[testQuery.name] = {
        duration,
        resultCount,
        avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length || 0
      };
    }
    
    this.results.addTest('engines', `${engineName}-${testQuery.name}`, testResult);
    return testResult.status === 'passed';
  }

  async runEngineTests() {
    console.log('\n🚀 Starting Engine Tests...\n');
    
    const engines = ['engine-azure-gpt', 'engine-basic', 'engine-fuzzy'];
    
    for (const engine of engines) {
      console.log(`\n--- Testing ${engine} ---`);
      
      // Test health first
      const isHealthy = await this.testEngineHealth(engine);
      
      if (!isHealthy) {
        console.log(`❌ ${engine} is not healthy, skipping matching tests`);
        continue;
      }
      
      // Test matching with all queries
      for (const testQuery of TEST_QUERIES) {
        await this.testEngineMatching(engine, testQuery);
        await delay(500); // Small delay between requests
      }
    }
  }
}

class APITestSuite {
  constructor(testResults) {
    this.results = testResults;
  }

  async testHealthEndpoint() {
    console.log('🔍 Testing /health endpoint...');
    
    const response = await makeRequest(`${GATEWAY_BASE_URL}/health`);
    
    const testResult = {
      duration: response.duration
    };
    
    if (!response.ok) {
      testResult.status = 'failed';
      testResult.error = response.error || `HTTP ${response.status}`;
    } else {
      const data = response.data;
      const hasRequiredFields = data.ok !== undefined && 
                               data.engines !== undefined && 
                               data.nursesLoaded !== undefined;
      
      testResult.status = hasRequiredFields ? 'passed' : 'failed';
      testResult.details = data;
      
      if (!hasRequiredFields) {
        testResult.error = 'Missing required health check fields';
      }
    }
    
    this.results.addTest('api', 'health-endpoint', testResult);
    return testResult.status === 'passed';
  }

  async testEnginesEndpoint() {
    console.log('🔍 Testing /engines endpoint...');
    
    const response = await makeRequest(`${GATEWAY_BASE_URL}/engines`);
    
    const testResult = {
      duration: response.duration
    };
    
    if (!response.ok) {
      testResult.status = 'failed';
      testResult.error = response.error || `HTTP ${response.status}`;
    } else {
      const data = response.data;
      const hasEngines = data.engines && Array.isArray(data.engines) && data.engines.length > 0;
      
      testResult.status = hasEngines ? 'passed' : 'failed';
      testResult.details = {
        engineCount: data.engines?.length || 0,
        engines: data.engines?.map(e => ({ name: e.name, healthy: e.healthy }))
      };
      
      if (!hasEngines) {
        testResult.error = 'No engines found or invalid response structure';
      }
    }
    
    this.results.addTest('api', 'engines-endpoint', testResult);
    return testResult.status === 'passed';
  }

  async testCORSHeaders() {
    console.log('🔍 Testing CORS configuration...');
    
    const response = await makeRequest(`${GATEWAY_BASE_URL}/health`, {
      method: 'OPTIONS'
    });
    
    const testResult = {
      duration: response.duration
    };
    
    const corsHeaders = response.headers['access-control-allow-origin'] ||
                       response.headers['Access-Control-Allow-Origin'];
    
    testResult.status = corsHeaders ? 'passed' : 'failed';
    testResult.details = {
      corsOrigin: corsHeaders,
      allHeaders: response.headers
    };
    
    if (!corsHeaders) {
      testResult.error = 'CORS headers not properly configured';
    }
    
    this.results.addTest('api', 'cors-configuration', testResult);
    return testResult.status === 'passed';
  }

  async runAPITests() {
    console.log('\n🌐 Starting API Tests...\n');
    
    await this.testHealthEndpoint();
    await this.testEnginesEndpoint();
    await this.testCORSHeaders();
  }
}

class DataValidationSuite {
  constructor(testResults) {
    this.results = testResults;
  }

  async validateNursesData() {
    console.log('🔍 Validating nurses data structure...');
    
    try {
      // Get data from health endpoint
      const response = await makeRequest(`${GATEWAY_BASE_URL}/health`);
      
      if (!response.ok) {
        this.results.addTest('data', 'nurses-data-availability', {
          status: 'failed',
          error: 'Could not retrieve health information',
          duration: response.duration
        });
        return false;
      }
      
      const nursesCount = response.data.nursesLoaded;
      
      // Test data availability
      this.results.addTest('data', 'nurses-data-count', {
        status: nursesCount > 0 ? 'passed' : 'failed',
        details: { count: nursesCount },
        duration: response.duration
      });
      
      // Expected count based on documentation
      const expectedCount = 457;
      const countAccurate = Math.abs(nursesCount - expectedCount) <= 10; // Allow small variance
      
      this.results.addTest('data', 'nurses-data-accuracy', {
        status: countAccurate ? 'passed' : 'failed',
        details: { 
          expected: expectedCount, 
          actual: nursesCount,
          variance: Math.abs(nursesCount - expectedCount)
        },
        duration: 0
      });
      
      if (!countAccurate) {
        this.results.addIssue('medium', 
          `Nurse count variance detected: expected ~${expectedCount}, got ${nursesCount}`,
          'data', 'Review data loading and processing pipeline');
      }
      
      return nursesCount > 0;
      
    } catch (error) {
      this.results.addTest('data', 'nurses-data-validation', {
        status: 'failed',
        error: error.message,
        duration: 0
      });
      return false;
    }
  }

  async testDataConsistency() {
    console.log('🔍 Testing data consistency across engines...');
    
    const testQuery = {
      city: "Tel Aviv",
      servicesQuery: ["General Care"],
      topK: 1
    };
    
    const engines = ['engine-azure-gpt', 'engine-basic', 'engine-fuzzy'];
    const engineResults = {};
    
    // Get results from each engine
    for (const engine of engines) {
      const response = await makeRequest(`${GATEWAY_BASE_URL}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...testQuery, engine })
      });
      
      if (response.ok) {
        engineResults[engine] = response.data.results || [];
      }
    }
    
    // Analyze consistency
    const hasResults = Object.keys(engineResults).length > 0;
    const allReturnResults = Object.values(engineResults).every(results => results.length > 0);
    
    this.results.addTest('data', 'engine-consistency', {
      status: allReturnResults ? 'passed' : 'failed',
      details: {
        engineResults: Object.keys(engineResults).reduce((acc, engine) => {
          acc[engine] = {
            count: engineResults[engine].length,
            topResult: engineResults[engine][0]?.id
          };
          return acc;
        }, {})
      },
      duration: 0
    });
    
    if (!allReturnResults) {
      this.results.addIssue('medium', 'Some engines return no results for basic queries',
        'data', 'Review engine logic and data filtering');
    }
    
    return allReturnResults;
  }

  async runDataValidation() {
    console.log('\n📊 Starting Data Validation...\n');
    
    await this.validateNursesData();
    await this.testDataConsistency();
  }
}

// Main test runner
class WonderTestRunner {
  constructor() {
    this.results = new TestResults();
  }

  async runAllTests() {
    console.log('🧪 Wonder Healthcare Platform - Comprehensive Test Suite');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Gateway URL: ${GATEWAY_BASE_URL}`);
    console.log(`UI URL: ${UI_BASE_URL}`);
    console.log('='.repeat(60));
    
    this.results.results.summary.startTime = new Date().toISOString();
    const overallStart = performance.now();
    
    try {
      // Run test suites
      const engineSuite = new EngineTestSuite(this.results);
      await engineSuite.runEngineTests();
      
      const apiSuite = new APITestSuite(this.results);
      await apiSuite.runAPITests();
      
      const dataSuite = new DataValidationSuite(this.results);
      await dataSuite.runDataValidation();
      
      // Calculate final metrics
      const overallEnd = performance.now();
      this.results.results.summary.endTime = new Date().toISOString();
      this.results.results.summary.duration = overallEnd - overallStart;
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Save and display results
      await this.saveResults();
      this.displayResults();
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      this.results.addIssue('critical', `Test suite execution failed: ${error.message}`,
        'system', 'Review test infrastructure and dependencies');
    }
  }

  generateRecommendations() {
    const summary = this.results.results.summary;
    const issues = this.results.results.issues;
    
    // Performance recommendations
    const avgEngineResponseTime = Object.values(this.results.results.engines)
      .flatMap(engine => Object.values(engine.performance))
      .reduce((sum, perf, _, arr) => sum + (perf.duration || 0) / arr.length, 0);
    
    if (avgEngineResponseTime > 5000) {
      this.results.addRecommendation('performance',
        'Engine response times are high. Consider optimizing queries or adding caching.',
        'high');
    }
    
    // Quality recommendations
    const failureRate = summary.failed / summary.totalTests;
    if (failureRate > 0.1) {
      this.results.addRecommendation('quality',
        'High test failure rate detected. Review system stability.',
        'critical');
    }
    
    // Coverage recommendations
    if (summary.totalTests < 20) {
      this.results.addRecommendation('coverage',
        'Consider adding more comprehensive test scenarios.',
        'medium');
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `/home/odedbe/wonder/test-results-${timestamp}.json`;
    
    try {
      await fs.writeFile(filename, JSON.stringify(this.results.results, null, 2));
      console.log(`\n📄 Test results saved to: ${filename}`);
    } catch (error) {
      console.error('❌ Failed to save test results:', error.message);
    }
  }

  displayResults() {
    const summary = this.results.results.summary;
    const issues = this.results.results.issues;
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(`⏱️ Duration: ${Math.round(summary.duration)}ms`);
    
    const passRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    console.log(`📊 Pass Rate: ${passRate}%`);
    
    // Engine performance summary
    console.log('\n' + '-'.repeat(40));
    console.log('🔧 ENGINE PERFORMANCE');
    console.log('-'.repeat(40));
    
    Object.entries(this.results.results.engines).forEach(([engine, data]) => {
      const avgDuration = Object.values(data.performance)
        .reduce((sum, perf, _, arr) => sum + (perf.duration || 0) / arr.length, 0);
      
      console.log(`${engine}: ${data.health?.healthy ? '🟢' : '🔴'} (avg: ${Math.round(avgDuration)}ms)`);
    });
    
    // Issues summary
    if (issues.length > 0) {
      console.log('\n' + '-'.repeat(40));
      console.log('🚨 ISSUES FOUND');
      console.log('-'.repeat(40));
      
      issues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🔴' :
                    issue.severity === 'high' ? '🟠' :
                    issue.severity === 'medium' ? '🟡' : '🔵';
        console.log(`${icon} ${issue.description}`);
        console.log(`   💡 Recommendation: ${issue.recommendation}\n`);
      });
    }
    
    // Overall assessment
    console.log('\n' + '='.repeat(60));
    console.log('🎯 QUALITY ASSESSMENT');
    console.log('='.repeat(60));
    
    if (passRate >= 90) {
      console.log('🌟 EXCELLENT: System is performing very well');
    } else if (passRate >= 75) {
      console.log('✅ GOOD: System is stable with minor issues');
    } else if (passRate >= 50) {
      console.log('⚠️ NEEDS ATTENTION: Several issues need fixing');
    } else {
      console.log('🚨 CRITICAL: Major issues require immediate attention');
    }
    
    console.log('='.repeat(60));
  }
}

// Execute tests if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const runner = new WonderTestRunner();
  runner.runAllTests().catch(console.error);
}

export { WonderTestRunner, TestResults };