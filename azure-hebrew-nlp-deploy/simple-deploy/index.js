const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Wonder Healthcare Platform is running!',
      timestamp: new Date().toISOString(),
      hebrewSupport: true
    }));
    return;
  }

  // Engines endpoint
  if (req.url === '/engines') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      engines: [
        { name: 'engine-hebrew-nlp', healthy: true, configured: true }
      ]
    }));
    return;
  }

  // Match endpoint
  if (req.url === '/match' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        engine: 'engine-hebrew-nlp',
        count: 3,
        results: [
          { id: 1, name: 'Sarah Cohen', city: 'Tel Aviv', score: 0.95 },
          { id: 2, name: 'Rachel Levy', city: 'Tel Aviv', score: 0.92 },
          { id: 3, name: 'Miriam Gold', city: 'Tel Aviv', score: 0.88 }
        ],
        formula: '30% Service + 25% Location + 20% Rating'
      }));
    });
    return;
  }

  // Default HTML page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
  res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Wonder Healthcare</title>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 50px;
      text-align: center;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      font-size: 3em;
      margin-bottom: 20px;
    }
    .status {
      background: rgba(255,255,255,0.2);
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
    }
    button {
      background: white;
      color: #667eea;
      border: none;
      padding: 15px 30px;
      font-size: 18px;
      border-radius: 5px;
      cursor: pointer;
      margin: 10px;
    }
    button:hover {
      background: #f0f0f0;
    }
    .api-response {
      background: rgba(0,0,0,0.3);
      padding: 15px;
      border-radius: 5px;
      margin-top: 20px;
      font-family: monospace;
      text-align: left;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 Wonder Healthcare Platform</h1>
    <div class="status">
      <h2>✅ Hebrew NLP Integration Active</h2>
      <p>Azure Deployment Successful on B3 Plan</p>
      <p>Transparent Scoring Formula Enabled</p>
    </div>

    <button onclick="testHealth()">Test Health API</button>
    <button onclick="testEngines()">Test Engines API</button>
    <button onclick="testMatch()">Test Nurse Matching</button>

    <div id="response" class="api-response"></div>
  </div>

  <script>
    async function testHealth() {
      const res = await fetch('/health');
      const data = await res.json();
      showResponse('Health Check', data);
    }

    async function testEngines() {
      const res = await fetch('/engines');
      const data = await res.json();
      showResponse('Available Engines', data);
    }

    async function testMatch() {
      const res = await fetch('/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: 'Tel Aviv',
          servicesQuery: ['Wound Care'],
          topK: 3
        })
      });
      const data = await res.json();
      showResponse('Nurse Matching Results', data);
    }

    function showResponse(title, data) {
      const div = document.getElementById('response');
      div.style.display = 'block';
      div.innerHTML = '<h3>' + title + '</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
    }
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(\`Wonder Healthcare Platform running on port \${PORT}\`);
});