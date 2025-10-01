#!/usr/bin/env bash
set -euo pipefail
BASE=${BASE:-http://localhost:5001}
echo "Health:"            | tee docs/run_health.txt
curl -s $BASE/health      | tee -a docs/run_health.txt
echo

# Case 1: Tel Aviv / Wound Care
cat > tmp_req1.json <<'JSON'
{
  "city":"Tel Aviv","service":"Wound Care",
  "start":"2025-07-28T09:00:00Z","end":"2025-07-28T12:00:00Z",
  "lat":32.0853,"lng":34.7818,"radiusKm":20,"topK":3
}
JSON
echo "Match case1:"       | tee docs/run_case1.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @tmp_req1.json | tee -a docs/run_case1.json
echo

# Case 2: different hours (expect availability filter to change results)
cat > tmp_req2.json <<'JSON'
{
  "city":"Tel Aviv","service":"Wound Care",
  "start":"2025-07-28T17:00:00Z","end":"2025-07-28T19:00:00Z",
  "lat":32.0853,"lng":34.7818,"radiusKm":20,"topK":3
}
JSON
echo "Match case2:"       | tee docs/run_case2.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @tmp_req2.json | tee -a docs/run_case2.json
echo

# Case 3: radius tightened (expect fewer results)
cat > tmp_req3.json <<'JSON'
{
  "city":"Tel Aviv","service":"Wound Care",
  "start":"2025-07-28T09:00:00Z","end":"2025-07-28T12:00:00Z",
  "lat":32.0853,"lng":34.7818,"radiusKm":2,"topK":5
}
JSON
echo "Match case3:"       | tee docs/run_case3.json
curl -s -X POST $BASE/match -H "content-type: application/json" -d @tmp_req3.json | tee -a docs/run_case3.json
echo

rm -f tmp_req*.json
echo "DONE"