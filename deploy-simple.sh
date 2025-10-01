#!/bin/bash

echo "🚀 Simple Azure Deployment Script"
echo "================================="

# Configuration
RG="wonder-llm-rg"
APP="wonder-ceo-web"

echo "1. Creating minimal Node.js app for testing..."
mkdir -p simple-deploy
cat > simple-deploy/server.js << 'EOF'
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Hebrew API is starting up...',
    timestamp: new Date().toISOString()
  });
});

// Test Hebrew endpoint
app.post('/match', (req, res) => {
  const { nurseName, topK = 3 } = req.body;

  // Mock Hebrew response for testing
  const mockResults = [
    { id: '1', name: 'אורטל צוקרל', score: 1 },
    { id: '2', name: 'בתיה אביב', score: 0.9 },
    { id: '3', name: 'מירי כהן', score: 0.8 }
  ];

  res.json({
    query: { nurseName, topK },
    results: mockResults.slice(0, topK),
    count: topK,
    hebrew: true
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Hebrew support enabled`);
});
EOF

cat > simple-deploy/package.json << 'EOF'
{
  "name": "wonder-hebrew-api",
  "version": "1.0.0",
  "description": "Simple Hebrew API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {
    "express": "^4.21.3"
  }
}
EOF

echo "2. Creating deployment package..."
cd simple-deploy
zip -r ../simple-test-deploy.zip .
cd ..

echo "3. Deploying to Azure..."
az webapp deploy \
  --resource-group $RG \
  --name $APP \
  --src-path simple-test-deploy.zip \
  --type zip \
  --restart true

echo "4. Waiting for app to start (60 seconds)..."
sleep 60

echo "5. Testing deployment..."
curl -s https://$APP.azurewebsites.net/health | jq .

echo "✅ Done! If you see JSON above, the deployment works."
echo "Next step: Replace with full Hebrew gateway code."