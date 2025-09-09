#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-5050}

echo "======================================"
echo "Starting ngrok tunnel for port $PORT"
echo "======================================"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "Error: ngrok is not installed"
    echo "Install with: npm install -g ngrok"
    exit 1
fi

# Check if gateway is running
if ! curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo "Warning: Gateway doesn't appear to be running on port $PORT"
    echo "Start it with: npm start (in gateway folder)"
    echo ""
fi

echo "Starting ngrok tunnel..."
echo ""

# Check if ngrok is authenticated
if ! ngrok config check > /dev/null 2>&1; then
    echo "⚠️  ngrok requires authentication (free account)"
    echo ""
    echo "Steps to authenticate:"
    echo "1. Sign up at: https://dashboard.ngrok.com/signup"
    echo "2. Get your authtoken: https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_AUTH_TOKEN"
    echo ""
    echo "After authentication, run this script again."
    exit 1
fi

echo "Once started, share the HTTPS URL with your CEO"
echo "The URL will look like: https://xxxxx.ngrok-free.app"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo "======================================"
echo ""

# Start ngrok
ngrok http $PORT --log stdout