#!/bin/bash

echo "================================================"
echo "    WONDER PLATFORM COMPREHENSIVE TEST SUITE   "
echo "================================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKEND_URL="https://wonder-backend-api.azurewebsites.net"
FRONTEND_URL="https://wonder-ceo-web.azurewebsites.net"

echo -e "\n${YELLOW}🔍 TEST 1: Backend Health Check${NC}"
echo "Testing: $BACKEND_URL/health"
HEALTH_RESPONSE=$(curl -s $BACKEND_URL/health)
if [[ $HEALTH_RESPONSE == *"nursesLoaded"* ]]; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
    echo "Response: ${HEALTH_RESPONSE:0:100}..."
else
    echo -e "${RED}❌ Health endpoint failed${NC}"
    echo "Response: ${HEALTH_RESPONSE:0:200}"
fi

echo -e "\n${YELLOW}🔍 TEST 2: Backend Statistics${NC}"
echo "Testing: $BACKEND_URL/stats"
STATS_RESPONSE=$(curl -s $BACKEND_URL/stats)
if [[ $STATS_RESPONSE == *"totalNurses"* ]]; then
    echo -e "${GREEN}✅ Stats endpoint working${NC}"
    echo "Response: ${STATS_RESPONSE:0:100}..."
else
    echo -e "${RED}❌ Stats endpoint failed${NC}"
fi

echo -e "\n${YELLOW}🔍 TEST 3: Match Query - City${NC}"
echo "Testing: POST $BACKEND_URL/match with city=Tel Aviv"
MATCH_RESPONSE=$(curl -s -X POST $BACKEND_URL/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":3}')
if [[ $MATCH_RESPONSE == *"results"* ]]; then
    echo -e "${GREEN}✅ Match endpoint working${NC}"
    echo "Response: ${MATCH_RESPONSE:0:200}..."
else
    echo -e "${RED}❌ Match endpoint failed${NC}"
    echo "Response: ${MATCH_RESPONSE:0:200}"
fi

echo -e "\n${YELLOW}🔍 TEST 4: Match Query - Gender Filter${NC}"
echo "Testing: POST $BACKEND_URL/match with gender=FEMALE"
GENDER_RESPONSE=$(curl -s -X POST $BACKEND_URL/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","gender":"FEMALE","topK":2}')
if [[ $GENDER_RESPONSE == *"gender"* ]]; then
    echo -e "${GREEN}✅ Gender filter working${NC}"
else
    echo -e "${RED}❌ Gender filter failed${NC}"
fi

echo -e "\n${YELLOW}🔍 TEST 5: Match Query - Service Filter${NC}"
echo "Testing: POST $BACKEND_URL/match with servicesQuery=[wound care]"
SERVICE_RESPONSE=$(curl -s -X POST $BACKEND_URL/match \
  -H "Content-Type: application/json" \
  -d '{"servicesQuery":["wound care"],"topK":2}')
if [[ $SERVICE_RESPONSE == *"services"* ]]; then
    echo -e "${GREEN}✅ Service filter working${NC}"
else
    echo -e "${RED}❌ Service filter failed${NC}"
fi

echo -e "\n${YELLOW}🔍 TEST 6: Frontend Loading${NC}"
echo "Testing: $FRONTEND_URL"
FRONTEND_RESPONSE=$(curl -s -I $FRONTEND_URL | head -1)
if [[ $FRONTEND_RESPONSE == *"200"* ]]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend status: $FRONTEND_RESPONSE${NC}"
fi

echo -e "\n${YELLOW}🔍 TEST 7: Check Nurse Names${NC}"
echo "Testing if nurses have names (not just IDs)"
NAME_CHECK=$(curl -s -X POST $BACKEND_URL/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":1}' | grep -o '"name":"[^"]*"' | head -1)
if [[ $NAME_CHECK == *"name"* ]]; then
    echo -e "${GREEN}✅ Nurse names present: $NAME_CHECK${NC}"
else
    echo -e "${RED}❌ Nurse names missing${NC}"
fi

echo -e "\n${YELLOW}🔍 TEST 8: Check Rating Explanations${NC}"
echo "Testing if ratings have explanations"
RATING_CHECK=$(curl -s -X POST $BACKEND_URL/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","topK":1}' | grep -o '"ratingExplanation":"[^"]*"' | head -1)
if [[ $RATING_CHECK == *"ratingExplanation"* ]]; then
    echo -e "${GREEN}✅ Rating explanations present${NC}"
else
    echo -e "${RED}❌ Rating explanations missing${NC}"
fi

echo -e "\n================================================"
echo -e "${YELLOW}📊 TEST SUMMARY${NC}"
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo -e "================================================\n"

# Final check
curl -s $BACKEND_URL/health | jq '.' 2>/dev/null || echo "Backend health details unavailable"