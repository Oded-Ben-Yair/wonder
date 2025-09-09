#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Performance & Load Test Suite
 * 
 * This test suite validates:
 * 1. Response time benchmarks for all engines
 * 2. Load handling capabilities
 * 3. Memory and resource usage
 * 4. Concurrent request handling
 * 5. System stability under load
 * 
 * Created by: Tester Agent
 * Date: 2025-09-09
 */

import { performance } from 'perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import os from 'os';

const GATEWAY_BASE_URL = 'http://localhost:5050';

// Performance test configurations
const PERFORMANCE_TESTS = {
  baseline: {
    name: 'Baseline Response Time',
    requests: 10,
    concurrent: 1,
    targets: {
      'engine-azure-gpt': 8000,  // 8s max for LLM
      'engine-basic': 1000,      // 1s max for basic
      'engine-fuzzy': 2000       // 2s max for fuzzy
    }
  },
  concurrent: {
    name: 'Concurrent Load Test',
    requests: 50,
    concurrent: 5,
    targets: {
      avgResponseTime: 5000,
      maxResponseTime: 15000,
      errorRate: 0.05  // 5% max error rate
    }
  },
  stress: {
    name: 'Stress Test',
    requests: 100,
    concurrent: 10,
    targets: {
      avgResponseTime: 8000,
      maxResponseTime: 20000,
      errorRate: 0.10  // 10% max error rate under stress
    }
  },
  endurance: {
    name: 'Endurance Test',
    requests: 200,
    concurrent: 3,
    duration: 300000, // 5 minutes
    targets: {
      avgResponseTime: 6000,
      maxResponseTime: 12000,
      errorRate: 0.05,
      memoryLeakThreshold: 0.2 // 20% memory growth max
    }
  }
};

// Test queries for load testing
const LOAD_TEST_QUERIES = [
  { city: "Tel Aviv", servicesQuery: ["General Care"], topK: 3 },
  { city: "Jerusalem", servicesQuery: ["Pediatric Care"], topK: 5 },
  { city: "Haifa", servicesQuery: ["Wound Care"], topK: 2 },
  { city: "Tel Aviv", servicesQuery: ["Geriatric Care"], urgent: true, topK: 3 },
  { city: "Ramat Gan", servicesQuery: ["General Care"], topK: 4 }
];

