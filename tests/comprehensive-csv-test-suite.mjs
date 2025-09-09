/**
 * Comprehensive Test Suite - 100+ queries covering all CSV data options
 * Based on actual nurses.csv data analysis:
 * - 199 unique cities
 * - 29 unique treatment types
 * - 5 mobility types
 * - 7914 total records
 */

import axios from 'axios';
import fs from 'fs';

// Test queries based on real CSV data
const testQueries = [
  // === MAJOR CITIES (High population) ===
  { query: "Find nurses in Tel Aviv", expectResults: true },
  { query: "מי זמין בתל אביב?", expectResults: true }, // Hebrew
  { query: "Show me nurses in Jerusalem", expectResults: true },
  { query: "אחיות בירושלים", expectResults: true }, // Hebrew
  { query: "Available nurses in Haifa", expectResults: true },
  { query: "מי זמין בחיפה?", expectResults: true }, // Hebrew
  { query: "Find help in Beer Sheva", expectResults: true },
  { query: "Nurses in Rishon LeTsiyon", expectResults: true },
  { query: "Who's available in Petach Tikva?", expectResults: true },
  { query: "Ashdod nurse availability", expectResults: true },
  { query: "Nethanya healthcare providers", expectResults: true },
  { query: "Bnei Brak nurses", expectResults: true },
  { query: "Ramat Gan medical help", expectResults: true },
  { query: "Bat Yam nurses available", expectResults: true },
  { query: "Holon healthcare", expectResults: true },
  { query: "Ashkelon nurses", expectResults: true },
  { query: "Rehovot medical assistance", expectResults: true },
  { query: "Herzliya nurse search", expectResults: true },
  { query: "Kfar Saba providers", expectResults: true },
  { query: "Hadera nurses available", expectResults: true },
  { query: "Modi'in healthcare", expectResults: true },
  
  // === SMALLER CITIES ===
  { query: "Nurses in Afula", expectResults: true },
  { query: "Arad healthcare", expectResults: true },
  { query: "Ariel medical help", expectResults: true },
  { query: "Dimona nurses", expectResults: true },
  { query: "Eilat healthcare providers", expectResults: true },
  { query: "Beit Shemesh nurses", expectResults: true },
  { query: "Givat Shmuel help", expectResults: true },
  { query: "Givatayim nurses", expectResults: true },
  { query: "Even Yehuda providers", expectResults: true },
  { query: "Gan Yavne healthcare", expectResults: true },
  
  // === WOUND CARE SERVICES ===
  { query: "Wound care in Tel Aviv", expectResults: true },
  { query: "טיפול בפצעים בתל אביב", expectResults: true }, // Hebrew
  { query: "Diabetic wound treatment Jerusalem", expectResults: true },
  { query: "Burn treatment Haifa", expectResults: true },
  { query: "Difficult wound healing Beer Sheva", expectResults: true },
  { query: "Wound care specialist Rishon", expectResults: true },
  { query: "Need wound treatment Petach Tikva", expectResults: true },
  { query: "Stoma treatment Ashdod", expectResults: true },
  
  // === MEDICATION SERVICES ===
  { query: "Medication assistance Tel Aviv", expectResults: true },
  { query: "עזרה עם תרופות", expectResults: true }, // Hebrew
  { query: "Medication arrangement Jerusalem", expectResults: true },
  { query: "Need help with medications Haifa", expectResults: true },
  { query: "Medicine management Ramat Gan", expectResults: true },
  
  // === SPECIALIZED CARE ===
  { query: "Breastfeeding consultation Tel Aviv", expectResults: true },
  { query: "ייעוץ הנקה", expectResults: true }, // Hebrew
  { query: "Newborn visit Jerusalem", expectResults: true },
  { query: "Pediatric nurse Haifa", expectResults: true },
  { query: "Circumcision nurse Beer Sheva", expectResults: true },
  { query: "Day night nurse Rishon", expectResults: true },
  
  // === CATHETER & MEDICAL PROCEDURES ===
  { query: "Catheter insertion Tel Aviv", expectResults: true },
  { query: "Central catheter treatment Jerusalem", expectResults: true },
  { query: "Catheter replacement Haifa", expectResults: true },
  { query: "Abdominal drainage Ashdod", expectResults: true },
  { query: "External drainage Nethanya", expectResults: true },
  
  // === POST-OPERATIVE CARE ===
  { query: "Surgery follow up Tel Aviv", expectResults: true },
  { query: "מעקב אחרי ניתוח", expectResults: true }, // Hebrew
  { query: "Post-op care Jerusalem", expectResults: true },
  { query: "Suture removal Haifa", expectResults: true },
  { query: "After surgery help Beer Sheva", expectResults: true },
  
  // === HOME CARE SERVICES ===
  { query: "Home care Tel Aviv", expectResults: true },
  { query: "טיפול בבית", expectResults: true }, // Hebrew
  { query: "Private home security Jerusalem", expectResults: true },
  { query: "Escorted by nurse Haifa", expectResults: true },
  { query: "Home newborn visit Rishon", expectResults: true },
  { query: "Palliative care at home", expectResults: true },
  
  // === BLOOD TESTS ===
  { query: "Blood tests at home Tel Aviv", expectResults: true },
  { query: "בדיקות דם בבית", expectResults: true }, // Hebrew
  { query: "Need blood test Jerusalem", expectResults: true },
  { query: "Blood work Haifa", expectResults: true },
  
  // === SPECIAL TREATMENTS ===
  { query: "Fertility treatments Tel Aviv", expectResults: true },
  { query: "טיפולי פוריות", expectResults: true }, // Hebrew
  { query: "Gastrostomy care Jerusalem", expectResults: true },
  { query: "Tube feeding therapy Haifa", expectResults: true },
  { query: "Sleep counseling Beer Sheva", expectResults: true },
  { query: "Enema under instruction", expectResults: true },
  
  // === MOBILITY-SPECIFIC QUERIES ===
  { query: "Bedridden patient care Tel Aviv", expectResults: true },
  { query: "Wheelchair accessible nurse Jerusalem", expectResults: true },
  { query: "Walker assistance Haifa", expectResults: true },
  { query: "Independent mobility Beer Sheva", expectResults: true },
  { query: "Walking cane support Rishon", expectResults: true },
  
  // === TIME-BASED QUERIES ===
  { query: "Who's available now in Tel Aviv?", expectResults: true },
  { query: "מי זמין עכשיו?", expectResults: true }, // Hebrew
  { query: "Nurses available today Jerusalem", expectResults: true },
  { query: "Tonight nurse Haifa", expectResults: true },
  { query: "Tomorrow morning Beer Sheva", expectResults: true },
  { query: "This afternoon Rishon", expectResults: true },
  { query: "Weekend nurse Petach Tikva", expectResults: true },
  { query: "Friday nurse Ashdod", expectResults: true },
  { query: "Urgent care needed Tel Aviv", expectResults: true },
  { query: "Emergency nurse Jerusalem", expectResults: true },
  
  // === COMPLEX QUERIES ===
  { query: "Wound care nurse available today in Tel Aviv", expectResults: true },
  { query: "אחות לטיפול בפצעים היום בתל אביב", expectResults: true }, // Hebrew
  { query: "Blood test at home tomorrow Jerusalem", expectResults: true },
  { query: "Catheter insertion this week Haifa", expectResults: true },
  { query: "Post-surgery care for bedridden patient Beer Sheva", expectResults: true },
  { query: "Medication help for elderly Rishon", expectResults: true },
  { query: "Pediatric nurse for newborn visit Petach Tikva", expectResults: true },
  { query: "Diabetic wound specialist available now Ashdod", expectResults: true },
  { query: "Home care for wheelchair patient Nethanya", expectResults: true },
  { query: "Palliative care nurse tonight Ramat Gan", expectResults: true },
  
  // === GENERAL/DEFAULT QUERIES ===
  { query: "General nurse Tel Aviv", expectResults: true },
  { query: "Default care Jerusalem", expectResults: true },
  { query: "Any nurse available Haifa", expectResults: true },
  { query: "Need help Beer Sheva", expectResults: true },
  { query: "Medical assistance Rishon", expectResults: true },
  
  // === HEBREW CITY VARIATIONS ===
  { query: "אחיות בהרצליה", expectResults: true },
  { query: "טיפול רפואי בנתניה", expectResults: true },
  { query: "עזרה רפואית בפתח תקווה", expectResults: true },
  { query: "אחות באשדוד", expectResults: true },
  { query: "טיפול בבאר שבע", expectResults: true },
  
  // === PHYSICAL THERAPIST QUERIES ===
  { query: "Physical therapist Tel Aviv", expectResults: true },
  { query: "פיזיותרפיסט בתל אביב", expectResults: true },
  { query: "Physical therapy Jerusalem", expectResults: true },
  { query: "PT available Haifa", expectResults: true },
  
  // === EDGE CASES & TYPOS ===
  { query: "tel aviv nurses", expectResults: true }, // lowercase
  { query: "TEL AVIV NURSES", expectResults: true }, // uppercase
  { query: "Tel-Aviv nurses", expectResults: true }, // with dash
  { query: "TelAviv nurses", expectResults: true }, // no space
  { query: "Nurse in Tel Aviv-Yafo", expectResults: true }, // full name
  { query: "Hertsliya nurses", expectResults: true }, // alternate spelling
  { query: "Hefa medical", expectResults: true }, // alternate name
];

