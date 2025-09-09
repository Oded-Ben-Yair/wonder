#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-5050}
BASE_URL="http://localhost:$PORT"

echo "======================================"
echo "Gateway Probe Script"
echo "======================================"
echo ""

echo "1. Health Check:"
echo "----------------"
curl -s "$BASE_URL/health" | jq . || echo "Failed to get health status"
echo ""

echo "2. Available Engines:"
echo "---------------------"
curl -s "$BASE_URL/engines" | jq . || echo "Failed to get engines"
echo ""

echo "3. Test Match (default engine):"
echo "--------------------------------"
REQ='{"city":"Tel Aviv","servicesQuery":["General Care"],"topK":3}'
echo "Request: $REQ"
echo "Response:"
curl -sS -X POST "$BASE_URL/match" \
  -H "Content-Type: application/json" \
  -d "$REQ" | jq . || echo "Failed to perform match"
echo ""

echo "======================================"
echo "Probe Complete"
echo "======================================"