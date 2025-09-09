#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-5050}
BASE_URL="http://localhost:$PORT"

echo "======================================"
echo "CSV Smoke Test Script"
echo "======================================"
echo ""

# Check if gateway is running
echo "Checking gateway health..."
HEALTH=$(curl -s "$BASE_URL/health" 2>/dev/null || echo "{}")
if [ -z "$HEALTH" ] || [ "$HEALTH" = "{}" ]; then
    echo "ERROR: Gateway is not running on port $PORT"
    exit 1
fi

# Check for live Azure engine
ENGINES=$(curl -s "$BASE_URL/engines" 2>/dev/null || echo '{"engines":[]}')
AZURE_HEALTHY=$(echo "$ENGINES" | jq -r '.engines[] | select(.name == "engine-azure-gpt5") | .healthy' || echo "false")

if [ "$AZURE_HEALTHY" = "true" ]; then
    echo "MODE: LIVE (Azure GPT-5 configured)"
    ENGINE="engine-azure-gpt5"
else
    echo "MODE: MOCK (Using fallback engines)"
    ENGINE=$(echo "$ENGINES" | jq -r '.engines[0].name' || echo "engine-basic")
fi

echo "Using engine: $ENGINE"
echo ""

# Test scenarios
declare -a SCENARIOS=(
    '{"city":"Tel Aviv","servicesQuery":["General Care"],"topK":3}'
    '{"city":"Jerusalem","servicesQuery":["Pediatric Care"],"urgent":true,"topK":5}'
    '{"city":"Tel Aviv","servicesQuery":["Emergency Care"],"expertiseQuery":["trauma"],"topK":2}'
    '{"city":"Haifa","servicesQuery":["General Care","Home Care"],"topK":4}'
    '{"city":"Tel Aviv","servicesQuery":["Specialized Care"],"expertiseQuery":["cardiology","emergency"],"urgent":false,"topK":3}'
    '{"city":"Beer Sheva","servicesQuery":["General Care"],"topK":5}'
    '{"city":"Tel Aviv","servicesQuery":["Pediatric Care","Emergency Care"],"urgent":true,"topK":3}'
    '{"city":"Netanya","servicesQuery":["Home Care"],"expertiseQuery":["geriatrics"],"topK":2}'
    '{"city":"Tel Aviv","servicesQuery":["General Care"],"expertiseQuery":["diabetes","wound-care"],"topK":4}'
    '{"city":"Ramat Gan","servicesQuery":["Emergency Care","General Care"],"urgent":true,"topK":5}'
)

TOTAL_SCENARIOS=${#SCENARIOS[@]}
PASSED=0
FAILED=0
TOTAL_LATENCY=0
MAX_LATENCY=0

echo "Running $TOTAL_SCENARIOS test scenarios..."
echo "======================================"

for i in "${!SCENARIOS[@]}"; do
    SCENARIO_NUM=$((i + 1))
    SCENARIO="${SCENARIOS[$i]}"
    
    echo ""
    echo "Scenario $SCENARIO_NUM/$TOTAL_SCENARIOS:"
    echo "Request: $SCENARIO"
    
    START_TIME=$(date +%s%N)
    
    RESPONSE=$(curl -sS -X POST "$BASE_URL/match?engine=$ENGINE" \
        -H "Content-Type: application/json" \
        -d "$SCENARIO" \
        --max-time 95 \
        2>/dev/null || echo '{"error":"Request failed"}')
    
    END_TIME=$(date +%s%N)
    DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))
    
    # Validate response
    ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
    RESULTS=$(echo "$RESPONSE" | jq -r '.results // empty')
    LATENCY=$(echo "$RESPONSE" | jq -r '.latency_ms // 0')
    COUNT=$(echo "$RESPONSE" | jq -r '.count // 0')
    
    if [ -n "$ERROR" ]; then
        echo "❌ FAILED: $ERROR"
        FAILED=$((FAILED + 1))
    elif [ -z "$RESULTS" ]; then
        echo "❌ FAILED: No results in response"
        FAILED=$((FAILED + 1))
    else
        TOP_RESULT=$(echo "$RESPONSE" | jq -r '.results[0] | "\(.id) (score: \(.score))"')
        echo "✅ PASSED - Latency: ${LATENCY}ms, Results: $COUNT, Top: $TOP_RESULT"
        PASSED=$((PASSED + 1))
        
        # Track latency
        TOTAL_LATENCY=$((TOTAL_LATENCY + LATENCY))
        if [ "$LATENCY" -gt "$MAX_LATENCY" ]; then
            MAX_LATENCY=$LATENCY
        fi
    fi
    
    # Ensure we don't exceed max time
    if [ "$DURATION_MS" -gt 95000 ]; then
        echo "⚠️  WARNING: Request exceeded 95s timeout"
    fi
done

echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Total Scenarios: $TOTAL_SCENARIOS"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ "$PASSED" -gt 0 ]; then
    AVG_LATENCY=$((TOTAL_LATENCY / PASSED))
    echo "Average Latency: ${AVG_LATENCY}ms"
    echo "Max Latency: ${MAX_LATENCY}ms"
fi

echo "Mode: $([ "$AZURE_HEALTHY" = "true" ] && echo "LIVE" || echo "MOCK")"
echo ""

if [ "$FAILED" -eq 0 ]; then
    echo "✅ All tests PASSED!"
    exit 0
else
    echo "❌ Some tests FAILED"
    exit 1
fi