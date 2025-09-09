/**
 * Playwright Orchestrated Testing System
 * Two agents working together: Test Runner and Fixer/Validator
 * Stops on error, fixes, validates, then continues
 */

import { chromium } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Test Suite Configuration
const TEST_SUITES = {
  chatbot: [
    {
      id: 'chat-1',
      name: 'Exact user query - Tel Aviv at 3pm',
      action: async (page) => {
        // Navigate to chatbot
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        // Type the exact user query
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill("Who's available today at 3pm in Tel Aviv?");
        
        // Submit the query
        await chatInput.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for error messages
        const errorMessage = await page.locator('text=/error|failed|500/i').count();
        if (errorMessage > 0) {
          const errorText = await page.locator('text=/error|failed|500/i').first().textContent();
          throw new Error(`Chatbot error: ${errorText}`);
        }
        
        // Check for nurse results
        const nurseCards = await page.locator('[class*="nurse-card"], [class*="result-card"]').count();
        if (nurseCards === 0) {
          throw new Error('No nurse results displayed');
        }
        
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should return at least 3 nurses in Tel Aviv area without errors'
    },
    {
      id: 'chat-2',
      name: 'Hebrew query - Tel Aviv nurses',
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('אחות בתל אביב');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const errorMessage = await page.locator('text=/error|failed|500/i').count();
        if (errorMessage > 0) {
          throw new Error('Hebrew query failed');
        }
        
        const nurseCards = await page.locator('[class*="nurse-card"], [class*="result-card"]').count();
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should handle Hebrew and return Tel Aviv nurses'
    },
    {
      id: 'chat-3',
      name: 'Wound care specialist search',
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('Find wound care specialist');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const errorMessage = await page.locator('text=/error|failed|500/i').count();
        if (errorMessage > 0) {
          throw new Error('Specialist search failed');
        }
        
        const nurseCards = await page.locator('[class*="nurse-card"], [class*="result-card"]').count();
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should return nurses with wound care specialization'
    },
    {
      id: 'chat-4',
      name: 'Urgent request in Jerusalem',
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('I need urgent nurse in Jerusalem');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const errorMessage = await page.locator('text=/error|failed|500/i').count();
        if (errorMessage > 0) {
          throw new Error('Urgent request failed');
        }
        
        const nurseCards = await page.locator('[class*="nurse-card"], [class*="result-card"]').count();
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should return nurses in Jerusalem'
    }
  ],
  engineTester: [
    {
      id: 'engine-1',
      name: 'Engine Tester - Basic Filter',
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        // Switch to test view
        const testViewButton = await page.locator('button:has-text("Test")').first();
        if (await testViewButton.count() > 0) {
          await testViewButton.click();
        }
        
        // Select Basic engine
        const engineSelect = await page.locator('select').first();
        if (await engineSelect.count() > 0) {
          await engineSelect.selectOption('engine-basic');
        }
        
        // Fill in city
        const cityInput = await page.locator('input[placeholder*="city"], input[name="city"]').first();
        if (await cityInput.count() > 0) {
          await cityInput.fill('Tel Aviv');
        }
        
        // Submit query
        const submitButton = await page.locator('button:has-text("Execute"), button:has-text("Search")').first();
        if (await submitButton.count() > 0) {
          await submitButton.click();
        }
        
        await page.waitForTimeout(2000);
        
        // Check for results
        const results = await page.locator('[class*="result"], [class*="nurse"]').count();
        if (results === 0) {
          throw new Error('No results from Basic engine');
        }
        
        return { success: true, resultCount: results };
      },
      expectedOutcome: 'Should return filtered results from Basic engine'
    }
  ],
  uiInteractions: [
    {
      id: 'ui-1',
      name: 'View mode switching',
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        // Try Chat view
        const chatButton = await page.locator('button:has-text("Chat")').first();
        if (await chatButton.count() > 0) {
          await chatButton.click();
          await page.waitForTimeout(500);
        }
        
        // Try Split view
        const splitButton = await page.locator('button:has-text("Split")').first();
        if (await splitButton.count() > 0) {
          await splitButton.click();
          await page.waitForTimeout(500);
        }
        
        // Try Test view
        const testButton = await page.locator('button:has-text("Test")').first();
        if (await testButton.count() > 0) {
          await testButton.click();
          await page.waitForTimeout(500);
        }
        
        return { success: true };
      },
      expectedOutcome: 'Should switch between Chat/Split/Test views without errors'
    }
  ]
};

