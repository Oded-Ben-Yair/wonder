// @ts-check
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Wonder Healthcare Platform - Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up performance monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });

  test('should measure page load performance', async ({ page }) => {
    console.log('📊 Measuring page load performance...');

    const startTime = Date.now();

    // Navigate to the application
    await page.goto('/', { waitUntil: 'load' });

    const loadTime = Date.now() - startTime;

    // Wait for network to be idle
    const networkIdleStart = Date.now();
    await page.waitForLoadState('networkidle');
    const networkIdleTime = Date.now() - networkIdleStart;

    // Wait for DOM to be ready
    const domReadyStart = Date.now();
    await page.waitForLoadState('domcontentloaded');
    const domReadyTime = Date.now() - domReadyStart;

    // Measure Time to Interactive (TTI) approximation
    const ttiStart = Date.now();
    await page.waitForFunction(() => {
      // Check if page is interactive (has clickable elements)
      const buttons = document.querySelectorAll('button, [role="button"], input, a');
      return buttons.length > 0;
    }, { timeout: 30000 });
    const ttiTime = Date.now() - ttiStart;

    // Take screenshot after load
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '44-performance-loaded.png'),
      fullPage: true
    });

    // Performance metrics
    const performanceMetrics = {
      totalLoadTime: loadTime,
      networkIdleTime: networkIdleTime,
      domReadyTime: domReadyTime,
      timeToInteractive: ttiTime
    };

    console.log('\n🔍 Page Load Performance Metrics:');
    console.log(`Total Load Time: ${performanceMetrics.totalLoadTime}ms`);
    console.log(`Network Idle Time: ${performanceMetrics.networkIdleTime}ms`);
    console.log(`DOM Ready Time: ${performanceMetrics.domReadyTime}ms`);
    console.log(`Time to Interactive: ${performanceMetrics.timeToInteractive}ms`);

    // Performance assertions
    expect(performanceMetrics.totalLoadTime).toBeLessThan(10000); // Should load in under 10 seconds
    expect(performanceMetrics.timeToInteractive).toBeLessThan(15000); // Should be interactive in under 15 seconds

    // Performance grades
    const gradeLoadTime = performanceMetrics.totalLoadTime < 3000 ? 'A' :
                         performanceMetrics.totalLoadTime < 5000 ? 'B' :
                         performanceMetrics.totalLoadTime < 8000 ? 'C' : 'D';

    console.log(`Load Time Grade: ${gradeLoadTime}`);

    if (performanceMetrics.totalLoadTime < 5000) {
      console.log('✓ Excellent load performance');
    } else if (performanceMetrics.totalLoadTime < 8000) {
      console.log('⚠ Acceptable load performance');
    } else {
      console.log('❌ Poor load performance');
    }
  });

  test('should measure query response times', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('📊 Measuring query response times...');

    const queries = [
      'Tel Aviv',
      'Haifa',
      'nurse',
      'wound care',
      'urgent'
    ];

    const queryMetrics = [];

    // Find input element
    const inputElement = page.locator('input[type="text"]').first();

    if (!(await inputElement.isVisible())) {
      // Try to activate chat/search interface
      const activatorButton = page.locator('button, [role="button"]').first();
      if (await activatorButton.isVisible()) {
        await activatorButton.click();
        await page.waitForTimeout(1000);
      }
    }

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`Testing query response time: "${query}"`);

      const inputEl = page.locator('input[type="text"], textarea').first();

      if (await inputEl.isVisible()) {
        await inputEl.fill(query);

        const queryStartTime = Date.now();

        // Submit query
        const submitButton = page.locator('button:has-text("Search"), button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
        } else {
          await inputEl.press('Enter');
        }

        // Wait for response (look for changes in the page)
        try {
          await page.waitForFunction(
            () => document.body.innerText.length > 1000,
            { timeout: 15000 }
          );
        } catch (error) {
          // If no significant content change, wait for a fixed time
          await page.waitForTimeout(3000);
        }

        const queryEndTime = Date.now();
        const responseTime = queryEndTime - queryStartTime;

        queryMetrics.push({
          query,
          responseTime,
          timestamp: new Date().toISOString()
        });

        console.log(`Response time for "${query}": ${responseTime}ms`);

        // Take screenshot of response
        await page.screenshot({
          path: path.join('/home/odedbe/wonder/test-screenshots', `45-query-response-${i + 1}.png`),
          fullPage: true
        });

        // Clear for next test
        await page.waitForTimeout(1000);
        await inputEl.fill('');
      }
    }

    // Calculate performance statistics
    const responseTimes = queryMetrics.map(m => m.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    console.log('\n🔍 Query Response Performance:');
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);
    console.log(`Minimum Response Time: ${minResponseTime}ms`);
    console.log(`Maximum Response Time: ${maxResponseTime}ms`);

    // Performance assertions
    expect(avgResponseTime).toBeLessThan(8000); // Average should be under 8 seconds
    expect(maxResponseTime).toBeLessThan(15000); // Max should be under 15 seconds

    // Performance grades
    const gradeAvgResponse = avgResponseTime < 2000 ? 'A' :
                            avgResponseTime < 4000 ? 'B' :
                            avgResponseTime < 6000 ? 'C' : 'D';

    console.log(`Query Response Grade: ${gradeAvgResponse}`);
  });

  test('should test memory usage and leaks', async ({ page }) => {
    console.log('📊 Testing memory usage...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial memory usage (approximation)
    const initialMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (initialMetrics) {
      console.log('Initial Memory Usage:');
      console.log(`Used JS Heap: ${Math.round(initialMetrics.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`Total JS Heap: ${Math.round(initialMetrics.totalJSHeapSize / 1024 / 1024)}MB`);
    }

    // Perform multiple operations to test for memory leaks
    const inputElement = page.locator('input[type="text"]').first();

    if (!(await inputElement.isVisible())) {
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(1000);
      }
    }

    // Simulate heavy usage
    for (let i = 0; i < 10; i++) {
      const input = page.locator('input').first();
      if (await input.isVisible()) {
        await input.fill(`Test query ${i}`);
        await input.press('Enter');
        await page.waitForTimeout(1000);
        await input.fill('');
      }

      // Navigate to different parts of the app if possible
      const buttons = await page.locator('button').all();
      if (buttons.length > i % buttons.length) {
        await buttons[i % buttons.length].click();
        await page.waitForTimeout(500);
      }
    }

    // Get final memory usage
    const finalMetrics = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (initialMetrics && finalMetrics) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMetrics.usedJSHeapSize) * 100;

      console.log('\nFinal Memory Usage:');
      console.log(`Used JS Heap: ${Math.round(finalMetrics.usedJSHeapSize / 1024 / 1024)}MB`);
      console.log(`Memory Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${Math.round(memoryIncreasePercent)}%)`);

      // Take screenshot of final state
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', '46-memory-test-final.png'),
        fullPage: true
      });

      if (memoryIncreasePercent > 200) {
        console.log('⚠ Significant memory increase detected - possible memory leak');
      } else if (memoryIncreasePercent > 100) {
        console.log('⚠ Moderate memory increase detected');
      } else {
        console.log('✓ Memory usage appears stable');
      }
    } else {
      console.log('⚠ Memory metrics not available in this browser');
    }
  });

  test('should test performance under load', async ({ page }) => {
    console.log('📊 Testing performance under simulated load...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Rapid fire queries to simulate load
    const rapidQueries = [
      'Tel Aviv',
      'Haifa',
      'Jerusalem',
      'wound care',
      'pediatric',
      'urgent',
      'geriatric',
      'orthopedic'
    ];

    const loadTestMetrics = [];

    console.log('Performing rapid-fire queries...');

    for (let round = 0; round < 3; round++) {
      console.log(`Load test round ${round + 1}/3`);

      for (let i = 0; i < rapidQueries.length; i++) {
        const query = rapidQueries[i];
        const startTime = Date.now();

        const input = page.locator('input').first();
        if (await input.isVisible()) {
          await input.fill(query);
          await input.press('Enter');

          // Short wait to see initial response
          await page.waitForTimeout(200);

          const endTime = Date.now();
          loadTestMetrics.push({
            round: round + 1,
            query,
            responseTime: endTime - startTime
          });
        }

        // Very short pause between queries
        await page.waitForTimeout(100);
      }

      // Longer pause between rounds
      await page.waitForTimeout(2000);

      // Take screenshot after each round
      await page.screenshot({
        path: path.join('/home/odedbe/wonder/test-screenshots', `47-load-test-round-${round + 1}.png`),
        fullPage: true
      });
    }

    // Analyze load test results
    const avgResponseTimes = [1, 2, 3].map(round => {
      const roundMetrics = loadTestMetrics.filter(m => m.round === round);
      const roundTimes = roundMetrics.map(m => m.responseTime);
      return roundTimes.reduce((a, b) => a + b, 0) / roundTimes.length;
    });

    console.log('\n🔍 Load Test Results:');
    avgResponseTimes.forEach((avg, index) => {
      console.log(`Round ${index + 1} Average Response: ${Math.round(avg)}ms`);
    });

    // Check for performance degradation
    const degradation = avgResponseTimes[2] - avgResponseTimes[0];
    const degradationPercent = (degradation / avgResponseTimes[0]) * 100;

    console.log(`Performance Change: ${Math.round(degradation)}ms (${Math.round(degradationPercent)}%)`);

    if (degradationPercent > 50) {
      console.log('⚠ Significant performance degradation under load');
    } else if (degradationPercent > 20) {
      console.log('⚠ Moderate performance degradation under load');
    } else {
      console.log('✓ Performance stable under load');
    }
  });

  test('should measure network performance', async ({ page }) => {
    console.log('📊 Measuring network performance...');

    let networkRequests = [];
    let networkResponses = [];

    // Monitor network activity
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      });
    });

    const navigationStart = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navigationEnd = Date.now();
    const totalNetworkTime = navigationEnd - navigationStart;

    console.log('\n🔍 Network Performance:');
    console.log(`Total Network Time: ${totalNetworkTime}ms`);
    console.log(`Total Requests: ${networkRequests.length}`);
    console.log(`Total Responses: ${networkResponses.length}`);

    // Analyze request types
    const requestTypes = {};
    networkRequests.forEach(req => {
      const url = new URL(req.url);
      const extension = url.pathname.split('.').pop() || 'unknown';
      requestTypes[extension] = (requestTypes[extension] || 0) + 1;
    });

    console.log('Request Types:', requestTypes);

    // Take screenshot of network loaded state
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '48-network-performance.png'),
      fullPage: true
    });

    // Network performance assertions
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(networkResponses.length).toBeGreaterThan(0);
    expect(totalNetworkTime).toBeLessThan(15000); // Should complete network activity in under 15 seconds

    if (totalNetworkTime < 3000) {
      console.log('✓ Excellent network performance');
    } else if (totalNetworkTime < 6000) {
      console.log('✓ Good network performance');
    } else if (totalNetworkTime < 10000) {
      console.log('⚠ Acceptable network performance');
    } else {
      console.log('❌ Poor network performance');
    }
  });

  test('should generate performance summary', async ({ page }) => {
    console.log('📊 Generating performance summary...');

    // Run a final comprehensive test
    const performanceTest = {
      startTime: Date.now(),
      phases: {}
    };

    // Phase 1: Initial Load
    console.log('Phase 1: Initial Load');
    const loadStart = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    performanceTest.phases.initialLoad = Date.now() - loadStart;

    // Phase 2: User Interaction
    console.log('Phase 2: User Interaction');
    const interactionStart = Date.now();
    const input = page.locator('input').first();
    if (await input.isVisible()) {
      await input.fill('performance test');
      await input.press('Enter');
      await page.waitForTimeout(2000);
    }
    performanceTest.phases.userInteraction = Date.now() - interactionStart;

    // Phase 3: Navigation (if tabs exist)
    console.log('Phase 3: Navigation');
    const navStart = Date.now();
    const navButtons = await page.locator('button, [role="button"]').all();
    if (navButtons.length > 1) {
      await navButtons[1].click();
      await page.waitForTimeout(1000);
    }
    performanceTest.phases.navigation = Date.now() - navStart;

    performanceTest.totalTime = Date.now() - performanceTest.startTime;

    // Final comprehensive screenshot
    await page.screenshot({
      path: path.join('/home/odedbe/wonder/test-screenshots', '49-performance-summary.png'),
      fullPage: true
    });

    console.log('\n📋 Performance Summary:');
    console.log(`Initial Load: ${performanceTest.phases.initialLoad}ms`);
    console.log(`User Interaction: ${performanceTest.phases.userInteraction}ms`);
    console.log(`Navigation: ${performanceTest.phases.navigation}ms`);
    console.log(`Total Test Time: ${performanceTest.totalTime}ms`);

    // Overall performance grade
    const totalPhaseTime = Object.values(performanceTest.phases).reduce((a, b) => a + b, 0);
    const overallGrade = totalPhaseTime < 5000 ? 'A' :
                        totalPhaseTime < 10000 ? 'B' :
                        totalPhaseTime < 15000 ? 'C' : 'D';

    console.log(`Overall Performance Grade: ${overallGrade}`);

    expect(totalPhaseTime).toBeLessThan(20000); // Total should be under 20 seconds
    console.log('✓ Performance summary completed');
  });
});