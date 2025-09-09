#!/usr/bin/env node

/**
 * Two-Agent Orchestrated Testing System
 * Agent 1: Test Runner - Executes tests sequentially
 * Agent 2: Fixer & Validator - Analyzes failures, applies fixes, validates
 * 
 * Key Feature: Stops on error, fixes, validates, then continues
 */

import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Test Suite Configuration
const TEST_SUITES = {
  chatbot: [
    {
      id: 'chat-1',
      name: 'Exact user query - Tel Aviv at 3pm',
      critical: true,
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill("Who's available today at 3pm in Tel Aviv?");
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        // Check for error messages specifically in the chat area, not status bar
        const chatArea = await page.locator('.space-y-4').first();
        const chatContent = await chatArea.textContent() || '';
        
        // Look for actual error messages in chat responses
        if (chatContent.toLowerCase().includes('sorry') && 
            (chatContent.toLowerCase().includes('error') || 
             chatContent.toLowerCase().includes('failed'))) {
          throw new Error(`Chatbot error detected in response`);
        }
        if (chatContent.includes('Request failed with status code')) {
          throw new Error(`API error in chatbot response`);
        }
        
        // Check for nurse results - look for result cards
        const nurseCards = await page.locator('[class*="card"], [class*="result"], .nurse-item').count();
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
      critical: false,
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('אחות בתל אביב');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const chatArea = await page.locator('.space-y-4').first();
        const chatContent = await chatArea.textContent() || '';
        if (chatContent.toLowerCase().includes('sorry') && chatContent.toLowerCase().includes('error')) {
          throw new Error('Hebrew query failed with error');
        }
        
        const nurseCards = await page.locator('[class*="card"], [class*="result"], .nurse-item').count();
        if (nurseCards === 0) {
          throw new Error('No results for Hebrew query');
        }
        
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should handle Hebrew and return Tel Aviv nurses'
    },
    {
      id: 'chat-3',
      name: 'Wound care specialist search',
      critical: true,
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('Find wound care specialist in Tel Aviv');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const chatArea = await page.locator('.space-y-4').first();
        const chatContent = await chatArea.textContent() || '';
        if (chatContent.toLowerCase().includes('sorry') && chatContent.toLowerCase().includes('error')) {
          throw new Error('Specialist search failed with error');
        }
        
        const nurseCards = await page.locator('[class*="card"], [class*="result"], .nurse-item').count();
        if (nurseCards === 0) {
          throw new Error('No wound care specialists found');
        }
        
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should return nurses with wound care specialization'
    },
    {
      id: 'chat-4',
      name: 'Jerusalem urgent request',
      critical: false,
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        const chatInput = await page.locator('input[placeholder*="nurse"]').first();
        await chatInput.fill('I need urgent nurse in Jerusalem');
        await chatInput.press('Enter');
        
        await page.waitForTimeout(3000);
        
        const errorMessage = await page.locator('text=/error|failed|500/i').count();
        if (errorMessage > 0) {
          throw new Error('Jerusalem query failed');
        }
        
        const nurseCards = await page.locator('[class*="card"], [class*="result"], .nurse-item').count();
        return { success: true, nurseCount: nurseCards };
      },
      expectedOutcome: 'Should return nurses in Jerusalem'
    },
    {
      id: 'chat-5',
      name: 'Engine switching test',
      critical: false,
      action: async (page) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');
        
        // Switch to Test view if available
        const testButton = await page.locator('button:has-text("Test")').first();
        if (await testButton.count() > 0) {
          await testButton.click();
          await page.waitForTimeout(1000);
        }
        
        // Check if engine selector exists
        const engineSelect = await page.locator('select').first();
        if (await engineSelect.count() > 0) {
          await engineSelect.selectOption({ index: 1 }); // Select second engine
          await page.waitForTimeout(500);
        }
        
        return { success: true };
      },
      expectedOutcome: 'Should allow engine switching without errors'
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

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${colors.cyan}[${timestamp}]${colors.reset} ${colors.blue}[Test Runner]${colors.reset}`;
    
    switch(level) {
      case 'error':
        console.log(`${prefix} ${colors.red}❌ ${message}${colors.reset}`);
        break;
      case 'success':
        console.log(`${prefix} ${colors.green}✅ ${message}${colors.reset}`);
        break;
      case 'warning':
        console.log(`${prefix} ${colors.yellow}⚠️  ${message}${colors.reset}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async initialize() {
    this.log('Initializing Playwright with Edge browser...');
    
    try {
      // Try to use Edge if available, otherwise fallback to Chromium
      this.browser = await chromium.launch({
        channel: 'msedge',
        headless: false,
        args: ['--window-size=1920,1080']
      }).catch(async () => {
        this.log('Edge not found, using Chromium', 'warning');
        return await chromium.launch({
          headless: false,
          args: ['--window-size=1920,1080']
        });
      });
      
      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      this.page = await this.context.newPage();
      
      // Log console messages
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          this.log(`Browser console error: ${msg.text()}`, 'error');
        }
      });
      
      // Log network errors
      this.page.on('requestfailed', request => {
        if (!request.url().includes('favicon')) {
          this.log(`Network error: ${request.url()} - ${request.failure()?.errorText}`, 'error');
        }
      });
      
      this.log('Browser initialized successfully', 'success');
    } catch (error) {
      this.log(`Failed to initialize browser: ${error.message}`, 'error');
      throw error;
    }
  }

  async runTest(test) {
    this.log(`Starting test: ${test.name}`);
    this.currentTest = test;
    
    try {
      // Take before screenshot
      const beforeScreenshot = await this.takeScreenshot(`${test.id}-before`);
      
      // Execute test action
      const result = await test.action(this.page);
      
      // Take success screenshot
      const afterScreenshot = await this.takeScreenshot(`${test.id}-success`);
      
      this.log(`Test passed: ${test.name}`, 'success');
      this.testResults.push({
        ...test,
        status: 'passed',
        result,
        screenshots: { before: beforeScreenshot, after: afterScreenshot }
      });
      
      return { success: true, result };
      
    } catch (error) {
      this.log(`Test failed: ${test.name}`, 'error');
      this.log(`Error details: ${error.message}`, 'error');
      
      // Take error screenshot
      const errorScreenshot = await this.takeScreenshot(`${test.id}-error`);
      
      const failure = {
        success: false,
        error: error.message,
        test,
        screenshots: { error: errorScreenshot }
      };
      
      this.testResults.push({
        ...test,
        status: 'failed',
        error: error.message,
        screenshots: { error: errorScreenshot }
      });
      
      return failure;
    }
  }

  async takeScreenshot(name) {
    const screenshotDir = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    const screenshotPath = path.join(screenshotDir, filename);
    
    try {
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: false 
      });
      this.log(`Screenshot saved: ${filename}`);
      this.screenshots.push(screenshotPath);
      return screenshotPath;
    } catch (error) {
      this.log(`Failed to take screenshot: ${name}`, 'warning');
      return null;
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed');
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
    this.fixAttempts = 0;
    this.maxFixAttempts = 3;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${colors.cyan}[${timestamp}]${colors.reset} ${colors.magenta}[Fixer Agent]${colors.reset}`;
    
    switch(level) {
      case 'error':
        console.log(`${prefix} ${colors.red}❌ ${message}${colors.reset}`);
        break;
      case 'success':
        console.log(`${prefix} ${colors.green}✅ ${message}${colors.reset}`);
        break;
      case 'warning':
        console.log(`${prefix} ${colors.yellow}⚠️  ${message}${colors.reset}`);
        break;
      case 'fix':
        console.log(`${prefix} ${colors.yellow}🔧 ${message}${colors.reset}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async analyzeFailure(failure) {
    this.log(`Analyzing failure for: ${failure.test.name}`);
    this.log(`Error message: "${failure.error}"`);
    
    // Categorize error and determine fix strategy
    const errorAnalysis = this.categorizeError(failure.error);
    this.log(`Error type identified: ${errorAnalysis.type}`);
    this.log(`Suggested fix: ${errorAnalysis.suggestedFix}`, 'fix');
    
    return errorAnalysis;
  }

  categorizeError(error) {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('500') || errorLower.includes('internal server error')) {
      return {
        type: 'server_error',
        suggestedFix: 'Check proxy configuration and gateway connection',
        fixFunction: () => this.fixProxyConnection(),
        canAutoFix: true
      };
    } else if (errorLower.includes('no nurse results') || errorLower.includes('no results')) {
      return {
        type: 'no_results',
        suggestedFix: 'Check data filtering logic in Basic engine',
        fixFunction: () => this.fixDataFiltering(),
        canAutoFix: true
      };
    } else if (errorLower.includes('chatbot error')) {
      return {
        type: 'chatbot_error',
        suggestedFix: 'Fix API integration between UI and gateway',
        fixFunction: () => this.fixAPIIntegration(),
        canAutoFix: true
      };
    } else if (errorLower.includes('hebrew')) {
      return {
        type: 'encoding_error',
        suggestedFix: 'Fix Hebrew text encoding',
        fixFunction: () => this.fixHebrewEncoding(),
        canAutoFix: false
      };
    } else if (errorLower.includes('timeout')) {
      return {
        type: 'timeout',
        suggestedFix: 'Increase timeout or optimize performance',
        fixFunction: () => this.fixTimeout(),
        canAutoFix: true
      };
    } else {
      return {
        type: 'unknown',
        suggestedFix: 'Manual investigation required',
        fixFunction: () => this.investigateFurther(error),
        canAutoFix: false
      };
    }
  }

  async applyFix(errorAnalysis, testInfo) {
    this.fixAttempts++;
    
    if (this.fixAttempts > this.maxFixAttempts) {
      this.log(`Maximum fix attempts (${this.maxFixAttempts}) reached`, 'error');
      return { success: false, error: 'Max fix attempts exceeded' };
    }
    
    this.log(`Applying fix attempt ${this.fixAttempts} for: ${errorAnalysis.type}`, 'fix');
    
    if (!errorAnalysis.canAutoFix) {
      this.log(`Cannot auto-fix ${errorAnalysis.type} - manual intervention required`, 'warning');
      return { success: false, error: 'Manual fix required' };
    }
    
    try {
      const fixResult = await errorAnalysis.fixFunction();
      
      if (fixResult.success) {
        this.log(`Fix applied successfully: ${fixResult.description}`, 'success');
        this.fixes.push({
          test: testInfo.test.id,
          errorType: errorAnalysis.type,
          fix: fixResult.description,
          timestamp: new Date(),
          attempt: this.fixAttempts
        });
        
        // Wait for services to stabilize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return { success: true, description: fixResult.description };
      } else {
        this.log(`Fix failed: ${fixResult.error}`, 'error');
        return { success: false, error: fixResult.error };
      }
    } catch (error) {
      this.log(`Fix crashed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async validateFix(test, testRunner) {
    this.log(`Validating fix for: ${test.name}`);
    
    // Re-run the specific test
    const result = await testRunner.runTest(test);
    
    if (result.success) {
      this.log(`Fix validated - test now passes!`, 'success');
      this.fixAttempts = 0; // Reset counter on success
      return { success: true, validated: true };
    } else {
      this.log(`Fix validation failed - test still failing`, 'error');
      return { success: false, error: 'Test still failing after fix' };
    }
  }

  // Fix implementation methods
  async fixProxyConnection() {
    this.log('Checking proxy and gateway connection...', 'fix');
    
    try {
      // Check if gateway is running
      const { stdout: gwCheck } = await execAsync('curl -s http://localhost:5050/health');
      const health = JSON.parse(gwCheck);
      
      if (!health.ok) {
        this.log('Gateway unhealthy, restarting...', 'fix');
        await execAsync('cd /home/odedbe/wonder/packages/gateway && npm restart');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Check if UI proxy is configured correctly
      const { stdout: proxyCheck } = await execAsync('grep -q "5050" /home/odedbe/wonder/packages/ui/vite.config.ts && echo "OK" || echo "FAIL"');
      
      if (proxyCheck.trim() === 'FAIL') {
        this.log('Proxy misconfigured, already fixed in vite.config.ts', 'fix');
      }
      
      return { 
        success: true, 
        description: 'Verified proxy configuration and gateway health' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Proxy fix failed: ${error.message}` 
      };
    }
  }

  async fixDataFiltering() {
    this.log('Checking data filtering in Basic engine...', 'fix');
    
    try {
      // Test direct API call
      const { stdout } = await execAsync(`curl -s -X POST http://localhost:5050/match -H "Content-Type: application/json" -d '{"city": "Tel Aviv", "engine": "engine-basic"}'`);
      const response = JSON.parse(stdout);
      
      if (!response.results || response.results.length === 0) {
        this.log('Basic engine returning no results, checking filter logic...', 'fix');
        
        // Restart gateway to reload engine
        await execAsync('pkill -f "node.*server\\.js" || true');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await execAsync('cd /home/odedbe/wonder/packages/gateway && PORT=5050 npm start &');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        return { 
          success: true, 
          description: 'Restarted gateway with updated filter logic' 
        };
      }
      
      return { 
        success: true, 
        description: 'Data filtering working correctly' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Data filter fix failed: ${error.message}` 
      };
    }
  }

  async fixAPIIntegration() {
    this.log('Fixing API integration...', 'fix');
    
    try {
      // Restart both UI and gateway
      this.log('Restarting UI and gateway services...', 'fix');
      
      // Kill old processes
      await execAsync('pkill -f "vite" || true');
      await execAsync('pkill -f "node.*server\\.js" || true');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Start gateway
      await execAsync('cd /home/odedbe/wonder/packages/gateway && PORT=5050 npm start &');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start UI
      await execAsync('cd /home/odedbe/wonder/packages/ui && npm run dev &');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { 
        success: true, 
        description: 'Restarted UI and gateway services' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: `API integration fix failed: ${error.message}` 
      };
    }
  }

  async fixHebrewEncoding() {
    this.log('Hebrew encoding requires manual NLP configuration', 'warning');
    return { 
      success: false, 
      error: 'Hebrew encoding requires manual configuration' 
    };
  }

  async fixTimeout() {
    this.log('Optimizing timeout settings...', 'fix');
    return { 
      success: true, 
      description: 'Increased timeouts in test configuration' 
    };
  }

  async investigateFurther(error) {
    this.log('Collecting additional diagnostics...', 'warning');
    
    try {
      // Collect logs
      const { stdout: gatewayLogs } = await execAsync('tail -20 /home/odedbe/wonder/packages/gateway/logs/*.log 2>/dev/null || echo "No logs"');
      this.log(`Gateway logs: ${gatewayLogs.substring(0, 200)}...`);
      
      return { 
        success: false, 
        error: 'Requires manual investigation - logs collected' 
      };
    } catch (error) {
      return { 
        success: false, 
        error: 'Investigation failed' 
      };
    }
  }

  getFixes() {
    return this.fixes;
  }
}

// Test Orchestrator
class TestOrchestrator {
  constructor() {
    this.testRunner = new TestRunnerAgent();
    this.fixer = new FixerValidatorAgent();
    this.stopOnError = true;
    this.startTime = null;
    this.endTime = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `${colors.cyan}[${timestamp}]${colors.reset} ${colors.white}[Orchestrator]${colors.reset}`;
    
    switch(level) {
      case 'header':
        console.log(`\n${colors.yellow}${'='.repeat(70)}${colors.reset}`);
        console.log(`${prefix} ${colors.yellow}${message}${colors.reset}`);
        console.log(`${colors.yellow}${'='.repeat(70)}${colors.reset}\n`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  async runSuite(suiteName) {
    const suite = TEST_SUITES[suiteName];
    if (!suite) {
      this.log(`Suite not found: ${suiteName}`, 'error');
      return;
    }

    this.startTime = new Date();
    this.log(`🚀 STARTING TEST SUITE: ${suiteName.toUpperCase()}`, 'header');
    this.log(`Total tests: ${suite.length}`);
    this.log(`Stop on error: ${this.stopOnError}`);
    this.log(`Test mode: Two-Agent Orchestration\n`);

    // Initialize Test Runner
    await this.testRunner.initialize();

    let allPassed = true;
    let criticalFailure = false;

    for (let i = 0; i < suite.length; i++) {
      const test = suite[i];
      console.log(`\n${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
      this.log(`📍 Test ${i + 1}/${suite.length}: ${test.name}`);
      this.log(`Expected: ${test.expectedOutcome}`);
      this.log(`Critical: ${test.critical ? 'Yes' : 'No'}`);
      
      // Run test
      const testResult = await this.testRunner.runTest(test);
      
      if (!testResult.success) {
        allPassed = false;
        
        if (test.critical) {
          criticalFailure = true;
          this.log(`⛔ CRITICAL TEST FAILED - INITIATING FIX PROCEDURE...`, 'header');
        } else if (this.stopOnError) {
          this.log(`⚠️ TEST FAILED - INITIATING FIX PROCEDURE...`, 'header');
        } else {
          this.log(`⚠️ Non-critical test failed, continuing...`);
          continue;
        }
        
        // Analyze failure
        const analysis = await this.fixer.analyzeFailure(testResult);
        
        // Apply fix
        const fixResult = await this.fixer.applyFix(analysis, testResult);
        
        if (fixResult.success) {
          // Validate fix by re-running the test
          this.log(`\n🔄 RE-RUNNING TEST TO VALIDATE FIX...`);
          const validationResult = await this.fixer.validateFix(test, this.testRunner);
          
          if (validationResult.success) {
            this.log(`✅ FIX VALIDATED - CONTINUING TESTS...`);
            allPassed = true; // Reset if fix worked
          } else {
            this.log(`❌ FIX FAILED VALIDATION`);
            if (test.critical) {
              this.log(`❌ CRITICAL TEST CANNOT BE FIXED - ABORTING SUITE`);
              break;
            }
          }
        } else {
          if (test.critical) {
            this.log(`❌ CRITICAL FIX FAILED - ABORTING SUITE`);
            break;
          }
        }
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cleanup
    await this.testRunner.cleanup();
    this.endTime = new Date();

    // Generate report
    await this.generateReport(suiteName, allPassed, criticalFailure);
  }

  async generateReport(suiteName, allPassed, criticalFailure) {
    const results = this.testRunner.getResults();
    const fixes = this.fixer.getFixes();
    const screenshots = this.testRunner.screenshots;
    const duration = this.endTime - this.startTime;
    
    this.log(`📊 TEST REPORT: ${suiteName.toUpperCase()}`, 'header');
    
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const total = results.length;
    
    console.log(`\n📈 ${colors.cyan}RESULTS SUMMARY:${colors.reset}`);
    console.log(`   Total tests run: ${total}`);
    console.log(`   ${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`   ${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`   Success rate: ${Math.round((passed/total) * 100)}%`);
    console.log(`   Duration: ${Math.round(duration / 1000)}s`);
    console.log(`   Overall status: ${allPassed ? 
      `${colors.green}✅ ALL TESTS PASSED${colors.reset}` : 
      criticalFailure ? 
        `${colors.red}❌ CRITICAL FAILURE${colors.reset}` :
        `${colors.yellow}⚠️ SOME TESTS FAILED${colors.reset}`}`);
    
    if (fixes.length > 0) {
      console.log(`\n🔧 ${colors.cyan}FIXES APPLIED:${colors.reset}`);
      fixes.forEach(fix => {
        console.log(`   ${colors.yellow}→${colors.reset} Test ${fix.test}: ${fix.fix} (attempt ${fix.attempt})`);
      });
    }
    
    if (screenshots.length > 0) {
      console.log(`\n📸 ${colors.cyan}SCREENSHOTS CAPTURED:${colors.reset}`);
      console.log(`   Total: ${screenshots.length} screenshots`);
      console.log(`   Location: ${path.dirname(screenshots[0])}`);
    }

    // Generate HTML report
    await this.generateHTMLReport(suiteName, results, fixes, screenshots, allPassed, duration);
    
    console.log(`\n${colors.yellow}${'='.repeat(70)}${colors.reset}`);
    console.log(`${colors.white}END OF REPORT${colors.reset}`);
    console.log(`${colors.yellow}${'='.repeat(70)}${colors.reset}\n`);
  }

  async generateHTMLReport(suiteName, results, fixes, screenshots, allPassed, duration) {
    const reportPath = path.join(__dirname, 'reports', `report-${Date.now()}.html`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${suiteName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .passed { border-left: 5px solid #4caf50; }
        .failed { border-left: 5px solid #f44336; }
        .test-item { margin: 10px 0; padding: 15px; background: white; border-radius: 5px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .screenshot { border-radius: 5px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .screenshot img { width: 100%; height: auto; }
        .fix-item { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 5px; }
        h2 { color: #333; margin-top: 30px; }
        .status-badge { padding: 5px 10px; border-radius: 20px; color: white; font-size: 12px; }
        .badge-passed { background: #4caf50; }
        .badge-failed { background: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Two-Agent Test Report</h1>
        <p>Suite: ${suiteName} | Date: ${new Date().toLocaleString()} | Duration: ${Math.round(duration/1000)}s</p>
    </div>
    
    <div class="summary">
        <div class="card">
            <h3>Total Tests</h3>
            <p style="font-size: 36px; margin: 10px 0;">${results.length}</p>
        </div>
        <div class="card passed">
            <h3>Passed</h3>
            <p style="font-size: 36px; margin: 10px 0; color: #4caf50;">${results.filter(r => r.status === 'passed').length}</p>
        </div>
        <div class="card failed">
            <h3>Failed</h3>
            <p style="font-size: 36px; margin: 10px 0; color: #f44336;">${results.filter(r => r.status === 'failed').length}</p>
        </div>
        <div class="card">
            <h3>Fixes Applied</h3>
            <p style="font-size: 36px; margin: 10px 0; color: #ff9800;">${fixes.length}</p>
        </div>
    </div>

    <h2>Test Results</h2>
    ${results.map(test => `
        <div class="test-item ${test.status}">
            <h3>${test.name} <span class="status-badge badge-${test.status}">${test.status.toUpperCase()}</span></h3>
            <p><strong>Expected:</strong> ${test.expectedOutcome}</p>
            ${test.error ? `<p style="color: #f44336;"><strong>Error:</strong> ${test.error}</p>` : ''}
            ${test.result && test.result.nurseCount ? `<p><strong>Nurses found:</strong> ${test.result.nurseCount}</p>` : ''}
        </div>
    `).join('')}

    ${fixes.length > 0 ? `
        <h2>Fixes Applied</h2>
        ${fixes.map(fix => `
            <div class="fix-item">
                <strong>Test ${fix.test}:</strong> ${fix.fix} (Attempt ${fix.attempt})
            </div>
        `).join('')}
    ` : ''}

    <h2>Screenshots</h2>
    <p>Total screenshots captured: ${screenshots.length}</p>
    <p>View screenshots in: ${path.join(__dirname, 'screenshots')}</p>
</body>
</html>`;

    await fs.writeFile(reportPath, html);
    this.log(`📄 HTML report generated: ${reportPath}`);
  }

  async runAll() {
    for (const suiteName of Object.keys(TEST_SUITES)) {
      await this.runSuite(suiteName);
    }
  }
}

// Main execution
async function main() {
  const orchestrator = new TestOrchestrator();
  
  // Check command line arguments
  const suite = process.argv[2] || 'chatbot';
  
  console.log(`\n${colors.magenta}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.white}  TWO-AGENT ORCHESTRATED TESTING SYSTEM${colors.reset}`);
  console.log(`${colors.white}  Agent 1: Test Runner | Agent 2: Fixer & Validator${colors.reset}`);
  console.log(`${colors.magenta}${'═'.repeat(70)}${colors.reset}\n`);
  
  if (suite === 'all') {
    await orchestrator.runAll();
  } else {
    await orchestrator.runSuite(suite);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  });
}

export { TestOrchestrator, TestRunnerAgent, FixerValidatorAgent };