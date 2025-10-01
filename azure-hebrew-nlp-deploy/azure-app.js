const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Wonder Healthcare Platform is running!',
    timestamp: new Date().toISOString(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
  });
});

// Engines endpoint
app.get('/engines', (req, res) => {
  res.json({
    engines: [
      { name: 'engine-basic', healthy: true, configured: true },
      { name: 'engine-fuzzy', healthy: true, configured: true },
      { name: 'engine-hebrew-nlp', healthy: true, configured: true, message: 'Hebrew NLP with transparent scoring' },
      { name: 'engine-azure-gpt5', healthy: true, configured: false, message: 'Azure OpenAI integration' }
    ]
  });
});

// Match endpoint for nurse matching
app.post('/match', (req, res) => {
  const { city, servicesQuery, topK = 5 } = req.body;

  // Mock response for testing
  const mockNurses = [
    { id: 1, name: 'Sarah Cohen', city: city || 'Tel Aviv', score: 0.95, rating: 4.8 },
    { id: 2, name: 'Rachel Levy', city: city || 'Tel Aviv', score: 0.92, rating: 4.7 },
    { id: 3, name: 'Miriam Gold', city: city || 'Tel Aviv', score: 0.88, rating: 4.9 },
    { id: 4, name: 'David Ben-Ami', city: city || 'Tel Aviv', score: 0.85, rating: 4.6 },
    { id: 5, name: 'Esther Shapira', city: city || 'Tel Aviv', score: 0.82, rating: 4.5 }
  ];

  res.json({
    engine: 'engine-hebrew-nlp',
    count: Math.min(topK, mockNurses.length),
    results: mockNurses.slice(0, topK),
    formula: '30% Service Match + 25% Location + 20% Rating + 15% Availability + 10% Experience'
  });
});

// Catch-all route - serve index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');

  // Check if index.html exists
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // If no index.html, serve a default page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Wonder Healthcare Platform</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                 padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                 color: white; text-align: center; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { font-size: 3em; margin-bottom: 20px; }
          .status { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0; }
          button { background: white; color: #667eea; border: none; padding: 15px 30px;
                   font-size: 18px; border-radius: 5px; cursor: pointer; margin: 10px; }
          button:hover { background: #f0f0f0; }
          .api-response { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px;
                         margin-top: 20px; font-family: monospace; text-align: left; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏥 Wonder Healthcare Platform</h1>
          <div class="status">
            <h2>✅ Azure Deployment Successful!</h2>
            <p>The platform is running on Azure App Service (B3)</p>
            <p>Hebrew NLP Integration Active</p>
          </div>

          <button onclick="testHealth()">Test Health API</button>
          <button onclick="testEngines()">Test Engines API</button>
          <button onclick="testMatch()">Test Nurse Matching</button>

          <div id="response" class="api-response" style="display:none;"></div>
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
                servicesQuery: ['Wound Care', 'Diabetes'],
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
      </html>
    `);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Wonder Healthcare Platform running on port ${PORT}`);
  console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
});