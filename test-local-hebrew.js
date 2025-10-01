#!/usr/bin/env node

const LOCAL_API = 'http://localhost:5050';

const testQueries = [
  { type: 'hebrew-name', query: { nurseName: 'אורטל', topK: 3 }, expected: 'אורטל' },
  { type: 'hebrew-name', query: { nurseName: 'בתיה', topK: 3 }, expected: 'בתיה' },
  { type: 'hebrew-name', query: { nurseName: 'אסתר', topK: 3 }, expected: 'אסתר' },
  { type: 'city', query: { city: 'Tel Aviv', topK: 5 }, minResults: 5 },
  { type: 'hebrew-city', query: { city: 'תל אביב', topK: 5 }, minResults: 5 },
  { type: 'combined', query: { nurseName: 'מירי', city: 'Tel Aviv', topK: 3 }, expected: 'מירי' },
];

async function testLocalAPI() {
  console.log('🧪 Testing Local Hebrew Integration');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;
  const hebrewNames = new Set();

  for (const test of testQueries) {
    console.log(`\n📍 Testing ${test.type}: ${JSON.stringify(test.query)}`);

    try {
      const response = await fetch(LOCAL_API + '/match?engine=engine-basic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.query)
      });

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        console.log(`   ✅ Got ${data.results.length} results`);

        // Collect Hebrew names
        data.results.forEach(r => {
          if (r.name && /[\u0590-\u05FF]/.test(r.name)) {
            hebrewNames.add(r.name);
          }
        });

        // Check expected name
        if (test.expected) {
          const found = data.results.some(r => r.name && r.name.includes(test.expected));
          if (found) {
            console.log(`   ✅ Found expected: ${test.expected}`);
            passed++;
          } else {
            console.log(`   ❌ Missing expected: ${test.expected}`);
            failed++;
          }
        } else if (test.minResults) {
          if (data.results.length >= test.minResults) {
            console.log(`   ✅ Has minimum ${test.minResults} results`);
            passed++;
          } else {
            console.log(`   ❌ Only ${data.results.length} results (need ${test.minResults})`);
            failed++;
          }
        } else {
          passed++;
        }

        // Show sample results
        const sampleNames = data.results.slice(0, 3).map(r => r.name).join(', ');
        console.log(`   Sample: ${sampleNames}`);
      } else {
        console.log(`   ❌ Invalid response structure`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 LOCAL TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Hebrew Names Found: ${hebrewNames.size}`);
  if (hebrewNames.size > 0) {
    console.log(`Sample Hebrew Names: ${Array.from(hebrewNames).slice(0, 5).join(', ')}`);
  }

  const allPassed = failed === 0;
  console.log('\n🎯 VERDICT:');
  if (allPassed) {
    console.log('✅ ✅ ✅ LOCAL HEBREW INTEGRATION IS PERFECT! ✅ ✅ ✅');
  } else {
    console.log('⚠️ Some tests failed locally');
  }

  return allPassed;
}

// Run tests
testLocalAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});