#!/usr/bin/env bash
set -euo pipefail

echo "CSV Smoke Test Suite"
echo "===================="

# Ensure docs directory exists
mkdir -p docs

# Track summary
SUMMARY_FILE="docs/csv_results_meta.json"
echo '{"scenarios": [' > "$SUMMARY_FILE"

# Helper function to run test and save results
run_test() {
  local scenario=$1
  local city=$2
  local service=$3
  local radius=$4
  local topK=$5
  local start=$6
  local end=$7
  local urgent=$8
  local label=$9
  
  echo ""
  echo "Scenario $scenario: $label"
  echo "---"
  
  # Build payload
  local payload="{\"city\":\"$city\",\"service\":\"$service\",\"radiusKm\":$radius,\"topK\":$topK"
  if [ "$start" != "null" ]; then
    payload="$payload,\"start\":\"$start\",\"end\":\"$end\""
  fi
  payload="$payload,\"lat\":null,\"lng\":null,\"urgent\":$urgent}"
  
  # Execute request and measure time
  local start_time=$(date +%s%N)
  local response=$(curl -s -X POST http://localhost:5001/match \
    -H "Content-Type: application/json" \
    -d "$payload")
  local end_time=$(date +%s%N)
  local latency_ms=$((($end_time - $start_time) / 1000000))
  
  # Save response
  echo "$response" | jq . > "docs/csv_case_${scenario}.json"
  
  # Extract summary
  local count=$(echo "$response" | jq '.count // 0')
  local results=$(echo "$response" | jq '.results // []')
  local first_3_ids=$(echo "$results" | jq -r '.[0:3] | map(.id) | join(", ")' 2>/dev/null || echo "none")
  local mean_score=$(echo "$results" | jq '[.[] | .meta.rating // 0] | add / length' 2>/dev/null || echo "0")
  
  # Validate schema
  local schema_valid="true"
  if ! echo "$response" | jq -e '.count' >/dev/null 2>&1; then
    schema_valid="false - missing count"
  elif ! echo "$response" | jq -e '.results | type == "array"' >/dev/null 2>&1; then
    schema_valid="false - results not array"
  elif ! echo "$results" | jq -e 'all(.id)' >/dev/null 2>&1; then
    schema_valid="false - missing id in results"
  fi
  
  echo "  Count: $count"
  echo "  First 3 IDs: $first_3_ids"
  echo "  Mean rating: $mean_score"
  echo "  Latency: ${latency_ms}ms"
  echo "  Schema valid: $schema_valid"
  
  # Add to summary (escape JSON properly)
  if [ "$scenario" != "J" ]; then
    echo "{\"scenario\":\"$scenario\",\"label\":\"$label\",\"count\":$count,\"latency_ms\":$latency_ms,\"schema_valid\":\"$schema_valid\",\"first_3_ids\":\"$first_3_ids\",\"mean_score\":$mean_score}," >> "$SUMMARY_FILE"
  else
    echo "{\"scenario\":\"$scenario\",\"label\":\"$label\",\"count\":$count,\"latency_ms\":$latency_ms,\"schema_valid\":\"$schema_valid\",\"first_3_ids\":\"$first_3_ids\",\"mean_score\":$mean_score}" >> "$SUMMARY_FILE"
  fi
}

# Run 10 scenarios (A-J) with wider radii for better coverage
run_test "A" "Tel Aviv-Yafo" "Wound Care" 40 5 "null" "null" false "Tel Aviv wound care nurses (wider radius)"
run_test "B" "Haifa" "Medication" 50 3 "null" "null" true "Haifa urgent medication (wider radius)"
run_test "C" "Ramat-Gan" "Pediatrics" 35 3 "2025-09-10T09:00:00Z" "2025-09-10T12:00:00Z" false "Ramat-Gan pediatrics with time window"
run_test "D" "Bat-Yam" "General" 30 3 "null" "null" false "Bat-Yam general nurses (extended radius)"
run_test "E" "Kiryat Tivon" "General" 60 3 "null" "null" false "Kiryat Tivon general care (wide search)"
run_test "F" "Tel Aviv-Yafo" "Hospital" 35 3 "null" "null" false "Tel Aviv hospital services (extended)"
run_test "G" "Jerusalem" "Home Care" 45 4 "null" "null" false "Jerusalem home care services (wider)"
run_test "H" "Beer Sheva" "General" 50 5 "2025-09-11T14:00:00Z" "2025-09-11T18:00:00Z" false "Beer Sheva afternoon availability"
run_test "I" "Netanya" "General" 40 3 "null" "null" true "Netanya urgent general care"
run_test "J" "Ashdod" "General" 40 4 "2025-09-12T08:00:00Z" "2025-09-12T10:00:00Z" false "Ashdod morning general care"

# Close JSON array
echo ']}' >> "$SUMMARY_FILE"

# Final summary
echo ""
echo "===================="
echo "Test Suite Complete"
echo "===================="
echo ""

# Count scenarios with 0 results
zero_results=$(jq '.scenarios | map(select(.count == 0)) | length' "$SUMMARY_FILE")
echo "Scenarios with 0 results: $zero_results"

# Average latency
avg_latency=$(jq '.scenarios | map(.latency_ms) | add / length' "$SUMMARY_FILE")
echo "Average latency: ${avg_latency}ms"

# Schema violations
violations=$(jq '.scenarios | map(select(.schema_valid | startswith("false"))) | length' "$SUMMARY_FILE")
echo "Schema violations: $violations"

echo ""
echo "Results saved to:"
echo "  - Individual: docs/csv_case_A.json through docs/csv_case_J.json"
echo "  - Summary: docs/csv_results_meta.json"