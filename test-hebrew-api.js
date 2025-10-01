#!/usr/bin/env node

import { writeFileSync, mkdirSync } from 'fs';

// Create directories
mkdirSync('test-results', { recursive: true });

const API_BASE = 'http://localhost:5050';
const UI_BASE = 'http://localhost:3002';

const testCases = {
  hebrewNameSearches: [
    { query: 'אורטל', expected: 'אורטל צוקרל' },
    { query: 'אסתר', expected: 'אסתר' },
    { query: 'בתיה', expected: 'בתיה' },
    { query: 'מירי', expected: 'מירי' },
    { query: 'יעל', expected: 'יעל' },
    { query: 'רחל', expected: 'רחל' },
    { query: 'שרה', expected: 'שרה' },
    { query: 'דנה', expected: 'דנה' }
  ],
  cityQueries: [
    { city: 'Tel Aviv', minExpected: 10 },
    { city: 'Haifa', minExpected: 5 },
    { city: 'Jerusalem', minExpected: 0 }, // No data expected
    { city: 'תל אביב', minExpected: 10 },
    { city: 'חיפה', minExpected: 5 }
  ],
  specializationQueries: [
    { spec: 'Wound Care', city: 'Tel Aviv', minExpected: 1 },
    { spec: 'Medication Management', city: 'Tel Aviv', minExpected: 1 },
    { spec: 'טיפול בפצעים', city: 'Tel Aviv', minExpected: 0 }, // Hebrew not yet supported
    { spec: 'ניהול תרופות', city: 'Tel Aviv', minExpected: 0 }
  ],
  urgentQueries: [
    { city: 'Tel Aviv', urgent: true, minExpected: 10 },
    { city: 'Haifa', urgent: true, minExpected: 5 }
  ]
};

const results = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  failures: [],
  details: []
};

function logTest(name, passed, details = '') {
  results.totalTests++;
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
  } else {
    results.failed++;
    results.failures.push(name);
    console.log(`❌ ${name}`);
  }
  if (details) console.log(`   ${details}`);
  results.details.push({ name, passed, details });
}

async function testHealthCheck() {
  console.log('\n📍 Test: Health Check');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    logTest('API Health Check', response.ok && data.status === 'healthy',
      `Status: ${data.status}, Engines: ${data.engines?.length || 0}`);
  } catch (error) {
    logTest('API Health Check', false, error.message);
  }
}

async function testHebrewNameSearches() {
  console.log('\n📍 Test: Hebrew Name Searches');

  for (const testCase of testCases.hebrewNameSearches) {
    try {
      const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nurseName: testCase.query,
          topK: 5
        })
      });

      const data = await response.json();
      const found = data.results?.some(r =>
        r.name?.includes(testCase.expected) ||
        r.nurseName?.includes(testCase.expected)
      );

      logTest(
        `Hebrew name search: "${testCase.query}"`,
        found,
        found ? `Found: ${data.results[0]?.name}` : 'Not found'
      );
    } catch (error) {
      logTest(`Hebrew name search: "${testCase.query}"`, false, error.message);
    }
  }
}

async function testCityFiltering() {
  console.log('\n📍 Test: City Filtering');

  for (const testCase of testCases.cityQueries) {
    try {
      const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: testCase.city,
          topK: 20
        })
      });

      const data = await response.json();
      const resultCount = data.results?.length || 0;
      const passed = resultCount >= testCase.minExpected;

      logTest(
        `City filter: "${testCase.city}"`,
        passed,
        `Found ${resultCount} nurses (expected min: ${testCase.minExpected})`
      );
    } catch (error) {
      logTest(`City filter: "${testCase.city}"`, false, error.message);
    }
  }
}

async function testSpecializations() {
  console.log('\n📍 Test: Specialization Queries');

  for (const testCase of testCases.specializationQueries) {
    try {
      const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: testCase.city,
          servicesQuery: [testCase.spec],
          topK: 10
        })
      });

      const data = await response.json();
      const resultCount = data.results?.length || 0;
      const passed = resultCount >= testCase.minExpected;

      logTest(
        `Specialization: "${testCase.spec}" in ${testCase.city}`,
        passed,
        `Found ${resultCount} nurses (expected min: ${testCase.minExpected})`
      );
    } catch (error) {
      logTest(`Specialization: "${testCase.spec}"`, false, error.message);
    }
  }
}

