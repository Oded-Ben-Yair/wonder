/**
 * CSV Data Test Suite - Testing all unique values from nurses.csv
 * Tests the /match endpoint directly with real data
 */

import axios from 'axios';
import fs from 'fs';

// Cities from CSV analysis
const cities = [
  'Tel Aviv', 'Jerusalem', 'Haifa', 'Beer Sheva', 'Rishon LeTsiyon',
  'Petach Tikva', 'Ashdod', 'Nethanya', 'Bnei Brak', 'Ramat Gan',
  'Bat Yam', 'Holon', 'Ashkelon', 'Rehovot', 'Herzliya',
  'Kfar Saba', 'Hadera', "Modi'in", 'Raanana', 'Ramat HaSharon',
  'Afula', 'Arad', 'Ariel', 'Dimona', 'Eilat',
  'Beit Shemesh', 'Givat Shmuel', 'Givatayim', 'Even Yehuda', 'Gan Yavne',
  'Tel Aviv-Yafo', 'Rishon', 'Beer Yaakov', 'Beersheba', 'Hertsliya'
];

// Service types mapped from treatment types
const serviceTypes = [
  'Wound Care', 'Medication', 'Pediatrics', 'Day Night',
  'Hospital', 'General', 'Home Care'
];

// Real treatment types from CSV
const treatmentTypes = [
  'WOUND_TREATMENT', 'DIABETIC_WOUND_TREATMENT', 'BURN_TREATMENT',
  'MEDICATION', 'MEDICATION_ARRANGEMENT', 'BLOOD_TESTS',
  'BREASTFEEDING_CONSULTATION', 'HOME_NEWBORN_VISIT',
  'CATHETER_INSERTION_REPLACEMENT', 'CENTRAL_CATHETER_TREATMENT',
  'FOLLOW_UP_AFTER_SURGERY', 'SUTURE_REMOVAL',
  'PRIVATE_SECURITY_HOME', 'ESCORTED_BY_NURSE',
  'PALLIATIVE_CARE', 'FERTILITY_TREATMENTS',
  'GASTROSTOMY_CARE_FEEDING', 'TUBE_FEEDING_THERAPY',
  'SLEEP_COUNSELING', 'ENEMA_UNDER_INSTRUCTION'
];

async function testEndpoint(city, service = null) {
  try {
    const query = {
      city: city,
      topK: 10
    };
    
    if (service) {
      query.servicesQuery = [service];
      query.expertiseQuery = [service];
    }
    
    const response = await axios.post('http://localhost:5050/match?engine=engine-basic', query);
    return {
      success: true,
      count: response.data?.results?.length || 0,
      results: response.data?.results || []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      count: 0
    };
  }
}

