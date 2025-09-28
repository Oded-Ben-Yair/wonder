#!/bin/bash

echo "🏥 Testing Wonder Hebrew Nurse Search Functionality"
echo "=================================================="
echo ""

# Test 1: Search by Hebrew name
echo "📍 Test 1: Search by Hebrew nurse name"
echo "Query: nurseName='אורטל'"
curl -s -X POST "http://localhost:5050/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"nurseName":"אורטל","topK":2}' | jq '.results[] | {id: .id[0:8], name: .name}'
echo ""

# Test 2: Search by city in Hebrew
echo "📍 Test 2: Search by city (Tel Aviv)"
echo "Query: city='Tel Aviv'"
curl -s -X POST "http://localhost:5050/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":3}' | jq '.results[] | {id: .id[0:8], name: .name}'
echo ""

# Test 3: Search with specialization
echo "📍 Test 3: Search with wound care specialization"
echo "Query: city='Tel Aviv', servicesQuery=['Wound Care']"
curl -s -X POST "http://localhost:5050/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","servicesQuery":["Wound Care"],"topK":2}' | jq '.results[] | {id: .id[0:8], name: .name}'
echo ""

# Test 4: Get all available nurses (to see Hebrew names)
echo "📍 Test 4: Get all nurses to verify Hebrew names"
echo "Query: city='Tel Aviv' (showing first 5)"
curl -s -X POST "http://localhost:5050/match?engine=engine-basic" \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":5}' | jq '.results[] | .name'
echo ""

echo "✅ Hebrew functionality tests completed!"
echo ""
echo "🌐 UI Available at: http://localhost:3001"
echo "💬 Try these Hebrew queries in the ChatBot:"
echo "   - 'אחות בשם אורטל'"
echo "   - 'מי זמינה בתל אביב?'"
echo "   - 'אני צריך אחות לטיפול בפצעים דחוף'"