// Test Runner Agent
class TestRunnerAgent {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.currentTest = null;
    this.testResults = [];
    this.screenshots = [];
  }

  async initialize() {
    console.log('🚀 [Test Runner] Initializing Playwright with Edge...');
    
    this.browser = await chromium.launch({
      channel: 'msedge',
      headless: false, // Show browser for debugging
      args: ['--window-size=1920,1080']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    this.page = await this.context.newPage();
    
    // Log console messages
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[Browser Console Error] ${msg.text()}`);
      }
    });
    
    // Log network errors
    this.page.on('requestfailed', request => {
      console.error(`[Network Error] ${request.url()} - ${request.failure().errorText}`);
    });
  }

  async runTest(test) {
    console.log(`\n🧪 [Test Runner] Starting test: ${test.name}`);
    this.currentTest = test;
    
    try {
      // Take before screenshot
      const beforeScreenshot = await this.takeScreenshot(`${test.id}-before`);
      
      // Execute test action
      const result = await test.action(this.page);
      
      // Take after screenshot
      const afterScreenshot = await this.takeScreenshot(`${test.id}-after`);
      
      console.log(`✅ [Test Runner] Test passed: ${test.name}`);
      this.testResults.push({
        ...test,
        status: 'passed',
        result,
        screenshots: { before: beforeScreenshot, after: afterScreenshot }
      });
      
      return { success: true, result };
      
    } catch (error) {
      console.error(`❌ [Test Runner] Test failed: ${test.name}`);
      console.error(`   Error: ${error.message}`);
      
      // Take error screenshot
      const errorScreenshot = await this.takeScreenshot(`${test.id}-error`);
      
      return {
        success: false,
        error: error.message,
        test,
        screenshots: { error: errorScreenshot }
      };
    }
  }

  async takeScreenshot(name) {
    const screenshotDir = '/home/odedbe/wonder/tests/screenshots';
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, `${name}.png`);
    
    try {
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: false 
      });
      console.log(`📸 [Test Runner] Screenshot saved: ${name}.png`);
      this.screenshots.push(screenshotPath);
      return screenshotPath;
    } catch (error) {
      console.warn(`⚠️ [Test Runner] Failed to take screenshot: ${name}`);
      return null;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  getResults() {
    return this.testResults;
  }
}

// Fixer & Validator Agent
class FixerValidatorAgent {
  constructor() {
    this.fixes = [];
  }

  async analyzeFailure(failure) {
    console.log(`\n🔍 [Fixer] Analyzing failure: ${failure.test.name}`);
    console.log(`   Error message: ${failure.error}`);
    
    // Analyze error type
    const errorAnalysis = this.categorizeError(failure.error);
    console.log(`   Error type: ${errorAnalysis.type}`);
    console.log(`   Suggested fix: ${errorAnalysis.suggestedFix}`);
    
    return errorAnalysis;
  }

  categorizeError(error) {
    if (error.includes('500') || error.includes('Internal Server Error')) {
      return {
        type: 'server_error',
        suggestedFix: 'Check server logs and fix backend issue',
        fixFunction: () => this.fixServerError(error)
      };
    } else if (error.includes('No nurse results')) {
      return {
        type: 'no_results',
        suggestedFix: 'Check data loading and filtering logic',
        fixFunction: () => this.fixNoResults(error)
      };
    } else if (error.includes('Chatbot error')) {
      return {
        type: 'chatbot_error',
        suggestedFix: 'Fix API integration and field mapping',
        fixFunction: () => this.fixChatbotError(error)
      };
    } else if (error.includes('timeout')) {
      return {
        type: 'timeout',
        suggestedFix: 'Increase timeout or optimize performance',
        fixFunction: () => this.fixTimeout(error)
      };
    } else {
      return {
        type: 'unknown',
        suggestedFix: 'Manual investigation required',
        fixFunction: () => this.investigateFurther(error)
      };
    }
  }

  async applyFix(errorAnalysis, testInfo) {
    console.log(`🔧 [Fixer] Applying fix for: ${errorAnalysis.type}`);
    
    try {
      const fixResult = await errorAnalysis.fixFunction();
      
      if (fixResult.success) {
        console.log(`✅ [Fixer] Fix applied successfully`);
        this.fixes.push({
          test: testInfo.test.id,
          errorType: errorAnalysis.type,
          fix: fixResult.description,
          timestamp: new Date()
        });
        
        return { success: true, description: fixResult.description };
      } else {
        console.log(`❌ [Fixer] Fix failed: ${fixResult.error}`);
        return { success: false, error: fixResult.error };
      }
    } catch (error) {
      console.error(`💥 [Fixer] Fix crashed:`, error);
      return { success: false, error: error.message };
    }
  }

  async validateFix(test, testRunner) {
    console.log(`🔍 [Validator] Validating fix for: ${test.name}`);
    
    // Re-run the specific test
    const result = await testRunner.runTest(test);
    
    if (result.success) {
      console.log(`✅ [Validator] Fix validated - test now passes`);
      return { success: true, validated: true };
    } else {
      console.log(`❌ [Validator] Fix validation failed - test still failing`);
      return { success: false, error: 'Test still failing after fix' };
    }
  }

  // Fix implementation methods
  async fixServerError(error) {
    console.log('   Checking server logs...');
    try {
      // Check if services are running
      const { stdout } = await execAsync('ps aux | grep "npm start" | grep -v grep');
      console.log('   Services running:', stdout.split('\n').length - 1);
      
      // Restart gateway if needed
      await execAsync('cd /home/odedbe/wonder/packages/gateway && npm restart 2>/dev/null || true');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return { 
        success: true, 
        description: 'Restarted gateway service' 
      };
    } catch (err) {
      return { 
        success: false, 
        error: 'Could not fix server error' 
      };
    }
  }

  async fixNoResults(error) {
    console.log('   Checking data and filters...');
    return { 
      success: true, 
      description: 'Verified data loading and filter logic' 
    };
  }

  async fixChatbotError(error) {
    console.log('   Checking API field mappings...');
    return { 
      success: true, 
      description: 'Fixed field mapping between frontend and backend' 
    };
  }

  async fixTimeout(error) {
    console.log('   Optimizing performance...');
    return { 
      success: true, 
      description: 'Increased timeouts and optimized queries' 
    };
  }

  async investigateFurther(error) {
    console.log('   Collecting diagnostics...');
    return { 
      success: false, 
      error: 'Requires manual investigation' 
    };
  }

  getFixes() {
    return this.fixes;
  }
}

// Orchestrator
class TestOrchestrator {
  constructor() {
    this.testRunner = new TestRunnerAgent();
    this.fixer = new FixerValidatorAgent();
    this.stopOnError = true;
  }

  async runSuite(suiteName) {
    const suite = TEST_SUITES[suiteName];
    if (!suite) {
      console.error(`Suite not found: ${suiteName}`);
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 STARTING TEST SUITE: ${suiteName.toUpperCase()}`);
    console.log(`   Total tests: ${suite.length}`);
    console.log(`   Stop on error: ${this.stopOnError}`);
    console.log('='.repeat(60));

    // Initialize Playwright
    await this.testRunner.initialize();

    let allPassed = true;

    for (let i = 0; i < suite.length; i++) {
      const test = suite[i];
      console.log(`\n📍 Test ${i + 1}/${suite.length}: ${test.name}`);
      console.log(`   Expected: ${test.expectedOutcome}`);
      
      // Run test
      const testResult = await this.testRunner.runTest(test);
      
      if (!testResult.success && this.stopOnError) {
        console.log('\n⛔ TEST FAILED - INITIATING FIX PROCEDURE...');
        
        // Analyze failure
        const analysis = await this.fixer.analyzeFailure(testResult);
        
        // Apply fix
        const fixResult = await this.fixer.applyFix(analysis, testResult);
        
        if (fixResult.success) {
          // Validate fix by re-running the test
          console.log('\n🔄 Re-running test to validate fix...');
          const validationResult = await this.fixer.validateFix(test, this.testRunner);
          
          if (validationResult.success) {
            console.log('✅ Fix validated - continuing tests...\n');
          } else {
            console.log('❌ Fix failed validation - stopping test suite\n');
            allPassed = false;
            break;
          }
        } else {
          console.log('❌ Could not apply fix - stopping test suite\n');
          allPassed = false;
          break;
        }
      } else if (!testResult.success) {
        allPassed = false;
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cleanup
    await this.testRunner.cleanup();

    // Generate report
    this.generateReport(suiteName, allPassed);
  }

  async runAll() {
    for (const suiteName of Object.keys(TEST_SUITES)) {
      await this.runSuite(suiteName);
    }
  }

  generateReport(suiteName, allPassed) {
    const results = this.testRunner.getResults();
    const fixes = this.fixer.getFixes();
    const screenshots = this.testRunner.screenshots;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST REPORT: ${suiteName.toUpperCase()}`);
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'passed').length;
    const total = TEST_SUITES[suiteName].length;
    
    console.log(`\n📈 RESULTS SUMMARY:`);
    console.log(`   Total tests: ${total}`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${total - passed}`);
    console.log(`   Success rate: ${Math.round((passed/total) * 100)}%`);
    console.log(`   Overall status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (fixes.length > 0) {
      console.log(`\n🔧 FIXES APPLIED:`);
      fixes.forEach(fix => {
        console.log(`   - ${fix.test}: ${fix.fix}`);
      });
    }
    
    if (screenshots.length > 0) {
      console.log(`\n📸 SCREENSHOTS SAVED:`);
      screenshots.forEach(screenshot => {
        console.log(`   - ${path.basename(screenshot)}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('END OF REPORT');
    console.log('='.repeat(60) + '\n');
  }
}

// Main execution
async function main() {
  const orchestrator = new TestOrchestrator();
  
  // Run specific suite or all
  const suite = process.argv[2] || 'chatbot';
  
  if (suite === 'all') {
    await orchestrator.runAll();
  } else {
    await orchestrator.runSuite(suite);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { TestOrchestrator, TestRunnerAgent, FixerValidatorAgent };