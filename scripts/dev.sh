#!/usr/bin/env bash
set -euo pipefail

echo "Starting gateway in development mode..."
cd gateway
PORT=${PORT:-5050} npm run dev