// Azure App Service compatible entry point
// This file uses CommonJS for maximum compatibility

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { generateShortNurseName } = require('./src/utils/nameGenerator');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load nurse data
let nursesData = [];
try {
  const dataPath = path.join(__dirname, 'src', 'data', 'nurses.json');
  if (fs.existsSync(dataPath)) {
    nursesData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    console.log(`Loaded ${nursesData.length} nurses from data file`);
  } else {
    console.warn('Nurse data file not found, using empty dataset');
  }
} catch (error) {
  console.error('Error loading nurses data:', error);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    nursesLoaded: nursesData.length,
    port: PORT,
    environment: process.env.NODE_ENV || 'production'
  });
});

// Engines endpoint
app.get('/engines', (req, res) => {
  res.json({
    engines: [
      {
        name: 'basic',
        status: 'healthy',
        description: 'Basic filtering engine'
      }
    ]
  });
});

// Match endpoint
app.post('/match', (req, res) => {
  const { city, topK = 5, servicesQuery = [], expertiseQuery = [] } = req.body;

  if (!city) {
    return res.status(400).json({
      error: 'City parameter is required'
    });
  }

  // Simple filtering logic
  let results = nursesData
    .filter(nurse => {
      // Check if nurse is active and approved
      if (!nurse.isActive || !nurse.isApproved) return false;

      // Check city match
      const nurseMunicipalities = Array.isArray(nurse.municipality)
        ? nurse.municipality
        : [nurse.municipality];

      const cityMatch = nurseMunicipalities.some(m =>
        m && (m.toLowerCase().includes(city.toLowerCase()) ||
              city.toLowerCase().includes(m.toLowerCase()))
      );

      if (!cityMatch) return false;

      // Check services if specified
      if (servicesQuery.length > 0) {
        const nurseServices = Array.isArray(nurse.specialization)
          ? nurse.specialization
          : [nurse.specialization];

        const hasService = servicesQuery.some(requestedService =>
          nurseServices.some(nurseService =>
            nurseService && nurseService.toLowerCase().includes(requestedService.toLowerCase())
          )
        );

        if (!hasService) return false;
      }

      return true;
    })
    .slice(0, Math.min(topK, 100));

  // Transform to response format
  const nurses = results.map((nurse, index) => ({
    id: nurse.nurseId,
    name: generateShortNurseName(nurse.nurseId, nurse.gender),
    city: Array.isArray(nurse.municipality) ? nurse.municipality[0] : nurse.municipality,
    services: Array.isArray(nurse.specialization) ? nurse.specialization : [nurse.specialization],
    rating: 4.5 + (Math.random() * 0.5),
    distance: Math.random() * 10,
    matchScore: 0.9 - (index * 0.05)
  }));

  res.json({
    query: {
      city,
      topK,
      servicesQuery,
      expertiseQuery
    },
    nurses,
    total: nurses.length,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Wonder Backend API</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>Wonder Healthcare Platform - Backend API</h1>
        <p>Status: Running</p>
        <p>Nurses loaded: ${nursesData.length}</p>
        <h3>Available Endpoints:</h3>
        <ul>
          <li>GET /health - Health check</li>
          <li>GET /engines - List available engines</li>
          <li>POST /match - Find matching nurses</li>
        </ul>
        <p>Environment: ${process.env.NODE_ENV || 'production'}</p>
        <p>Port: ${PORT}</p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});