async function runComprehensiveTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('CSV DATA COMPREHENSIVE TEST SUITE');
  console.log(`Testing actual data from nurses.csv`);
  console.log(`${'='.repeat(60)}\n`);

  const results = {
    cityTests: { total: 0, passed: 0, failed: 0 },
    serviceTests: { total: 0, passed: 0, failed: 0 },
    combinedTests: { total: 0, passed: 0, failed: 0 },
    citiesWithResults: new Set(),
    servicesWithResults: new Set(),
    errors: []
  };

  // Test 1: City-only queries
  console.log('PHASE 1: Testing city-only queries...\n');
  for (const city of cities) {
    results.cityTests.total++;
    const result = await testEndpoint(city);
    
    if (result.success && result.count > 0) {
      results.cityTests.passed++;
      results.citiesWithResults.add(city);
      console.log(`✅ ${city}: ${result.count} nurses found`);
    } else if (result.success && result.count === 0) {
      results.cityTests.failed++;
      console.log(`⚠️  ${city}: No nurses found`);
    } else {
      results.cityTests.failed++;
      results.errors.push({ city, error: result.error });
      console.log(`❌ ${city}: Error - ${result.error}`);
    }
  }

  // Test 2: Service-only queries (with default city)
  console.log('\nPHASE 2: Testing service queries (with Tel Aviv)...\n');
  for (const service of serviceTypes) {
    results.serviceTests.total++;
    const result = await testEndpoint('Tel Aviv', service);
    
    if (result.success && result.count > 0) {
      results.serviceTests.passed++;
      results.servicesWithResults.add(service);
      console.log(`✅ ${service}: ${result.count} nurses found`);
    } else if (result.success && result.count === 0) {
      results.serviceTests.failed++;
      console.log(`⚠️  ${service}: No nurses found`);
    } else {
      results.serviceTests.failed++;
      results.errors.push({ service, error: result.error });
      console.log(`❌ ${service}: Error - ${result.error}`);
    }
  }

  // Test 3: Combined city + service queries
  console.log('\nPHASE 3: Testing combined city + service queries...\n');
  const testCombinations = [
    { city: 'Tel Aviv', service: 'Wound Care' },
    { city: 'Jerusalem', service: 'Medication' },
    { city: 'Haifa', service: 'Pediatrics' },
    { city: 'Beer Sheva', service: 'General' },
    { city: 'Rishon LeTsiyon', service: 'Home Care' },
    { city: 'Petach Tikva', service: 'Hospital' },
    { city: 'Ashdod', service: 'Day Night' },
    { city: 'Nethanya', service: 'Wound Care' },
    { city: 'Ramat Gan', service: 'General' },
    { city: 'Herzliya', service: 'Medication' }
  ];

  for (const combo of testCombinations) {
    results.combinedTests.total++;
    const result = await testEndpoint(combo.city, combo.service);
    
    if (result.success && result.count > 0) {
      results.combinedTests.passed++;
      console.log(`✅ ${combo.city} + ${combo.service}: ${result.count} nurses found`);
    } else if (result.success && result.count === 0) {
      results.combinedTests.failed++;
      console.log(`⚠️  ${combo.city} + ${combo.service}: No nurses found`);
    } else {
      results.combinedTests.failed++;
      results.errors.push(combo);
      console.log(`❌ ${combo.city} + ${combo.service}: Error - ${result.error}`);
    }
  }

  // Test 4: Edge cases
  console.log('\nPHASE 4: Testing edge cases...\n');
  const edgeCases = [
    { test: 'Empty city', query: { city: '', topK: 5 } },
    { test: 'Invalid city', query: { city: 'NonExistentCity', topK: 5 } },
    { test: 'Case variations', query: { city: 'tel aviv', topK: 5 } },
    { test: 'Hebrew city', query: { city: 'תל אביב', topK: 5 } },
    { test: 'City with dash', query: { city: 'Tel Aviv-Yafo', topK: 5 } },
    { test: 'Large topK', query: { city: 'Tel Aviv', topK: 100 } },
    { test: 'Zero topK', query: { city: 'Tel Aviv', topK: 0 } },
    { test: 'Urgent flag', query: { city: 'Tel Aviv', urgent: true, topK: 5 } }
  ];

  for (const testCase of edgeCases) {
    try {
      const response = await axios.post('http://localhost:5050/match?engine=engine-basic', testCase.query);
      const count = response.data?.results?.length || 0;
      console.log(`✅ ${testCase.test}: ${count} results`);
    } catch (error) {
      console.log(`❌ ${testCase.test}: ${error.message}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST RESULTS SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  console.log('\nCity Tests:');
  console.log(`  Total: ${results.cityTests.total}`);
  console.log(`  Passed: ${results.cityTests.passed} (${(results.cityTests.passed/results.cityTests.total*100).toFixed(1)}%)`);
  console.log(`  Failed: ${results.cityTests.failed}`);
  console.log(`  Cities with results: ${results.citiesWithResults.size}/${cities.length}`);
  
  console.log('\nService Tests:');
  console.log(`  Total: ${results.serviceTests.total}`);
  console.log(`  Passed: ${results.serviceTests.passed} (${(results.serviceTests.passed/results.serviceTests.total*100).toFixed(1)}%)`);
  console.log(`  Failed: ${results.serviceTests.failed}`);
  console.log(`  Services with results: ${results.servicesWithResults.size}/${serviceTypes.length}`);
  
  console.log('\nCombined Tests:');
  console.log(`  Total: ${results.combinedTests.total}`);
  console.log(`  Passed: ${results.combinedTests.passed} (${(results.combinedTests.passed/results.combinedTests.total*100).toFixed(1)}%)`);
  console.log(`  Failed: ${results.combinedTests.failed}`);
  
  // Cities with no results
  const citiesWithNoResults = cities.filter(c => !results.citiesWithResults.has(c));
  if (citiesWithNoResults.length > 0) {
    console.log('\nCities with no results:');
    citiesWithNoResults.forEach(city => console.log(`  - ${city}`));
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      cityTests: results.cityTests,
      serviceTests: results.serviceTests,
      combinedTests: results.combinedTests
    },
    coverage: {
      citiesWithResults: Array.from(results.citiesWithResults),
      servicesWithResults: Array.from(results.servicesWithResults),
      citiesWithNoResults
    },
    errors: results.errors
  };
  
  fs.writeFileSync('tests/csv-data-test-report.json', JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: tests/csv-data-test-report.json`);
  
  return results;
}

// Run the tests
runComprehensiveTests()
  .then(results => {
    const totalFailed = results.cityTests.failed + results.serviceTests.failed + results.combinedTests.failed;
    process.exit(totalFailed > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });