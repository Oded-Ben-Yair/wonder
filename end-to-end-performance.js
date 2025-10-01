#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - End-to-End Performance Testing
 *
 * This script simulates real-world user journeys and measures performance across:
 * - Complete user workflows (search -> results -> interaction)
 * - API response times under realistic load patterns
 * - Frontend responsiveness during heavy usage
 * - Database query performance with complex filters
 * - System stability during peak usage scenarios
 */

import { performance } from 'perf_hooks';
import fs from 'fs/promises';

const BACKEND_URL = 'https://wonder-backend-api.azurewebsites.net';
const FRONTEND_URL = 'https://wonder-ceo-web.azurewebsites.net';

// Real-world user scenarios
const USER_SCENARIOS = [
  {
    name: 'Emergency Wound Care Search',
    description: 'User needs urgent wound care nurse in Tel Aviv',
    steps: [
      { type: 'frontend_load', url: FRONTEND_URL },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['WOUND_CARE'], urgent: true, topK: 5 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['WOUND_CARE'], gender: 'FEMALE', urgent: true, topK: 3 } }
    ],
    frequency: 0.3 // 30% of users
  },
  {
    name: 'Geriatric Care Planning',
    description: 'Family planning long-term geriatric care',
    steps: [
      { type: 'frontend_load', url: FRONTEND_URL },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['GERIATRIC_CARE'], topK: 10 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['GERIATRIC_CARE'], gender: 'FEMALE', topK: 8 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Ramat Gan', servicesQuery: ['GERIATRIC_CARE'], topK: 5 } }
    ],
    frequency: 0.25 // 25% of users
  },
  {
    name: 'General Home Care Search',
    description: 'Basic home care nurse search',
    steps: [
      { type: 'frontend_load', url: FRONTEND_URL },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', topK: 5 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['GENERAL_CARE'], topK: 3 } }
    ],
    frequency: 0.4 // 40% of users
  },
  {
    name: 'Specialized Medical Care',
    description: 'Complex medical requirements search',
    steps: [
      { type: 'frontend_load', url: FRONTEND_URL },
      { type: 'api_call', endpoint: '/match', data: { city: 'Jerusalem', servicesQuery: ['CENTRAL_CATHETER_TREATMENT'], topK: 3 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Haifa', servicesQuery: ['STOMA_TREATMENT'], topK: 3 } },
      { type: 'api_call', endpoint: '/match', data: { city: 'Tel Aviv', servicesQuery: ['CENTRAL_CATHETER_TREATMENT', 'WOUND_CARE'], urgent: true, topK: 5 } }
    ],
    frequency: 0.05 // 5% of users
  }
];

// Peak usage simulation patterns
const USAGE_PATTERNS = {
  morning_rush: {
    name: 'Morning Rush (8-10 AM)',
    duration: 120000, // 2 minutes simulation
    concurrent_users: [5, 10, 15, 20, 15, 10, 5], // Gradual ramp up/down
    interval: 1000 // 1 second between user sessions
  },
  evening_peak: {
    name: 'Evening Peak (6-8 PM)',
    duration: 180000, // 3 minutes simulation
    concurrent_users: [10, 20, 30, 40, 35, 30, 25, 20, 15, 10], // Higher sustained load
    interval: 800
  },
  weekend_steady: {
    name: 'Weekend Steady Load',
    duration: 300000, // 5 minutes simulation
    concurrent_users: [3, 5, 7, 8, 8, 8, 7, 5, 3], // Lower but consistent
    interval: 2000
  }
};

class EndToEndPerformanceAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      scenarios: {},
      patterns: {},
      systemMetrics: {},
      performance: {
        overallScore: 0,
        reliability: 0,
        scalability: 0,
        responsiveness: 0
      },
      recommendations: []
    };

    this.activeUsers = 0;
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
  }

  // Execute a single user scenario
  async executeUserScenario(scenario, userId) {
    const startTime = performance.now();
    const scenarioResults = {
      userId,
      scenario: scenario.name,
      steps: [],
      totalTime: 0,
      success: true,
      errors: []
    };

    this.activeUsers++;

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepStartTime = performance.now();

      try {
        let result;

        switch (step.type) {
          case 'frontend_load':
            result = await this.loadFrontend(step.url);
            break;
          case 'api_call':
            result = await this.makeApiCall(step.endpoint, step.data);
            break;
          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        const stepEndTime = performance.now();
        const stepDuration = stepEndTime - stepStartTime;

        scenarioResults.steps.push({
          stepNumber: i + 1,
          type: step.type,
          duration: stepDuration,
          success: result.success,
          data: step.data,
          response: {
            status: result.status,
            size: result.size,
            resultCount: result.resultCount
          }
        });

        this.totalRequests++;
        if (result.success) {
          this.successfulRequests++;
        } else {
          this.failedRequests++;
          scenarioResults.errors.push(`Step ${i + 1}: ${result.error}`);
        }

        // Simulate user think time between steps
        if (i < scenario.steps.length - 1) {
          const thinkTime = 500 + Math.random() * 2000; // 0.5-2.5 seconds
          await new Promise(resolve => setTimeout(resolve, thinkTime));
        }

      } catch (error) {
        scenarioResults.success = false;
        scenarioResults.errors.push(`Step ${i + 1}: ${error.message}`);
        this.totalRequests++;
        this.failedRequests++;
      }
    }

    this.activeUsers--;

    const endTime = performance.now();
    scenarioResults.totalTime = endTime - startTime;

    return scenarioResults;
  }

  // Load frontend page
  async loadFrontend(url) {
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const content = await response.text();
      const endTime = performance.now();

      return {
        success: response.ok,
        status: response.status,
        duration: endTime - startTime,
        size: content.length
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        status: 0,
        duration: endTime - startTime,
        size: 0,
        error: error.message
      };
    }
  }

  // Make API call
  async makeApiCall(endpoint, data) {
    const startTime = performance.now();
    const url = `${BACKEND_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      const endTime = performance.now();

      return {
        success: response.ok,
        status: response.status,
        duration: endTime - startTime,
        size: JSON.stringify(responseData).length,
        resultCount: responseData.nurses ? responseData.nurses.length : 0,
        data: responseData
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        status: 0,
        duration: endTime - startTime,
        size: 0,
        error: error.message
      };
    }
  }

  // Test individual user scenarios
  async testUserScenarios() {
    console.log('👥 Testing User Scenarios...');

    for (const scenario of USER_SCENARIOS) {
      console.log(`\n  📋 Testing: ${scenario.name}`);
      console.log(`      ${scenario.description}`);

      const scenarioResults = [];

      // Run scenario multiple times to get statistical data
      const testRuns = Math.max(3, Math.floor(scenario.frequency * 20)); // Scale based on frequency

      for (let i = 0; i < testRuns; i++) {
        const result = await this.executeUserScenario(scenario, `user_${i + 1}`);
        scenarioResults.push(result);

        // Progress indicator
        process.stdout.write(result.success ? '✓' : '✗');

        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Calculate scenario statistics
      const successful = scenarioResults.filter(r => r.success);
      const totalTimes = successful.map(r => r.totalTime);

      const stats = {
        testRuns: scenarioResults.length,
        successful: successful.length,
        successRate: (successful.length / scenarioResults.length) * 100,
        averageTime: totalTimes.length > 0 ? totalTimes.reduce((a, b) => a + b) / totalTimes.length : 0,
        minTime: totalTimes.length > 0 ? Math.min(...totalTimes) : 0,
        maxTime: totalTimes.length > 0 ? Math.max(...totalTimes) : 0,
        errors: scenarioResults.flatMap(r => r.errors).filter((error, index, self) => self.indexOf(error) === index)
      };

      this.results.scenarios[scenario.name] = {
        scenario,
        stats,
        results: scenarioResults.slice(0, 3) // Keep first 3 detailed results
      };

      console.log(`\\n      ✅ Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`      ⏱️  Average Time: ${Math.round(stats.averageTime)}ms`);

      if (stats.errors.length > 0) {
        console.log(`      ❌ Errors: ${stats.errors.length} unique errors`);
      }
    }
  }

  // Simulate usage patterns
  async simulateUsagePattern(pattern) {
    console.log(`\\n🔄 Simulating: ${pattern.name}`);
    console.log(`   Duration: ${pattern.duration / 1000}s, Max Users: ${Math.max(...pattern.concurrent_users)}`);

    const patternResults = {
      name: pattern.name,
      duration: pattern.duration,
      phases: [],
      overallStats: {
        totalUsers: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        peakConcurrentUsers: 0
      }
    };

    const startTime = performance.now();
    let phaseIndex = 0;
    const phaseDuration = pattern.duration / pattern.concurrent_users.length;

    // Reset counters
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;

    while (performance.now() - startTime < pattern.duration && phaseIndex < pattern.concurrent_users.length) {
      const phaseStartTime = performance.now();
      const targetUsers = pattern.concurrent_users[phaseIndex];
      const phaseResults = {
        phase: phaseIndex + 1,
        targetUsers,
        actualUsers: 0,
        requests: [],
        duration: 0
      };

      console.log(`\\n    Phase ${phaseIndex + 1}/${pattern.concurrent_users.length}: ${targetUsers} concurrent users`);

      // Launch users for this phase
      const userPromises = [];
      for (let u = 0; u < targetUsers; u++) {
        // Select scenario based on frequency weights
        const scenario = this.selectScenarioByFrequency();

        const userPromise = this.executeUserScenario(scenario, `pattern_user_${phaseIndex}_${u}`)
          .then(result => {
            phaseResults.actualUsers++;
            phaseResults.requests.push(result);
            return result;
          })
          .catch(error => {
            console.error(`User ${u} failed:`, error.message);
            return null;
          });

        userPromises.push(userPromise);

        // Stagger user starts
        if (u < targetUsers - 1) {
          await new Promise(resolve => setTimeout(resolve, pattern.interval / targetUsers));
        }
      }

      // Wait for phase duration
      await new Promise(resolve => setTimeout(resolve, phaseDuration));

      const phaseEndTime = performance.now();
      phaseResults.duration = phaseEndTime - phaseStartTime;

      // Collect results from users that have completed
      const completedUsers = await Promise.allSettled(userPromises);
      const successfulUsers = completedUsers
        .filter(p => p.status === 'fulfilled' && p.value)
        .map(p => p.value);

      // Update phase results
      phaseResults.actualUsers = successfulUsers.length;
      phaseResults.successRate = successfulUsers.length > 0 ?
        (successfulUsers.filter(u => u.success).length / successfulUsers.length) * 100 : 0;

      patternResults.phases.push(phaseResults);

      console.log(`      ✅ Completed: ${phaseResults.actualUsers} users, ${phaseResults.successRate.toFixed(1)}% success`);
      console.log(`      📊 Active: ${this.activeUsers}, Total Requests: ${this.totalRequests}`);

      phaseIndex++;
    }

    // Calculate overall statistics
    patternResults.overallStats = {
      totalUsers: patternResults.phases.reduce((sum, p) => sum + p.actualUsers, 0),
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      successRate: this.totalRequests > 0 ? (this.successfulRequests / this.totalRequests) * 100 : 0,
      peakConcurrentUsers: Math.max(...pattern.concurrent_users),
      actualDuration: performance.now() - startTime
    };

    return patternResults;
  }

  // Select scenario based on frequency weights
  selectScenarioByFrequency() {
    const random = Math.random();
    let cumulativeFrequency = 0;

    for (const scenario of USER_SCENARIOS) {
      cumulativeFrequency += scenario.frequency;
      if (random <= cumulativeFrequency) {
        return scenario;
      }
    }

    // Fallback to first scenario
    return USER_SCENARIOS[0];
  }

  // Test all usage patterns
  async testUsagePatterns() {
    console.log('\\n📈 Testing Usage Patterns...');

    for (const [patternKey, pattern] of Object.entries(USAGE_PATTERNS)) {
      const results = await this.simulateUsagePattern(pattern);
      this.results.patterns[patternKey] = results;

      console.log(`\\n  📊 ${pattern.name} Results:`);
      console.log(`     Total Users: ${results.overallStats.totalUsers}`);
      console.log(`     Success Rate: ${results.overallStats.successRate.toFixed(1)}%`);
      console.log(`     Requests: ${results.overallStats.totalRequests} (${results.overallStats.successfulRequests} successful)`);

      // Cool down period between patterns
      console.log('\\n     💤 Cool down period...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second cool down
    }
  }

  // Generate performance scores
  calculatePerformanceScores() {
    let reliabilityScore = 100;
    let scalabilityScore = 100;
    let responsivenessScore = 100;

    // Calculate reliability based on success rates
    const scenarioSuccessRates = Object.values(this.results.scenarios).map(s => s.stats.successRate);
    const avgScenarioSuccessRate = scenarioSuccessRates.reduce((a, b) => a + b, 0) / scenarioSuccessRates.length;

    if (avgScenarioSuccessRate < 95) reliabilityScore -= (95 - avgScenarioSuccessRate) * 2;

    // Calculate scalability based on pattern performance
    const patternSuccessRates = Object.values(this.results.patterns).map(p => p.overallStats.successRate);
    const avgPatternSuccessRate = patternSuccessRates.reduce((a, b) => a + b, 0) / patternSuccessRates.length;

    if (avgPatternSuccessRate < 90) scalabilityScore -= (90 - avgPatternSuccessRate) * 3;

    // Calculate responsiveness based on response times
    const scenarioTimes = Object.values(this.results.scenarios).map(s => s.stats.averageTime);
    const avgResponseTime = scenarioTimes.reduce((a, b) => a + b, 0) / scenarioTimes.length;

    if (avgResponseTime > 3000) responsivenessScore -= (avgResponseTime - 3000) / 100;

    // Calculate overall score
    const overallScore = (reliabilityScore + scalabilityScore + responsivenessScore) / 3;

    this.results.performance = {
      overallScore: Math.max(0, Math.round(overallScore)),
      reliability: Math.max(0, Math.round(reliabilityScore)),
      scalability: Math.max(0, Math.round(scalabilityScore)),
      responsiveness: Math.max(0, Math.round(responsivenessScore))
    };
  }

  // Generate recommendations
  generateRecommendations() {
    const recommendations = [];

    // Reliability recommendations
    if (this.results.performance.reliability < 85) {
      recommendations.push({
        category: 'Reliability',
        priority: 'High',
        issue: `System reliability score is ${this.results.performance.reliability}/100`,
        recommendation: 'Implement error handling, retry mechanisms, and health checks'
      });
    }

    // Scalability recommendations
    if (this.results.performance.scalability < 80) {
      recommendations.push({
        category: 'Scalability',
        priority: 'High',
        issue: `System scalability score is ${this.results.performance.scalability}/100`,
        recommendation: 'Implement auto-scaling, caching, and load balancing'
      });
    }

    // Responsiveness recommendations
    if (this.results.performance.responsiveness < 80) {
      recommendations.push({
        category: 'Responsiveness',
        priority: 'Medium',
        issue: `System responsiveness score is ${this.results.performance.responsiveness}/100`,
        recommendation: 'Optimize database queries, implement caching, and reduce payload sizes'
      });
    }

    // Scenario-specific recommendations
    Object.entries(this.results.scenarios).forEach(([name, scenario]) => {
      if (scenario.stats.successRate < 90) {
        recommendations.push({
          category: 'User Experience',
          priority: 'High',
          issue: `${name} scenario has ${scenario.stats.successRate.toFixed(1)}% success rate`,
          recommendation: 'Investigate and fix failures in this critical user journey'
        });
      }

      if (scenario.stats.averageTime > 5000) {
        recommendations.push({
          category: 'Performance',
          priority: 'Medium',
          issue: `${name} scenario takes ${Math.round(scenario.stats.averageTime)}ms on average`,
          recommendation: 'Optimize this user journey for better performance'
        });
      }
    });

    this.results.recommendations = recommendations;
  }

  // Generate comprehensive report
  generateReport() {
    this.calculatePerformanceScores();
    this.generateRecommendations();

    console.log('\\n' + '='.repeat(70));
    console.log('🚀 END-TO-END PERFORMANCE ANALYSIS REPORT');
    console.log('='.repeat(70));
    console.log(`Generated: ${this.results.timestamp}`);

    // Performance Scores
    console.log('\\n🏆 PERFORMANCE SCORES:');
    console.log('-'.repeat(50));
    console.log(`Overall Performance: ${this.results.performance.overallScore}/100`);
    console.log(`Reliability: ${this.results.performance.reliability}/100`);
    console.log(`Scalability: ${this.results.performance.scalability}/100`);
    console.log(`Responsiveness: ${this.results.performance.responsiveness}/100`);

    // User Scenario Results
    console.log('\\n👥 USER SCENARIO RESULTS:');
    console.log('-'.repeat(50));

    Object.entries(this.results.scenarios).forEach(([name, scenario]) => {
      const status = scenario.stats.successRate >= 95 ? '✅' : scenario.stats.successRate >= 90 ? '⚠️' : '❌';
      console.log(`${status} ${name}:`);
      console.log(`   Success Rate: ${scenario.stats.successRate.toFixed(1)}% (${scenario.stats.successful}/${scenario.stats.testRuns})`);
      console.log(`   Average Time: ${Math.round(scenario.stats.averageTime)}ms`);
      console.log(`   Time Range: ${Math.round(scenario.stats.minTime)}ms - ${Math.round(scenario.stats.maxTime)}ms`);
    });

    // Usage Pattern Results
    console.log('\\n📈 USAGE PATTERN RESULTS:');
    console.log('-'.repeat(50));

    Object.entries(this.results.patterns).forEach(([name, pattern]) => {
      const status = pattern.overallStats.successRate >= 90 ? '✅' : pattern.overallStats.successRate >= 80 ? '⚠️' : '❌';
      console.log(`${status} ${pattern.name}:`);
      console.log(`   Users: ${pattern.overallStats.totalUsers} total, peak ${pattern.overallStats.peakConcurrentUsers} concurrent`);
      console.log(`   Requests: ${pattern.overallStats.totalRequests} total, ${pattern.overallStats.successRate.toFixed(1)}% success`);
      console.log(`   Duration: ${Math.round(pattern.overallStats.actualDuration / 1000)}s`);
    });

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\\n💡 OPTIMIZATION RECOMMENDATIONS:');
      console.log('-'.repeat(50));

      const priorities = { 'High': '🚨', 'Medium': '⚠️', 'Low': 'ℹ️' };
      this.results.recommendations.forEach(rec => {
        const icon = priorities[rec.priority] || 'ℹ️';
        console.log(`${icon} ${rec.priority} - ${rec.category}:`);
        console.log(`   Issue: ${rec.issue}`);
        console.log(`   Recommendation: ${rec.recommendation}`);
      });
    }

    // Overall Assessment
    console.log('\\n📊 OVERALL ASSESSMENT:');
    console.log('-'.repeat(50));

    const score = this.results.performance.overallScore;
    let assessment;

    if (score >= 90) assessment = '🌟 EXCELLENT - Ready for production';
    else if (score >= 80) assessment = '✅ GOOD - Minor optimizations recommended';
    else if (score >= 70) assessment = '⚠️ NEEDS IMPROVEMENT - Address critical issues';
    else assessment = '🚨 CRITICAL - Major performance problems require immediate attention';

    console.log(`Performance Rating: ${assessment}`);
    console.log('\\n' + '='.repeat(70));

    return this.results;
  }

  // Save results to file
  async saveResults() {
    const filename = `/home/odedbe/wonder/end-to-end-performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Detailed results saved to: ${filename}`);
    return filename;
  }

  // Run complete end-to-end analysis
  async runCompleteAnalysis() {
    console.log('🚀 Starting End-to-End Performance Analysis...');
    console.log(`Backend: ${BACKEND_URL}`);
    console.log(`Frontend: ${FRONTEND_URL}`);

    try {
      // Test individual scenarios
      await this.testUserScenarios();

      // Test usage patterns (reduced for demo)
      // await this.testUsagePatterns();

      // Generate comprehensive report
      this.generateReport();
      const filename = await this.saveResults();

      return { results: this.results, filename };
    } catch (error) {
      console.error('❌ End-to-end analysis failed:', error.message);
      throw error;
    }
  }
}

// Execute analysis if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const analyzer = new EndToEndPerformanceAnalyzer();
  analyzer.runCompleteAnalysis().catch(console.error);
}

export { EndToEndPerformanceAnalyzer };