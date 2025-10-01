#!/bin/bash

# Wonder Healthcare Platform - Performance Validation Script

echo "🚀 Starting Performance Validation..."

# Test compression
echo "\n📦 Testing Compression..."
curl -H "Accept-Encoding: gzip,deflate,br" -s -D - https://wonder-ceo-web.azurewebsites.net | grep -i "content-encoding" || echo "Compression not detected"

# Test caching headers
echo "\n⚡ Testing Cache Headers..."
curl -s -D - https://wonder-ceo-web.azurewebsites.net | grep -i "cache-control" || echo "Cache headers not found"

# Test preload hints
echo "\n🔗 Testing Resource Hints..."
curl -s https://wonder-ceo-web.azurewebsites.net | grep -i "preload" && echo "Preload hints found" || echo "No preload hints detected"

# Load test
echo "\n🏋️ Running Load Test..."
for i in {1..5}; do
  echo "Request $i/5:"
  time curl -o /dev/null -s https://wonder-backend-api.azurewebsites.net/health
done

echo "\n✅ Performance validation complete!"