// Test runner function
async function runComprehensiveTests() {
  const results = {
    total: testQueries.length,
    passed: 0,
    failed: 0,
    errors: [],
    byCity: {},
    byService: {},
    responseTime: []
  };

  console.log(`\n${'='.repeat(60)}`);
  console.log('COMPREHENSIVE CSV TEST SUITE');
  console.log(`Running ${testQueries.length} test queries...`);
  console.log(`${'='.repeat(60)}\n`);

  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    const startTime = Date.now();
    
    try {
      // Test through chat endpoint
      const response = await axios.post('http://localhost:5050/chat', {
        message: test.query,
        engine: 'engine-basic'
      });
      
      const responseTime = Date.now() - startTime;
      results.responseTime.push(responseTime);
      
      const hasResults = response.data?.results?.length > 0;
      
      if (hasResults === test.expectResults) {
        results.passed++;
        console.log(`✅ Test ${i + 1}/${testQueries.length}: "${test.query}" (${responseTime}ms)`);
        
        // Track results by city and service
        if (response.data?.results) {
          response.data.results.forEach(nurse => {
            const city = nurse.city || 'Unknown';
            results.byCity[city] = (results.byCity[city] || 0) + 1;
            
            if (nurse.services) {
              nurse.services.forEach(service => {
                results.byService[service] = (results.byService[service] || 0) + 1;
              });
            }
          });
        }
      } else {
        results.failed++;
        results.errors.push({
          query: test.query,
          expected: test.expectResults,
          got: hasResults,
          resultCount: response.data?.results?.length || 0
        });
        console.log(`❌ Test ${i + 1}/${testQueries.length}: "${test.query}" - Expected results: ${test.expectResults}, Got: ${hasResults}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        query: test.query,
        error: error.message
      });
      console.log(`❌ Test ${i + 1}/${testQueries.length}: "${test.query}" - Error: ${error.message}`);
    }
    
    // Add small delay to avoid overwhelming the server
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST RESULTS SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} (${(results.passed/results.total*100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed} (${(results.failed/results.total*100).toFixed(1)}%)`);
  
  // Response time analysis
  if (results.responseTime.length > 0) {
    const avgTime = results.responseTime.reduce((a, b) => a + b, 0) / results.responseTime.length;
    const maxTime = Math.max(...results.responseTime);
    const minTime = Math.min(...results.responseTime);
    console.log(`\nResponse Times:`);
    console.log(`  Average: ${avgTime.toFixed(0)}ms`);
    console.log(`  Min: ${minTime}ms`);
    console.log(`  Max: ${maxTime}ms`);
  }
  
  // City coverage
  console.log(`\nCity Coverage: ${Object.keys(results.byCity).length} unique cities returned`);
  const topCities = Object.entries(results.byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log('Top 10 cities by result frequency:');
  topCities.forEach(([city, count]) => {
    console.log(`  - ${city}: ${count} results`);
  });
  
  // Service coverage
  console.log(`\nService Coverage: ${Object.keys(results.byService).length} unique services returned`);
  const topServices = Object.entries(results.byService)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log('Top 10 services by result frequency:');
  topServices.forEach(([service, count]) => {
    console.log(`  - ${service}: ${count} results`);
  });
  
  // Failed tests details
  if (results.errors.length > 0) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('FAILED TESTS DETAILS');
    console.log(`${'='.repeat(60)}`);
    results.errors.slice(0, 20).forEach((error, i) => {
      console.log(`\n${i + 1}. Query: "${error.query}"`);
      if (error.error) {
        console.log(`   Error: ${error.error}`);
      } else {
        console.log(`   Expected results: ${error.expected}`);
        console.log(`   Got results: ${error.got} (${error.resultCount} items)`);
      }
    });
    
    if (results.errors.length > 20) {
      console.log(`\n... and ${results.errors.length - 20} more failures`);
    }
  }
  
  // Write detailed report to file
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      passRate: `${(results.passed/results.total*100).toFixed(1)}%`
    },
    responseTime: {
      average: results.responseTime.reduce((a, b) => a + b, 0) / results.responseTime.length,
      min: Math.min(...results.responseTime),
      max: Math.max(...results.responseTime)
    },
    coverage: {
      cities: Object.keys(results.byCity).length,
      services: Object.keys(results.byService).length
    },
    errors: results.errors
  };
  
  fs.writeFileSync('tests/comprehensive-test-report.json', JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: tests/comprehensive-test-report.json`);
  
  return results;
}

// Run the tests
runComprehensiveTests()
  .then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });

export { testQueries, runComprehensiveTests };