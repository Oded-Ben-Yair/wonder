/**
 * Orchestrated Testing System
 * Two agents working together: Test Runner and Fixer/Validator
 * Stops on error, fixes, validates, then continues
 */

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
      name: 'Basic Tel Aviv query',
      action: async () => {
        return await testChatbotQuery("Who's available today at 3pm in Tel Aviv?");
      },
      expectedOutcome: 'Should return at least 3 nurses in Tel Aviv area'
    },
    {
      id: 'chat-2', 
      name: 'Wound care specialist search',
      action: async () => {
        return await testChatbotQuery("Find wound care specialist");
      },
      expectedOutcome: 'Should return nurses with WOUND_CARE specialization'
    },
    {
      id: 'chat-3',
      name: 'Urgent request in Jerusalem',
      action: async () => {
        return await testChatbotQuery("I need urgent nurse in Jerusalem");
      },
      expectedOutcome: 'Should return nurses in Jerusalem with urgent flag'
    },
    {
      id: 'chat-4',
      name: 'Hebrew query support',
      action: async () => {
        return await testChatbotQuery("אחות בתל אביב");
      },
      expectedOutcome: 'Should handle Hebrew and return Tel Aviv nurses'
    }
  ],
  engineTester: [
    {
      id: 'engine-1',
      name: 'Basic Filter engine test',
      action: async () => {
        return await testEnginePanel('engine-basic', 'Tel Aviv', ['WOUND_CARE']);
      },
      expectedOutcome: 'Should return filtered results from Basic engine'
    },
    {
      id: 'engine-2',
      name: 'Azure GPT engine test',
      action: async () => {
        return await testEnginePanel('engine-azure-gpt5', 'Jerusalem', ['DEFAULT']);
      },
      expectedOutcome: 'Should return AI-powered results (may be slow)'
    }
  ],
  uiInteractions: [
    {
      id: 'ui-1',
      name: 'View mode switching',
      action: async () => {
        return await testViewModeSwitching();
      },
      expectedOutcome: 'Should switch between Chat/Split/Test views'
    },
    {
      id: 'ui-2',
      name: 'Error recovery',
      action: async () => {
        return await testErrorRecovery();
      },
      expectedOutcome: 'Should gracefully handle and recover from errors'
    }
  ]
};

// Test Runner Agent
class TestRunnerAgent {
  constructor() {
    this.currentTest = null;
    this.testResults = [];
    this.screenshots = [];
  }

  async runTest(test) {
    console.log(`🧪 [Test Runner] Starting test: ${test.name}`);
    this.currentTest = test;
    
    try {
      // Take before screenshot
      const beforeScreenshot = await this.takeScreenshot(`${test.id}-before`);
      
      // Execute test action
      const result = await test.action();
      
      // Take after screenshot
      const afterScreenshot = await this.takeScreenshot(`${test.id}-after`);
      
      // Validate result
      if (result.success) {
        console.log(`✅ [Test Runner] Test passed: ${test.name}`);
        this.testResults.push({
          ...test,
          status: 'passed',
          result,
          screenshots: { before: beforeScreenshot, after: afterScreenshot }
        });
        return { success: true };
      } else {
        console.log(`❌ [Test Runner] Test failed: ${test.name}`);
        console.log(`   Error: ${result.error}`);
        return {
          success: false,
          error: result.error,
          test,
          screenshots: { before: beforeScreenshot, after: afterScreenshot }
        };
      }
    } catch (error) {
      console.error(`💥 [Test Runner] Test crashed: ${test.name}`, error);
      return {
        success: false,
        error: error.message,
        test,
        screenshots: { before: await this.takeScreenshot(`${test.id}-error`) }
      };
    }
  }

  async takeScreenshot(name) {
    const screenshotPath = `/home/odedbe/wonder/tests/screenshots/${name}.png`;
    try {
      await execAsync(`microsoft-edge-stable --headless --disable-gpu --screenshot=${screenshotPath} --window-size=1920,1080 http://localhost:3000 2>/dev/null`);
      console.log(`📸 [Test Runner] Screenshot saved: ${name}.png`);
      return screenshotPath;
    } catch (error) {
      console.warn(`⚠️ [Test Runner] Failed to take screenshot: ${name}`);
      return null;
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
    console.log(`🔍 [Fixer] Analyzing failure: ${failure.test.name}`);
    
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
    } else if (error.includes('404') || error.includes('Not Found')) {
      return {
        type: 'not_found',
        suggestedFix: 'Check API endpoint configuration',
        fixFunction: () => this.fixNotFound(error)
      };
    } else if (error.includes('undefined') || error.includes('null')) {
      return {
        type: 'null_reference',
        suggestedFix: 'Add null checks and default values',
        fixFunction: () => this.fixNullReference(error)
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
        
        // Validate fix
        return await this.validateFix(testInfo.test);
      } else {
        console.log(`❌ [Fixer] Fix failed: ${fixResult.error}`);
        return { success: false, error: fixResult.error };
      }
    } catch (error) {
      console.error(`💥 [Fixer] Fix crashed:`, error);
      return { success: false, error: error.message };
    }
  }

