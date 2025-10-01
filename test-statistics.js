#!/usr/bin/env node

/**
 * Test script to verify query statistics tracking
 * Tests the transparent query processing statistics feature
 */

async function testStatistics() {
  const BASE_URL = 'http://localhost:5050';

  console.log('🧪 Testing Query Statistics Feature\n');
  console.log('=' .repeat(60));

  // Test query
  const testQuery = {
    city: 'Tel Aviv',
    service: 'Wound Care',
    topK: 5
  };

  console.log('\n📋 Test Query:');
  console.log(JSON.stringify(testQuery, null, 2));

  try {
    console.log(`\n🌐 Sending request to ${BASE_URL}/match...`);

    const response = await fetch(`${BASE_URL}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuery)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('\n✅ Response received!\n');
    console.log('=' .repeat(60));

    // Display statistics
    if (data.statistics) {
      console.log('\n📊 QUERY PROCESSING STATISTICS:');
      console.log('─'.repeat(60));

      const stats = data.statistics;
      console.log(`\n  Total Nurses in Database:     ${stats.totalNurses}`);
      console.log(`  ├─ Filtered by Location:       ${stats.filteredByLocation}`);
      console.log(`  ├─ Filtered by Service:        ${stats.filteredByService}`);
      console.log(`  ├─ Available Nurses:           ${stats.availableNurses}`);
      console.log(`  └─ Ranked Results Returned:    ${stats.rankedResults}`);

      console.log('\n⏱️  TIMING BREAKDOWN:');
      console.log('─'.repeat(60));
      console.log(`  Parsing Time:    ${stats.timings.parsing}ms`);
      console.log(`  Matching Time:   ${stats.timings.matching}ms`);
      console.log(`  Total Time:      ${stats.timings.total}ms`);

      // Display filtering funnel
      console.log('\n🔍 FILTERING FUNNEL:');
      console.log('─'.repeat(60));
      const pctLocation = ((stats.filteredByLocation / stats.totalNurses) * 100).toFixed(1);
      const pctService = ((stats.filteredByService / stats.filteredByLocation) * 100).toFixed(1);
      const pctAvailable = ((stats.availableNurses / stats.filteredByService) * 100).toFixed(1);
      const pctFinal = ((stats.rankedResults / stats.availableNurses) * 100).toFixed(1);

      console.log(`  ${stats.totalNurses} → ${stats.filteredByLocation} (${pctLocation}% passed location filter)`);
      console.log(`  ${stats.filteredByLocation} → ${stats.filteredByService} (${pctService}% passed service filter)`);
      console.log(`  ${stats.filteredByService} → ${stats.availableNurses} (${pctAvailable}% available)`);
      console.log(`  ${stats.availableNurses} → ${stats.rankedResults} (${pctFinal}% in top ${testQuery.topK})`);
    } else {
      console.log('\n⚠️  No statistics found in response');
    }

    // Display sample results
    if (data.results && data.results.length > 0) {
      console.log('\n👥 SAMPLE RESULTS:');
      console.log('─'.repeat(60));
      data.results.slice(0, 3).forEach((nurse, idx) => {
        console.log(`\n  ${idx + 1}. ${nurse.displayName || nurse.name}`);
        console.log(`     City: ${nurse.city}`);
        console.log(`     Match Score: ${(nurse.matchScore * 100).toFixed(1)}%`);
        if (nurse.meta) {
          console.log(`     Rating: ${nurse.meta.rating}★ (${nurse.meta.reviewsCount} reviews)`);
          if (nurse.meta.distanceKm) {
            console.log(`     Distance: ${nurse.meta.distanceKm.toFixed(1)} km`);
          }
        }
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n💡 Make sure the gateway is running on port 5050:');
    console.error('   cd packages/gateway && PORT=5050 npm start\n');
    process.exit(1);
  }
}

// Run test
testStatistics();