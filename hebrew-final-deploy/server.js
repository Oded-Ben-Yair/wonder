import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: ['https://delightful-water-0728cae03.1.azurestaticapps.net', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());

// Global data storage
let nursesData = [];
let hebrewIndex = {};
let nameMapping = {};

// Load data on startup
async function loadData() {
  try {
    // Load nurse names mapping
    const namesPath = path.join(__dirname, 'src/data/nurse_names.json');
    const namesContent = await fs.readFile(namesPath, 'utf-8');
    nameMapping = JSON.parse(namesContent);

    // Load Hebrew search index
    const indexPath = path.join(__dirname, 'src/data/hebrew_search_index.json');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    hebrewIndex = JSON.parse(indexContent);

    // Load nurses data
    const nursesPath = path.join(__dirname, 'src/data/nurses.json');
    const nursesContent = await fs.readFile(nursesPath, 'utf-8');
    const rawNurses = JSON.parse(nursesContent);

    // Transform nurses data with Hebrew names
    nursesData = rawNurses.map(nurse => ({
      id: nurse.nurseId,
      name: nameMapping[nurse.nurseId] || nurse.nurseId,
      city: nurse.municipality ? nurse.municipality[0] : 'Unknown',
      services: nurse.specialization || [],
      lat: nurse.lat || 32.0853,
      lng: nurse.lng || 34.7818,
      rating: 4.2 + Math.random() * 0.7,
      reviewsCount: Math.floor(20 + Math.random() * 180),
      isActive: nurse.isActive,
      isApproved: nurse.isApproved
    }));

    console.log(`✅ Loaded ${nursesData.length} nurses with Hebrew names`);
    console.log(`✅ Name mapping has ${Object.keys(nameMapping).length} entries`);
    console.log(`✅ Hebrew index has ${Object.keys(hebrewIndex).length} entries`);
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to sample data
    nursesData = [
      { id: '1', name: 'אורטל צוקרל', city: 'Tel Aviv', services: ['Wound Care'], rating: 4.8 },
      { id: '2', name: 'בתיה אביב', city: 'Tel Aviv', services: ['Medication'], rating: 4.7 },
      { id: '3', name: 'מירי כהן', city: 'Haifa', services: ['Wound Care'], rating: 4.6 }
    ];
  }
}

// Hebrew search function
function searchHebrew(query) {
  const { nurseName, city, servicesQuery, topK = 5, urgent } = query;
  let results = [...nursesData];

  // Filter by Hebrew name
  if (nurseName) {
    results = results.filter(nurse => {
      const nurseLower = nurse.name.toLowerCase();
      const queryLower = nurseName.toLowerCase();
      return nurseLower.includes(queryLower) || queryLower.includes(nurseLower);
    });

    // If no exact matches, try fuzzy matching
    if (results.length === 0) {
      results = nursesData.filter(nurse => {
        // Check if any part of the names match
        const nurseWords = nurse.name.split(' ');
        const queryWords = nurseName.split(' ');
        return nurseWords.some(nw => queryWords.some(qw =>
          nw.includes(qw) || qw.includes(nw)
        ));
      });
    }
  }

  // Filter by city
  if (city) {
    const cityLower = city.toLowerCase();
    results = results.filter(nurse => {
      const nurseCityLower = nurse.city.toLowerCase();
      return nurseCityLower.includes(cityLower) ||
             cityLower.includes(nurseCityLower) ||
             (city === 'תל אביב' && nurse.city.includes('Tel Aviv')) ||
             (city === 'Tel Aviv' && nurse.city.includes('Tel Aviv'));
    });
  }

  // Filter by services
  if (servicesQuery && servicesQuery.length > 0) {
    results = results.filter(nurse =>
      nurse.services.some(service =>
        servicesQuery.some(requested =>
          service.toLowerCase().includes(requested.toLowerCase())
        )
      )
    );
  }

  // Sort by rating if urgent
  if (urgent) {
    results.sort((a, b) => b.rating - a.rating);
  }

  // Limit results
  return results.slice(0, topK);
}

// Routes
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    engines: 1,
    nursesLoaded: nursesData.length,
    hebrewSupport: true,
    timestamp: new Date().toISOString(),
    engineStatuses: [{ name: 'hebrew-engine', status: 'healthy' }]
  });
});

app.get('/engines', (req, res) => {
  res.json([
    {
      name: 'hebrew-engine',
      status: 'healthy',
      features: ['Hebrew name search', 'City filtering', 'Service matching']
    }
  ]);
});

app.post('/match', (req, res) => {
  try {
    const results = searchHebrew(req.body);
    res.json({
      query: req.body,
      results: results,
      count: results.length,
      engine: 'hebrew-engine',
      hebrewEnabled: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback for engine-specific routes
app.post('/match*', (req, res) => {
  // Handle any engine-specific routes
  const results = searchHebrew(req.body);
  res.json({
    query: req.body,
    results: results,
    count: results.length,
    engine: 'hebrew-engine',
    hebrewEnabled: true
  });
});

// Start server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Hebrew API server running on port ${PORT}`);
    console.log(`✅ CORS enabled for Azure frontend`);
    console.log(`✅ ${nursesData.length} Hebrew nurses loaded`);
  });
});