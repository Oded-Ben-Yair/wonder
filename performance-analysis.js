#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Comprehensive Performance Analysis
 *
 * This script provides detailed performance testing for both backend and frontend:
 * - Backend API endpoint performance testing
 * - Load testing with 10, 50, 100 concurrent users
 * - Response time analysis (p50, p95, p99)
 * - Error rate monitoring
 * - Frontend resource analysis
 *
 * Created for performance analysis and optimization recommendations
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import fs from 'fs/promises';
import os from 'os';

const BACKEND_URL = 'https://wonder-backend-api.azurewebsites.net';
const FRONTEND_URL = 'https://wonder-ceo-web.azurewebsites.net';

// Test configurations for different load levels
const LOAD_TEST_CONFIGS = [
  {
    name: 'Light Load',
    concurrent: 10,
    totalRequests: 50,
    duration: 30000 // 30 seconds
  },
  {
    name: 'Medium Load',
    concurrent: 50,
    totalRequests: 250,
    duration: 60000 // 60 seconds
  },
  {
    name: 'Heavy Load',
    concurrent: 100,
    totalRequests: 500,
    duration: 120000 // 120 seconds
  }
];

// Test queries that simulate real-world usage
const TEST_QUERIES = [
  { city: "Tel Aviv", topK: 3 },
  { city: "Tel Aviv", servicesQuery: ["WOUND_CARE"], topK: 5 },
  { city: "Tel Aviv", servicesQuery: ["GERIATRIC_CARE"], urgent: true, topK: 3 },
  { city: "Tel Aviv", gender: "FEMALE", topK: 4 },
  { city: "Tel Aviv", servicesQuery: ["GENERAL_CARE"], topK: 2 },
  { city: "Jerusalem", topK: 3 },
  { city: "Haifa", servicesQuery: ["WOUND_CARE"], topK: 3 },
  { city: "Beer Sheva", topK: 5 }
];

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        nodeVersion: process.version
      },
      backend: {
        baselineTests: {},
        loadTests: {},
        endpointTests: {}
      },
      frontend: {
        loadTime: {},
        resourceAnalysis: {}
      },
      summary: {}
    };
  }

  // Helper function to make HTTP requests with detailed timing
  async makeRequest(url, options = {}) {
    const startTime = performance.now();
    let response;
    let error = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      let data = null;
      let size = 0;

      if (response.ok) {
        const responseText = await response.text();
        size = responseText.length;

        // Try to parse as JSON
        try {
          data = JSON.parse(responseText);
        } catch {
          data = responseText;
        }
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        size,
        data,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`
      };

    } catch (err) {
      const endTime = performance.now();
      return {
        success: false,
        status: 0,
        statusText: 'Request Failed',
        responseTime: endTime - startTime,
        size: 0,
        data: null,
        error: err.message
      };
    }
  }

  // Test individual backend endpoints for baseline performance
  async testBackendEndpoints() {
    console.log('\n🔍 Testing Backend Endpoints...');

    const endpoints = [
      {
        name: 'Health Check',
        url: `${BACKEND_URL}/health`,
        method: 'GET',
        expectedFields: ['status', 'nursesLoaded']
      },
      {
        name: 'Match Query - Simple',
        url: `${BACKEND_URL}/match`,
        method: 'POST',
        body: JSON.stringify({ city: "Tel Aviv", topK: 3 }),
        expectedFields: ['nurses', 'query']
      },
      {
        name: 'Match Query - Complex',
        url: `${BACKEND_URL}/match`,
        method: 'POST',
        body: JSON.stringify({
          city: "Tel Aviv",
          servicesQuery: ["WOUND_CARE"],
          gender: "FEMALE",
          urgent: true,
          topK: 5
        }),
        expectedFields: ['nurses', 'query']
      }
    ];

    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.name}...`);

      const requests = [];

      // Run 10 requests for each endpoint to get statistical data
      for (let i = 0; i < 10; i++) {
        const options = {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        };

        if (endpoint.body) {
          options.body = endpoint.body;
        }

        const result = await this.makeRequest(endpoint.url, options);
        requests.push(result);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate statistics
      const successful = requests.filter(r => r.success);
      const responseTimes = successful.map(r => r.responseTime);

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);

        const stats = {
          requests: requests.length,
          successful: successful.length,
          failed: requests.length - successful.length,
          successRate: (successful.length / requests.length) * 100,
          responseTime: {
            min: Math.round(responseTimes[0]),
            max: Math.round(responseTimes[responseTimes.length - 1]),
            avg: Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length),
            median: Math.round(responseTimes[Math.floor(responseTimes.length / 2)]),
            p95: Math.round(responseTimes[Math.floor(responseTimes.length * 0.95)]),
            p99: Math.round(responseTimes[Math.floor(responseTimes.length * 0.99)])
          },
          dataValidation: successful.length > 0 ? this.validateResponseData(successful[0].data, endpoint.expectedFields) : false
        };

        this.results.backend.endpointTests[endpoint.name] = {
          ...stats,
          errors: requests.filter(r => !r.success).map(r => r.error)
        };

        console.log(`    ✅ Success: ${stats.successRate.toFixed(1)}% | Avg: ${stats.responseTime.avg}ms | P95: ${stats.responseTime.p95}ms`);
      } else {
        console.log(`    ❌ All requests failed`);
        this.results.backend.endpointTests[endpoint.name] = {
          requests: requests.length,
          successful: 0,
          failed: requests.length,
          successRate: 0,
          errors: requests.map(r => r.error)
        };
      }
    }
  }

  // Validate that response contains expected fields
  validateResponseData(data, expectedFields) {
    if (!data || typeof data !== 'object') return false;

    return expectedFields.every(field => {
      const hasField = data.hasOwnProperty(field);
      if (!hasField) console.log(`    ⚠️  Missing expected field: ${field}`);
      return hasField;
    });
  }

  // Run load tests with different concurrency levels
  async runLoadTests() {
    console.log('\n🚀 Running Load Tests...');

    for (const config of LOAD_TEST_CONFIGS) {
      console.log(`\n  📊 ${config.name} (${config.concurrent} concurrent users, ${config.totalRequests} requests)`);

      const startTime = performance.now();
      const results = await this.executeLoadTest(config);
      const endTime = performance.now();

      const testDuration = endTime - startTime;
      const successful = results.filter(r => r.success);
      const responseTimes = successful.map(r => r.responseTime);

      let stats = {
        config,
        duration: Math.round(testDuration),
        totalRequests: results.length,
        successful: successful.length,
        failed: results.length - successful.length,
        successRate: (successful.length / results.length) * 100,
        throughput: (results.length / (testDuration / 1000)).toFixed(2) // requests per second
      };

      if (responseTimes.length > 0) {
        responseTimes.sort((a, b) => a - b);

        stats.responseTime = {
          min: Math.round(responseTimes[0]),
          max: Math.round(responseTimes[responseTimes.length - 1]),
          avg: Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length),
          median: Math.round(responseTimes[Math.floor(responseTimes.length / 2)]),
          p95: Math.round(responseTimes[Math.floor(responseTimes.length * 0.95)]),
          p99: Math.round(responseTimes[Math.floor(responseTimes.length * 0.99)])
        };
      }

      // Collect error patterns
      const errors = results.filter(r => !r.success);
      const errorCounts = {};
      errors.forEach(e => {
        const errorType = e.error || 'Unknown';
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });

      stats.errors = errorCounts;

      this.results.backend.loadTests[config.name] = stats;

      console.log(`    ✅ Completed: ${stats.successRate.toFixed(1)}% success rate`);
      console.log(`    ⚡ Throughput: ${stats.throughput} req/sec`);
      console.log(`    📈 Response times: avg=${stats.responseTime?.avg || 'N/A'}ms, p95=${stats.responseTime?.p95 || 'N/A'}ms`);
    }
  }

  // Execute a single load test configuration
  async executeLoadTest(config) {
    const results = [];
    const requestsPerBatch = config.concurrent;
    const totalBatches = Math.ceil(config.totalRequests / requestsPerBatch);

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchSize = Math.min(requestsPerBatch, config.totalRequests - (batch * requestsPerBatch));
      const batchPromises = [];

      for (let i = 0; i < batchSize; i++) {
        const query = TEST_QUERIES[Math.floor(Math.random() * TEST_QUERIES.length)];

        const requestPromise = this.makeRequest(`${BACKEND_URL}/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(query)
        });

        batchPromises.push(requestPromise);
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Progress indicator
      const progress = Math.round((batch + 1) / totalBatches * 100);
      process.stdout.write(`\r    Progress: ${progress}% [${batch + 1}/${totalBatches} batches]`);

      // Small delay between batches to avoid overwhelming the server
      if (batch < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    console.log(''); // New line after progress
    return results;
  }

  // Test frontend performance
  async testFrontendPerformance() {
    console.log('\n🌐 Testing Frontend Performance...');

    // Test initial page load
    console.log('  Testing page load time...');
    const pageLoadResults = [];

    for (let i = 0; i < 5; i++) {
      const result = await this.makeRequest(FRONTEND_URL);
      pageLoadResults.push(result);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const successful = pageLoadResults.filter(r => r.success);
    const loadTimes = successful.map(r => r.responseTime);

    if (loadTimes.length > 0) {
      this.results.frontend.loadTime = {
        requests: pageLoadResults.length,
        successful: successful.length,
        avgLoadTime: Math.round(loadTimes.reduce((a, b) => a + b) / loadTimes.length),
        minLoadTime: Math.round(Math.min(...loadTimes)),
        maxLoadTime: Math.round(Math.max(...loadTimes)),
        htmlSize: successful[0].size,
        successRate: (successful.length / pageLoadResults.length) * 100
      };

      console.log(`    ✅ Average load time: ${this.results.frontend.loadTime.avgLoadTime}ms`);
      console.log(`    📦 HTML size: ${this.results.frontend.loadTime.htmlSize} bytes`);
    } else {
      console.log(`    ❌ Frontend load test failed`);
    }

    // Analyze HTML content for performance insights
    if (successful.length > 0) {
      this.analyzeFrontendResources(successful[0].data);
    }
  }

  // Analyze frontend resources from HTML
  analyzeFrontendResources(html) {
    console.log('  Analyzing frontend resources...');

    const analysis = {
      scripts: [],
      stylesheets: [],
      images: [],
      preloads: []
    };

    // Extract script tags
    const scriptMatches = html.match(/<script[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
    analysis.scripts = scriptMatches.map(match => {
      const src = match.match(/src=["']([^"']+)["']/);
      return src ? src[1] : null;
    }).filter(Boolean);

    // Extract stylesheet links
    const cssMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g) || [];
    analysis.stylesheets = cssMatches.map(match => {
      const href = match.match(/href=["']([^"']+)["']/);
      return href ? href[1] : null;
    }).filter(Boolean);

    // Extract preload links
    const preloadMatches = html.match(/<link[^>]*rel=["']preload["'][^>]*>/g) || [];
    analysis.preloads = preloadMatches.map(match => {
      const href = match.match(/href=["']([^"']+)["']/);
      return href ? href[1] : null;
    }).filter(Boolean);

    // Extract image sources
    const imgMatches = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/g) || [];
    analysis.images = imgMatches.map(match => {
      const src = match.match(/src=["']([^"']+)["']/);
      return src ? src[1] : null;
    }).filter(Boolean);

    this.results.frontend.resourceAnalysis = {
      totalScripts: analysis.scripts.length,
      totalStylesheets: analysis.stylesheets.length,
      totalImages: analysis.images.length,
      totalPreloads: analysis.preloads.length,
      hasServiceWorker: html.includes('serviceWorker'),
      hasMetaViewport: html.includes('viewport'),
      resources: analysis
    };

    console.log(`    📜 Scripts: ${analysis.scripts.length}`);
    console.log(`    🎨 Stylesheets: ${analysis.stylesheets.length}`);
    console.log(`    🖼️  Images: ${analysis.images.length}`);
    console.log(`    ⚡ Preloads: ${analysis.preloads.length}`);
  }

  // Generate performance recommendations
  generateRecommendations() {
    const recommendations = {
      backend: [],
      frontend: [],
      infrastructure: []
    };

    // Backend recommendations
    const endpointTests = this.results.backend.endpointTests;
    Object.entries(endpointTests).forEach(([name, test]) => {
      if (test.successRate < 95) {
        recommendations.backend.push(`${name}: Improve reliability (${test.successRate.toFixed(1)}% success rate)`);
      }
      if (test.responseTime?.avg > 1000) {
        recommendations.backend.push(`${name}: Optimize response time (${test.responseTime.avg}ms average)`);
      }
      if (test.responseTime?.p95 > 2000) {
        recommendations.backend.push(`${name}: Address slow requests (${test.responseTime.p95}ms P95)`);
      }
    });

    const loadTests = this.results.backend.loadTests;
    Object.entries(loadTests).forEach(([name, test]) => {
      if (test.successRate < 90) {
        recommendations.backend.push(`${name}: Improve load handling (${test.successRate.toFixed(1)}% success under load)`);
      }
      if (test.responseTime?.avg > 2000) {
        recommendations.backend.push(`${name}: Optimize response time under load (${test.responseTime.avg}ms average)`);
      }
      if (parseFloat(test.throughput) < 10) {
        recommendations.backend.push(`${name}: Improve throughput (${test.throughput} req/sec)`);
      }
    });

    // Frontend recommendations
    const frontend = this.results.frontend;
    if (frontend.loadTime?.avgLoadTime > 1000) {
      recommendations.frontend.push(`Optimize initial page load time (${frontend.loadTime.avgLoadTime}ms)`);
    }
    if (frontend.loadTime?.htmlSize > 50000) {
      recommendations.frontend.push(`Reduce HTML size (${frontend.loadTime.htmlSize} bytes)`);
    }
    if (frontend.resourceAnalysis?.totalScripts > 10) {
      recommendations.frontend.push(`Consider bundling/reducing scripts (${frontend.resourceAnalysis.totalScripts} scripts)`);
    }
    if (!frontend.resourceAnalysis?.hasServiceWorker) {
      recommendations.frontend.push('Implement service worker for caching');
    }

    // Infrastructure recommendations
    if (Object.values(loadTests).some(test => test.successRate < 95)) {
      recommendations.infrastructure.push('Consider implementing auto-scaling for high load scenarios');
    }
    if (Object.values(loadTests).some(test => test.responseTime?.p95 > 3000)) {
      recommendations.infrastructure.push('Implement caching layer to improve response times');
    }

    this.results.recommendations = recommendations;
  }

  // Generate comprehensive performance report
  generateReport() {
    this.generateRecommendations();

    console.log('\n' + '='.repeat(70));
    console.log('📊 WONDER HEALTHCARE PLATFORM - PERFORMANCE ANALYSIS REPORT');
    console.log('='.repeat(70));
    console.log(`Generated: ${this.results.timestamp}`);
    console.log(`System: ${this.results.system.platform} ${this.results.system.arch}, ${this.results.system.cpus} CPUs, ${this.results.system.memory}`);
    console.log(`Node.js: ${this.results.system.nodeVersion}`);

    // Backend Performance Summary
    console.log('\n🔧 BACKEND PERFORMANCE:');
    console.log('-'.repeat(50));

    Object.entries(this.results.backend.endpointTests).forEach(([name, test]) => {
      const status = test.successRate >= 95 ? '✅' : '⚠️';
      console.log(`${status} ${name}:`);
      console.log(`   Success Rate: ${test.successRate.toFixed(1)}%`);
      if (test.responseTime) {
        console.log(`   Response Time: avg=${test.responseTime.avg}ms, p95=${test.responseTime.p95}ms, p99=${test.responseTime.p99}ms`);
      }
    });

    // Load Test Results
    console.log('\n🚀 LOAD TEST RESULTS:');
    console.log('-'.repeat(50));

    Object.entries(this.results.backend.loadTests).forEach(([name, test]) => {
      const status = test.successRate >= 90 ? '✅' : '⚠️';
      console.log(`${status} ${name} (${test.config.concurrent} concurrent):`);
      console.log(`   Requests: ${test.totalRequests} total, ${test.successful} successful (${test.successRate.toFixed(1)}%)`);
      console.log(`   Throughput: ${test.throughput} requests/second`);
      if (test.responseTime) {
        console.log(`   Response Time: avg=${test.responseTime.avg}ms, p95=${test.responseTime.p95}ms, p99=${test.responseTime.p99}ms`);
      }
      if (Object.keys(test.errors).length > 0) {
        console.log(`   Errors: ${JSON.stringify(test.errors)}`);
      }
    });

    // Frontend Performance
    console.log('\n🌐 FRONTEND PERFORMANCE:');
    console.log('-'.repeat(50));

    const frontend = this.results.frontend;
    if (frontend.loadTime) {
      const loadStatus = frontend.loadTime.avgLoadTime <= 1000 ? '✅' : '⚠️';
      console.log(`${loadStatus} Page Load Performance:`);
      console.log(`   Average Load Time: ${frontend.loadTime.avgLoadTime}ms`);
      console.log(`   Load Time Range: ${frontend.loadTime.minLoadTime}ms - ${frontend.loadTime.maxLoadTime}ms`);
      console.log(`   HTML Size: ${frontend.loadTime.htmlSize} bytes`);
      console.log(`   Success Rate: ${frontend.loadTime.successRate.toFixed(1)}%`);
    }

    if (frontend.resourceAnalysis) {
      console.log(`📦 Resource Analysis:`);
      console.log(`   Scripts: ${frontend.resourceAnalysis.totalScripts}`);
      console.log(`   Stylesheets: ${frontend.resourceAnalysis.totalStylesheets}`);
      console.log(`   Images: ${frontend.resourceAnalysis.totalImages}`);
      console.log(`   Preloads: ${frontend.resourceAnalysis.totalPreloads}`);
    }

    // Performance Recommendations
    console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
    console.log('-'.repeat(50));

    if (this.results.recommendations.backend.length > 0) {
      console.log('Backend Optimizations:');
      this.results.recommendations.backend.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    if (this.results.recommendations.frontend.length > 0) {
      console.log('Frontend Optimizations:');
      this.results.recommendations.frontend.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    if (this.results.recommendations.infrastructure.length > 0) {
      console.log('Infrastructure Improvements:');
      this.results.recommendations.infrastructure.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }

    // Overall Performance Score
    console.log('\n🏆 PERFORMANCE SCORE:');
    console.log('-'.repeat(50));

    let score = 100;
    const issues = [];

    // Deduct points for backend issues
    Object.values(this.results.backend.endpointTests).forEach(test => {
      if (test.successRate < 95) {
        score -= 10;
        issues.push('Backend reliability');
      }
      if (test.responseTime?.avg > 1000) {
        score -= 5;
        issues.push('Backend response time');
      }
    });

    // Deduct points for load test issues
    Object.values(this.results.backend.loadTests).forEach(test => {
      if (test.successRate < 90) {
        score -= 15;
        issues.push('Load handling');
      }
      if (test.responseTime?.avg > 2000) {
        score -= 10;
        issues.push('Load response time');
      }
    });

    // Deduct points for frontend issues
    if (frontend.loadTime?.avgLoadTime > 1000) {
      score -= 5;
      issues.push('Frontend load time');
    }

    score = Math.max(0, score);

    let rating;
    if (score >= 90) rating = '🌟 EXCELLENT';
    else if (score >= 75) rating = '✅ GOOD';
    else if (score >= 60) rating = '⚠️ NEEDS IMPROVEMENT';
    else rating = '🚨 CRITICAL ISSUES';

    console.log(`Performance Score: ${score}/100`);
    console.log(`Overall Rating: ${rating}`);

    if (issues.length > 0) {
      console.log(`Key Issues: ${[...new Set(issues)].join(', ')}`);
    }

    console.log('\n' + '='.repeat(70));

    return this.results;
  }

  // Save results to file
  async saveResults() {
    const filename = `/home/odedbe/wonder/performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${filename}`);
    return filename;
  }

  // Run complete performance analysis
  async runCompleteAnalysis() {
    console.log('🚀 Starting Comprehensive Performance Analysis...');
    console.log('Backend:', BACKEND_URL);
    console.log('Frontend:', FRONTEND_URL);

    try {
      await this.testBackendEndpoints();
      await this.runLoadTests();
      await this.testFrontendPerformance();

      this.generateReport();
      const filename = await this.saveResults();

      return { results: this.results, filename };
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }
}

// Execute analysis if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.runCompleteAnalysis().catch(console.error);
}

export { PerformanceAnalyzer };