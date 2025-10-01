#!/bin/bash

# Uptime monitoring script for wonder-ceo-web
# Run this periodically to ensure app stays healthy

URL="https://wonder-ceo-web.azurewebsites.net/health"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=========================================="
echo "Uptime Check: $TIMESTAMP"
echo "=========================================="

# Check health endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" "$URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Status: HEALTHY (HTTP $HTTP_CODE)"
    echo ""
    echo "Response:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

    # Extract nurse count
    NURSES=$(echo "$BODY" | grep -o '"nursesLoaded":[0-9]*' | cut -d':' -f2)
    if [ -n "$NURSES" ]; then
        echo ""
        echo "📊 Nurses loaded: $NURSES"
    fi

    # Check response time
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$URL")
    echo "⚡ Response time: ${RESPONSE_TIME}s"

    exit 0
else
    echo "❌ Status: UNHEALTHY (HTTP $HTTP_CODE)"
    echo ""
    echo "Response:"
    echo "$BODY"

    echo ""
    echo "🔧 Attempting to restart app..."
    az webapp restart --resource-group wonder-llm-rg --name wonder-ceo-web

    echo ""
    echo "⏳ Waiting 30 seconds for restart..."
    sleep 30

    # Check again
    RESPONSE2=$(curl -s -w "\n%{http_code}" "$URL")
    HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)

    if [ "$HTTP_CODE2" = "200" ]; then
        echo "✅ App recovered successfully!"
        exit 0
    else
        echo "❌ App still unhealthy after restart. Manual intervention needed."
        exit 1
    fi
fi
