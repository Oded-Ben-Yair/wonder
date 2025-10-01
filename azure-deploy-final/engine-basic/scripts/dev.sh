#!/usr/bin/env bash
set -euo pipefail

# Kill any existing node process on port 5001
echo "Checking for processes on port 5001..."
lsof -ti:5001 | xargs -r kill -9 2>/dev/null || true
sleep 1

# Start the server
echo "Starting Basic Filter server..."
nohup npm start >/tmp/basic-filter.log 2>&1 &
PID=$!
echo "Server started with PID: $PID"

# Wait for server to be ready
echo "Waiting for server to be ready..."
sleep 2

# Check health endpoint
echo "Checking health endpoint..."
curl -s http://localhost:5001/health | jq . || echo "Health check failed"

echo "Server logs available at: /tmp/basic-filter.log"
echo "Demo available at: http://localhost:5001/docs/demo.html"