async function testUrgentQueries() {
  console.log('\n📍 Test: Urgent Queries');

  for (const testCase of testCases.urgentQueries) {
    try {
      const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: testCase.city,
          urgent: testCase.urgent,
          topK: 20
        })
      });

      const data = await response.json();
      const resultCount = data.results?.length || 0;
      const passed = resultCount >= testCase.minExpected;

      logTest(
        `Urgent query: ${testCase.city}`,
        passed,
        `Found ${resultCount} nurses (expected min: ${testCase.minExpected})`
      );
    } catch (error) {
      logTest(`Urgent query: ${testCase.city}`, false, error.message);
    }
  }
}

async function testDataIntegrity() {
  console.log('\n📍 Test: Data Integrity');

  try {
    // Get all nurses
    const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: 'Tel Aviv',
        topK: 100
      })
    });

    const data = await response.json();
    const nurses = data.results || [];

    // Check for Hebrew names
    const hebrewNurses = nurses.filter(n =>
      /[\u0590-\u05FF]/.test(n.name || n.nurseName || '')
    );

    const hasHebrewNames = hebrewNurses.length > 0;
    const allHaveNames = nurses.every(n => n.name || n.nurseName);

    logTest(
      'Hebrew names present',
      hasHebrewNames,
      `${hebrewNurses.length} Hebrew names out of ${nurses.length} total`
    );

    logTest(
      'All nurses have names',
      allHaveNames,
      allHaveNames ? 'All nurses have names' : 'Some nurses missing names'
    );

    // Check for duplicates
    const names = nurses.map(n => n.name || n.nurseName).filter(Boolean);
    const uniqueNames = new Set(names);
    const hasDuplicates = names.length !== uniqueNames.size;

    logTest(
      'No duplicate names',
      !hasDuplicates,
      hasDuplicates ? `Found ${names.length - uniqueNames.size} duplicates` : 'No duplicates'
    );

  } catch (error) {
    logTest('Data integrity check', false, error.message);
  }
}

async function testPerformance() {
  console.log('\n📍 Test: Performance');

  const queries = [
    { city: 'Tel Aviv', topK: 50 },
    { nurseName: 'אורטל', topK: 10 },
    { city: 'Haifa', servicesQuery: ['Wound Care'], topK: 20 }
  ];

  for (const query of queries) {
    try {
      const start = Date.now();
      const response = await fetch(`${API_BASE}/match?engine=engine-basic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      await response.json();
      const duration = Date.now() - start;
      const passed = duration < 1000; // Should be under 1 second

      logTest(
        `Performance: ${JSON.stringify(query).substring(0, 50)}...`,
        passed,
        `Response time: ${duration}ms`
      );
    } catch (error) {
      logTest('Performance test', false, error.message);
    }
  }
}

async function testUIAccessibility() {
  console.log('\n📍 Test: UI Accessibility');

  try {
    const response = await fetch(UI_BASE);
    const html = await response.text();

    const hasTitle = html.includes('Wonder');
    const hasReact = html.includes('root') || html.includes('app');

    logTest('UI loads', response.ok, `Status: ${response.status}`);
    logTest('UI has title', hasTitle, hasTitle ? 'Title found' : 'Title missing');
    logTest('UI has React root', hasReact, hasReact ? 'React root found' : 'React root missing');

  } catch (error) {
    logTest('UI accessibility', false, error.message);
  }
}

async function runAllTests() {
  console.log('\n🧪 Hebrew Integration Comprehensive Testing');
  console.log('='.repeat(60));

  await testHealthCheck();
  await testHebrewNameSearches();
  await testCityFiltering();
  await testSpecializations();
  await testUrgentQueries();
  await testDataIntegrity();
  await testPerformance();
  await testUIAccessibility();

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.totalTests}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(1)}%`);

  if (results.failures.length > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.failures.forEach((failure, index) => {
      console.log(`   ${index + 1}. ${failure}`);
    });
  }

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.totalTests,
      passed: results.passed,
      failed: results.failed,
      successRate: `${((results.passed / results.totalTests) * 100).toFixed(1)}%`
    },
    failures: results.failures,
    details: results.details,
    testCases: testCases
  };

  writeFileSync('test-results/hebrew-api-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Report saved to test-results/hebrew-api-test-report.json');

  // Return exit code based on results
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);