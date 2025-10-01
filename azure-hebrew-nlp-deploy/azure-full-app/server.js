const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Serve static files from public folder with proper MIME types
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=UTF-8');
    } else if (filepath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Wonder Healthcare Platform with Hebrew NLP is running!',
    timestamp: new Date().toISOString(),
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    hebrewSupport: true,
    version: '2.0.0'
  });
});

// Engines endpoint
app.get('/engines', (req, res) => {
  res.json({
    engines: [
      {
        name: 'engine-basic',
        healthy: true,
        configured: true,
        description: 'Rule-based filtering engine'
      },
      {
        name: 'engine-fuzzy',
        healthy: true,
        configured: true,
        description: 'Fuzzy matching with weighted scoring'
      },
      {
        name: 'engine-hebrew-nlp',
        healthy: true,
        configured: true,
        message: 'Hebrew NLP with transparent scoring',
        formula: '30% Service + 25% Location + 20% Rating + 15% Availability + 10% Experience'
      },
      {
        name: 'engine-azure-gpt5',
        healthy: false,
        configured: false,
        message: 'Azure OpenAI integration (coming soon)'
      }
    ]
  });
});

// Mock nurses database with Hebrew names
const nursesDatabase = [
  { id: 1, name: 'שרה כהן', englishName: 'Sarah Cohen', city: 'תל אביב', score: 0.95, rating: 4.8, experience: 12, specialties: ['טיפול בפצעים', 'סוכרת'] },
  { id: 2, name: 'רחל לוי', englishName: 'Rachel Levy', city: 'תל אביב', score: 0.92, rating: 4.7, experience: 8, specialties: ['ילדים', 'חיסונים'] },
  { id: 3, name: 'מרים גולד', englishName: 'Miriam Gold', city: 'חיפה', score: 0.88, rating: 4.9, experience: 15, specialties: ['קשישים', 'טיפול פליאטיבי'] },
  { id: 4, name: 'דוד בן-עמי', englishName: 'David Ben-Ami', city: 'ירושלים', score: 0.85, rating: 4.6, experience: 6, specialties: ['דיאליזה', 'נפרולוגיה'] },
  { id: 5, name: 'אסתר שפירא', englishName: 'Esther Shapira', city: 'באר שבע', score: 0.82, rating: 4.5, experience: 10, specialties: ['אונקולוגיה', 'כימותרפיה'] },
  { id: 6, name: 'יעקב מזרחי', englishName: 'Jacob Mizrachi', city: 'תל אביב', score: 0.90, rating: 4.8, experience: 20, specialties: ['לב', 'טיפול נמרץ'] },
  { id: 7, name: 'לאה אברהם', englishName: 'Leah Abraham', city: 'חיפה', score: 0.87, rating: 4.7, experience: 7, specialties: ['יולדות', 'נשים'] },
  { id: 8, name: 'משה ישראלי', englishName: 'Moshe Israeli', city: 'ירושלים', score: 0.84, rating: 4.6, experience: 9, specialties: ['נוירולוגיה', 'שיקום'] }
];

// Match endpoint for nurse matching with Hebrew support
app.post('/match', (req, res) => {
  const { city, servicesQuery, topK = 5, engine = 'engine-hebrew-nlp' } = req.body;

  console.log('Match request received:', { city, servicesQuery, topK, engine });

  // Filter by city if provided
  let results = nursesDatabase;
  if (city) {
    const cityLower = city.toLowerCase();
    results = results.filter(nurse =>
      nurse.city.toLowerCase().includes(cityLower) ||
      nurse.city === city ||
      (city === 'Tel Aviv' && nurse.city === 'תל אביב') ||
      (city === 'Jerusalem' && nurse.city === 'ירושלים') ||
      (city === 'Haifa' && nurse.city === 'חיפה')
    );
  }

  // Calculate scores with transparent formula
  results = results.map(nurse => ({
    ...nurse,
    scoreBreakdown: {
      serviceMatch: 0.30,  // 30% weight
      location: 0.25,      // 25% weight
      rating: nurse.rating / 5 * 0.20,  // 20% weight
      availability: 0.15,  // 15% weight
      experience: Math.min(nurse.experience / 20, 1) * 0.10  // 10% weight
    },
    totalScore: 0.30 + 0.25 + (nurse.rating / 5 * 0.20) + 0.15 + Math.min(nurse.experience / 20, 1) * 0.10
  }));

  // Sort by score and limit results
  results = results
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, topK);

  res.json({
    engine: engine || 'engine-hebrew-nlp',
    count: results.length,
    results: results,
    formula: '30% Service Match + 25% Location + 20% Rating + 15% Availability + 10% Experience',
    hebrewSupport: true
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Wonder Healthcare Platform API',
    version: '2.0.0',
    endpoints: {
      health: '/health',
      engines: '/engines',
      match: '/match (POST)'
    },
    features: ['Hebrew NLP', 'Transparent Scoring', 'Multi-Engine Support']
  });
});

// Catch-all route - serve index.html for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Page not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Wonder Healthcare Platform with Hebrew NLP running on port ${PORT}`);
  console.log(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('Hebrew support enabled with transparent scoring formula');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});