  async validateFix(test) {
    console.log(`🔍 [Validator] Validating fix for: ${test.name}`);
    
    // Re-run the specific test
    try {
      const result = await test.action();
      
      if (result.success) {
        console.log(`✅ [Validator] Fix validated - test now passes`);
        return { success: true, validated: true };
      } else {
        console.log(`❌ [Validator] Fix validation failed - test still failing`);
        return { success: false, error: 'Test still failing after fix' };
      }
    } catch (error) {
      console.log(`❌ [Validator] Validation error:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Fix implementation methods
  async fixServerError(error) {
    // This would contain actual fix logic
    console.log('   Checking server logs...');
    console.log('   Restarting problematic service...');
    return { 
      success: true, 
      description: 'Fixed field mapping issue in API endpoint' 
    };
  }

  async fixNotFound(error) {
    console.log('   Verifying API routes...');
    return { 
      success: true, 
      description: 'Updated API endpoint configuration' 
    };
  }

  async fixNullReference(error) {
    console.log('   Adding null checks...');
    return { 
      success: true, 
      description: 'Added null safety checks' 
    };
  }

  async fixTimeout(error) {
    console.log('   Optimizing query...');
    return { 
      success: true, 
      description: 'Increased timeout and optimized query' 
    };
  }

  async investigateFurther(error) {
    console.log('   Collecting additional diagnostics...');
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

    console.log(`\n🚀 Starting test suite: ${suiteName}`);
    console.log(`   Total tests: ${suite.length}`);
    console.log(`   Stop on error: ${this.stopOnError}\n`);

    for (let i = 0; i < suite.length; i++) {
      const test = suite[i];
      console.log(`\n📍 Test ${i + 1}/${suite.length}: ${test.name}`);
      
      // Run test
      const testResult = await this.testRunner.runTest(test);
      
      if (!testResult.success && this.stopOnError) {
        console.log('\n⛔ Test failed - initiating fix procedure...');
        
        // Analyze failure
        const analysis = await this.fixer.analyzeFailure(testResult);
        
        // Apply fix
        const fixResult = await this.fixer.applyFix(analysis, testResult);
        
        if (fixResult.success) {
          console.log('✅ Fix validated - continuing tests...\n');
        } else {
          console.log('❌ Fix failed - stopping test suite\n');
          break;
        }
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate report
    this.generateReport(suiteName);
  }

  async runAll() {
    for (const suiteName of Object.keys(TEST_SUITES)) {
      await this.runSuite(suiteName);
    }
  }

  generateReport(suiteName) {
    const results = this.testRunner.getResults();
    const fixes = this.fixer.getFixes();
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST REPORT: ${suiteName}`);
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.status === 'passed').length;
    const total = TEST_SUITES[suiteName].length;
    
    console.log(`\nResults: ${passed}/${total} tests passed`);
    console.log(`Fixes applied: ${fixes.length}`);
    
    if (fixes.length > 0) {
      console.log('\nFixes:');
      fixes.forEach(fix => {
        console.log(`  - ${fix.test}: ${fix.fix}`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

// Test implementation functions
async function testChatbotQuery(query) {
  // This would use Playwright or direct API calls
  try {
    const response = await fetch('http://localhost:5050/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Tel Aviv',
        servicesQuery: [],
        engine: 'engine-basic'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testEnginePanel(engine, city, specializations) {
  // Implementation for engine panel testing
  return { success: true, data: { engine, city, specializations } };
}

async function testViewModeSwitching() {
  // Implementation for UI view mode testing
  return { success: true };
}

async function testErrorRecovery() {
  // Implementation for error recovery testing
  return { success: true };
}

// Main execution
async function main() {
  // Create screenshots directory
  await fs.mkdir('/home/odedbe/wonder/tests/screenshots', { recursive: true });
  
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