class PerformanceTestSuite {
  constructor() {
    this.results = {
      system: {
        cpu: os.cpus().length,
        memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        platform: os.platform(),
        nodeVersion: process.version
      },
      tests: {},
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        errorRate: 0
      }
    };
  }

  async makeRequest(query, engine = null) {
    const startTime = performance.now();
    const requestBody = engine ? { ...query, engine } : query;
    
    try {
      const response = await fetch(`${GATEWAY_BASE_URL}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(30000) // 30s timeout
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      if (!response.ok) {
        return {
          success: false,
          status: response.status,
          statusText: response.statusText,
          duration,
          error: `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        status: response.status,
        duration,
        resultCount: data.results?.length || 0,
        engine: data.engine,
        data
      };

    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        duration: endTime - startTime,
        error: error.message
      };
    }
  }

  async runBaselineTest() {
    console.log('\n📊 Running Baseline Performance Tests...\n');
    
    const engines = ['engine-azure-gpt', 'engine-basic', 'engine-fuzzy'];
    const baselineResults = {};

    for (const engine of engines) {
      console.log(`  🔧 Testing ${engine}...`);
      
      const engineResults = {
        engine,
        responses: [],
        stats: {}
      };

      const testQuery = LOAD_TEST_QUERIES[0]; // Use simple query for baseline

      // Run baseline requests
      for (let i = 0; i < PERFORMANCE_TESTS.baseline.requests; i++) {
        const result = await this.makeRequest(testQuery, engine);
        engineResults.responses.push(result);
        
        process.stdout.write(result.success ? '✓' : '✗');
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate stats
      const successfulResponses = engineResults.responses.filter(r => r.success);
      const durations = successfulResponses.map(r => r.duration);
      
      if (durations.length > 0) {
        engineResults.stats = {
          successRate: (successfulResponses.length / engineResults.responses.length) * 100,
          avgResponseTime: durations.reduce((a, b) => a + b) / durations.length,
          minResponseTime: Math.min(...durations),
          maxResponseTime: Math.max(...durations),
          medianResponseTime: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)],
          target: PERFORMANCE_TESTS.baseline.targets[engine],
          meetsTarget: durations.every(d => d <= PERFORMANCE_TESTS.baseline.targets[engine])
        };
      } else {
        engineResults.stats = {
          successRate: 0,
          avgResponseTime: 0,
          meetsTarget: false
        };
      }

      console.log(`\n    📈 Results: ${Math.round(engineResults.stats.avgResponseTime)}ms avg (target: ${PERFORMANCE_TESTS.baseline.targets[engine]}ms)`);
      console.log(`    📊 Success Rate: ${engineResults.stats.successRate.toFixed(1)}%`);
      console.log(`    ${engineResults.stats.meetsTarget ? '✅ Meets Target' : '❌ Exceeds Target'}`);

      baselineResults[engine] = engineResults;
    }

    this.results.tests.baseline = baselineResults;
    return baselineResults;
  }

  async runConcurrentTest(testConfig) {
    console.log(`\n🚀 Running ${testConfig.name}...`);
    console.log(`   Requests: ${testConfig.requests}, Concurrent: ${testConfig.concurrent}`);

    const startTime = performance.now();
    const allResults = [];
    const batches = Math.ceil(testConfig.requests / testConfig.concurrent);

    for (let batch = 0; batch < batches; batch++) {
      const batchStart = performance.now();
      const batchPromises = [];
      const requestsInBatch = Math.min(testConfig.concurrent, testConfig.requests - (batch * testConfig.concurrent));

      // Create concurrent requests for this batch
      for (let i = 0; i < requestsInBatch; i++) {
        const query = LOAD_TEST_QUERIES[Math.floor(Math.random() * LOAD_TEST_QUERIES.length)];
        batchPromises.push(this.makeRequest(query));
      }

      // Wait for all requests in this batch
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);

      const batchEnd = performance.now();
      const batchDuration = batchEnd - batchStart;
      
      process.stdout.write(`Batch ${batch + 1}/${batches}: `);
      batchResults.forEach(r => process.stdout.write(r.success ? '✓' : '✗'));
      console.log(` (${Math.round(batchDuration)}ms)`);

      // Small delay between batches to prevent overwhelming
      if (batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Analyze results
    const successful = allResults.filter(r => r.success);
    const failed = allResults.filter(r => !r.success);
    const durations = successful.map(r => r.duration);

    const testResults = {
      config: testConfig,
      totalRequests: allResults.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      errorRate: failed.length / allResults.length,
      totalDuration,
      throughput: allResults.length / (totalDuration / 1000), // requests per second
      stats: {}
    };

    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      testResults.stats = {
        avgResponseTime: durations.reduce((a, b) => a + b) / durations.length,
        minResponseTime: durations[0],
        maxResponseTime: durations[durations.length - 1],
        medianResponseTime: durations[Math.floor(durations.length / 2)],
        p95ResponseTime: durations[Math.floor(durations.length * 0.95)],
        p99ResponseTime: durations[Math.floor(durations.length * 0.99)]
      };
    }

    // Check if targets are met
    const targets = testConfig.targets;
    testResults.targetsMetric = {
      avgResponseTime: !targets.avgResponseTime || testResults.stats.avgResponseTime <= targets.avgResponseTime,
      maxResponseTime: !targets.maxResponseTime || testResults.stats.maxResponseTime <= targets.maxResponseTime,
      errorRate: testResults.errorRate <= targets.errorRate
    };

    testResults.meetsAllTargets = Object.values(testResults.targetsMetric).every(Boolean);

    console.log(`\n  📊 Results:`);
    console.log(`     Success Rate: ${((successful.length / allResults.length) * 100).toFixed(1)}%`);
    console.log(`     Average Response Time: ${Math.round(testResults.stats.avgResponseTime || 0)}ms`);
    console.log(`     95th Percentile: ${Math.round(testResults.stats.p95ResponseTime || 0)}ms`);
    console.log(`     Throughput: ${testResults.throughput.toFixed(2)} req/sec`);
    console.log(`     ${testResults.meetsAllTargets ? '✅ All Targets Met' : '❌ Some Targets Missed'}`);

    this.results.tests[testConfig.name.toLowerCase().replace(/\s+/g, '_')] = testResults;
    return testResults;
  }

  async runEnduranceTest() {
    console.log('\n⏱️ Running Endurance Test...');
    console.log(`   Duration: ${PERFORMANCE_TESTS.endurance.duration / 1000 / 60} minutes`);

    const config = PERFORMANCE_TESTS.endurance;
    const startTime = performance.now();
    const memoryStart = process.memoryUsage();
    const allResults = [];
    
    let requestCount = 0;
    const maxRequests = config.requests;
    
    while (requestCount < maxRequests) {
      const elapsed = performance.now() - startTime;
      if (elapsed > config.duration) break; // Time limit reached
      
      const batchPromises = [];
      const batchSize = Math.min(config.concurrent, maxRequests - requestCount);
      
      for (let i = 0; i < batchSize; i++) {
        const query = LOAD_TEST_QUERIES[Math.floor(Math.random() * LOAD_TEST_QUERIES.length)];
        batchPromises.push(this.makeRequest(query));
      }
      
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      requestCount += batchSize;
      
      // Progress indicator
      if (requestCount % 20 === 0) {
        const elapsedMinutes = (elapsed / 1000 / 60).toFixed(1);
        const successRate = (allResults.filter(r => r.success).length / allResults.length * 100).toFixed(1);
        console.log(`     Progress: ${requestCount}/${maxRequests} requests, ${elapsedMinutes}min elapsed, ${successRate}% success`);
      }
      
      // Longer delay for endurance test
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const endTime = performance.now();
    const memoryEnd = process.memoryUsage();
    const totalDuration = endTime - startTime;

    // Memory analysis
    const memoryGrowth = {
      rss: ((memoryEnd.rss - memoryStart.rss) / memoryStart.rss) * 100,
      heapUsed: ((memoryEnd.heapUsed - memoryStart.heapUsed) / memoryStart.heapUsed) * 100,
      heapTotal: ((memoryEnd.heapTotal - memoryStart.heapTotal) / memoryStart.heapTotal) * 100
    };

    // Analyze results
    const successful = allResults.filter(r => r.success);
    const durations = successful.map(r => r.duration);

    const enduranceResults = {
      config,
      totalRequests: allResults.length,
      successfulRequests: successful.length,
      failedRequests: allResults.filter(r => !r.success).length,
      errorRate: (allResults.length - successful.length) / allResults.length,
      totalDuration,
      actualDuration: Math.min(totalDuration, config.duration),
      memoryGrowth,
      stats: {}
    };

    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      enduranceResults.stats = {
        avgResponseTime: durations.reduce((a, b) => a + b) / durations.length,
        minResponseTime: durations[0],
        maxResponseTime: durations[durations.length - 1],
        medianResponseTime: durations[Math.floor(durations.length / 2)]
      };
    }

    // Check stability
    const memoryLeakDetected = Math.abs(memoryGrowth.heapUsed) > config.targets.memoryLeakThreshold * 100;
    const performanceStable = enduranceResults.stats.avgResponseTime <= config.targets.avgResponseTime;
    const errorRateOk = enduranceResults.errorRate <= config.targets.errorRate;

    enduranceResults.stable = !memoryLeakDetected && performanceStable && errorRateOk;

    console.log(`\n  📊 Endurance Results:`);
    console.log(`     Duration: ${(enduranceResults.actualDuration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`     Total Requests: ${enduranceResults.totalRequests}`);
    console.log(`     Success Rate: ${((enduranceResults.successfulRequests / enduranceResults.totalRequests) * 100).toFixed(1)}%`);
    console.log(`     Avg Response Time: ${Math.round(enduranceResults.stats.avgResponseTime || 0)}ms`);
    console.log(`     Memory Growth: RSS ${memoryGrowth.rss.toFixed(1)}%, Heap ${memoryGrowth.heapUsed.toFixed(1)}%`);
    console.log(`     ${enduranceResults.stable ? '✅ System Stable' : '❌ Stability Issues Detected'}`);

    this.results.tests.endurance = enduranceResults;
    return enduranceResults;
  }

  async runAllPerformanceTests() {
    console.log('⚡ Wonder Healthcare Platform - Performance Test Suite');
    console.log('='.repeat(60));
    console.log(`System: ${this.results.system.cpu} cores, ${this.results.system.memory} RAM`);
    console.log(`Node.js: ${this.results.system.nodeVersion}`);
    console.log('='.repeat(60));

    const overallStart = performance.now();

    try {
      // Run baseline tests
      await this.runBaselineTest();

      // Run concurrent tests
      await this.runConcurrentTest(PERFORMANCE_TESTS.concurrent);

      // Run stress tests
      await this.runConcurrentTest(PERFORMANCE_TESTS.stress);

      // Run endurance test (optional - can be skipped for faster testing)
      if (process.argv.includes('--full')) {
        await this.runEnduranceTest();
      } else {
        console.log('\n⏭️ Skipping endurance test (use --full flag to run)');
      }

    } catch (error) {
      console.error('\n❌ Performance testing failed:', error.message);
    }

    const overallEnd = performance.now();
    const totalTestDuration = overallEnd - overallStart;

    // Calculate overall summary
    const allResults = Object.values(this.results.tests).flatMap(test => 
      test.responses || (test.totalRequests ? [test] : [])
    );

    if (allResults.length > 0) {
      const successfulResults = allResults.filter(r => r.success || r.successfulRequests > 0);
      this.results.summary = {
        totalTests: Object.keys(this.results.tests).length,
        totalRequests: allResults.reduce((sum, r) => sum + (r.totalRequests || 1), 0),
        successfulRequests: successfulResults.length,
        overallDuration: totalTestDuration
      };
    }

    this.displayPerformanceReport();
    return this.results;
  }

  displayPerformanceReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST REPORT');
    console.log('='.repeat(60));

    // Baseline Results
    if (this.results.tests.baseline) {
      console.log('\n🎯 BASELINE PERFORMANCE:');
      console.log('-'.repeat(40));
      
      Object.entries(this.results.tests.baseline).forEach(([engine, results]) => {
        const icon = results.stats.meetsTarget ? '🟢' : '🔴';
        console.log(`${icon} ${engine}:`);
        console.log(`   Avg: ${Math.round(results.stats.avgResponseTime)}ms (target: ${results.stats.target}ms)`);
        console.log(`   Success: ${results.stats.successRate.toFixed(1)}%`);
      });
    }

    // Load Test Results
    const loadTests = ['concurrent_load_test', 'stress_test'];
    loadTests.forEach(testName => {
      if (this.results.tests[testName]) {
        const test = this.results.tests[testName];
        console.log(`\n🚀 ${test.config.name.toUpperCase()}:`);
        console.log('-'.repeat(40));
        console.log(`Requests: ${test.totalRequests} (${test.config.concurrent} concurrent)`);
        console.log(`Success Rate: ${((test.successfulRequests / test.totalRequests) * 100).toFixed(1)}%`);
        console.log(`Avg Response: ${Math.round(test.stats.avgResponseTime || 0)}ms`);
        console.log(`95th Percentile: ${Math.round(test.stats.p95ResponseTime || 0)}ms`);
        console.log(`Throughput: ${test.throughput.toFixed(2)} req/sec`);
        console.log(`Targets Met: ${test.meetsAllTargets ? '✅' : '❌'}`);
      }
    });

    // Endurance Results
    if (this.results.tests.endurance) {
      const test = this.results.tests.endurance;
      console.log('\n⏱️ ENDURANCE TEST:');
      console.log('-'.repeat(40));
      console.log(`Duration: ${(test.actualDuration / 1000 / 60).toFixed(1)} minutes`);
      console.log(`Requests: ${test.totalRequests}`);
      console.log(`Success Rate: ${((test.successfulRequests / test.totalRequests) * 100).toFixed(1)}%`);
      console.log(`Memory Growth: ${test.memoryGrowth.heapUsed.toFixed(1)}%`);
      console.log(`System Stable: ${test.stable ? '✅' : '❌'}`);
    }

    // Overall Assessment
    console.log('\n🏆 OVERALL PERFORMANCE ASSESSMENT:');
    console.log('='.repeat(60));

    let performanceScore = 100;
    const recommendations = [];

    // Check baseline performance
    if (this.results.tests.baseline) {
      const baselineEngines = Object.values(this.results.tests.baseline);
      const slowEngines = baselineEngines.filter(e => !e.stats.meetsTarget);
      
      if (slowEngines.length > 0) {
        performanceScore -= 20;
        recommendations.push(`Optimize slow engines: ${slowEngines.map(e => e.engine).join(', ')}`);
      }
    }

    // Check load handling
    const loadTests = [this.results.tests.concurrent_load_test, this.results.tests.stress_test].filter(Boolean);
    const failedLoadTests = loadTests.filter(t => !t.meetsAllTargets);
    
    if (failedLoadTests.length > 0) {
      performanceScore -= 25;
      recommendations.push('Improve load handling capacity and response times');
    }

    // Check stability
    if (this.results.tests.endurance && !this.results.tests.endurance.stable) {
      performanceScore -= 30;
      recommendations.push('Address system stability issues and potential memory leaks');
    }

    console.log(`Performance Score: ${performanceScore}/100`);
    
    if (performanceScore >= 90) {
      console.log('🌟 EXCELLENT: System performance meets all requirements');
    } else if (performanceScore >= 75) {
      console.log('✅ GOOD: System performs well with minor optimization opportunities');
    } else if (performanceScore >= 60) {
      console.log('⚠️ NEEDS IMPROVEMENT: Performance issues require attention');
    } else {
      console.log('🚨 CRITICAL: Major performance problems need immediate fixing');
    }

    if (recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }

    console.log('='.repeat(60));
  }
}

// Execute tests if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const performanceSuite = new PerformanceTestSuite();
  performanceSuite.runAllPerformanceTests().catch(console.error);
}

export { PerformanceTestSuite, PERFORMANCE_TESTS };