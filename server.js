const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 5050;

// CORS configuration
app.use(cors({
  origin: [
    'https://delightful-water-0728cae03.1.azurestaticapps.net',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Load nurses data from CSV
let nursesData = [];

// Service name mapping - maps from CSV specialization values to display names
function normalizeService(treatmentType) {
  const serviceMap = {
    // Wound care related
    'WOUND_CARE': 'Wound Care',
    'WOUND_TREATMENT': 'Wound Care',
    'DIABETIC_WOUND_TREATMENT': 'Diabetic Wound Care',
    'DIFFICULT_WOUND_HEALING_TREATMENT': 'Complex Wound Care',
    'BURN_TREATMENT': 'Burn Treatment',

    // Catheter and stoma
    'CENTRAL_CATHETER_TREATMENT': 'Catheter Treatment',
    'CATHETER_INSERTION_REPLACEMENT': 'Catheter Services',
    'STOMA_TREATMENT': 'Stoma Care',

    // Medication
    'MEDICATION': 'Medication Management',
    'MEDICATION_ARRANGEMENT': 'Medication Arrangement',

    // Pediatrics and newborn
    'PEDIATRICS': 'Pediatrics',
    'BREASTFEEDING_CONSULTATION': 'Breastfeeding Support',
    'HOME_NEWBORN_VISIT': 'Newborn Care',
    'DAY_NIGHT_CIRCUMCISION_NURSE': 'Circumcision Care',

    // Hospital and security
    'PRIVATE_SECURITY_HOSPITAL': 'Hospital Security',
    'PRIVATE_SECURITY_HOME': 'Home Security',
    'FOLLOW_UP_AFTER_SURGERY': 'Post-Surgery Care',

    // Tests and procedures
    'BLOOD_TESTS': 'Blood Tests',
    'ENEMA_UNDER_INSTRUCTION': 'Enema Procedure',
    'ABDOMINAL_DRAINAGE_BY_EXTERNAL_DRAINAGE': 'Abdominal Drainage',

    // Home care
    'ESCORTED_BY_NURSE': 'Nurse Escort',
    'FERTILITY_TREATMENTS': 'Fertility Support',
    'GASTROSTOMY_CARE_FEEDING': 'Gastrostomy Care',
    'HANDLING_AND_TRACKING_METRICS': 'Health Monitoring',
    'HEALTHY_LIFESTYLE_GUIDANCE': 'Lifestyle Guidance',

    // General
    'DEFAULT': 'General Nursing',
    'NURSE': 'General Nursing',
    'PHYSICAL_THERAPIST': 'Physical Therapy'
  };
  return serviceMap[treatmentType] || treatmentType || 'General Nursing';
}

// Deterministic hash for ratings
function hashToUnit(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h % 1000) / 1000; // 0..0.999
}

function deterministicRating(id) {
  return 3.5 + hashToUnit(id) * 1.5;
}

function deterministicReviews(id) {
  return Math.floor(hashToUnit(id + 'reviews') * 100) + 5;
}

function loadNursesData() {
  try {
    // Try to load CSV data
    const csvPath = path.join(__dirname, 'data', 'nurses.csv');
    
    if (fs.existsSync(csvPath)) {
      console.log('Loading data from CSV file');
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
      });
      
      // Load city centroids
      const centroidsPath = path.join(__dirname, 'data', 'city_centroids_il.json');
      let cityCentroids = {};
      try {
        const centroidsData = fs.readFileSync(centroidsPath, 'utf-8');
        cityCentroids = JSON.parse(centroidsData);
      } catch (e) {
        console.warn('Could not load city centroids, using defaults');
      }
      
      // Parse boolean fields
      const parseBoolean = (val) => {
        if (val === undefined || val === null || val === '') return false;
        if (typeof val === 'number') return val === 1;
        const str = String(val).toLowerCase().trim();
        return str === 'true' || str === 't' || str === '1' || str === 'yes';
      };
      
      // Group by nurse_id and aggregate data
      const nurseMap = {};
      for (const row of records) {
        const id = row.nurse_id;
        // Keep active and approved nurses
        if (!id) continue;
        
        const isActive = parseBoolean(row.is_active);
        const isApproved = parseBoolean(row['is_approved[nurse_nurse]'] || row.is_approved);
        
        // Only include active and approved nurses
        if (!isActive || !isApproved) continue;
        
        const city = row.municipality;
        // The specialization is in the 'name' field (column 3 in CSV)
        const specialization = row.name || row.treatment_type || 'DEFAULT';
        const service = normalizeService(specialization);

        if (!nurseMap[id]) {
          // Look up coordinates from centroids
          const coords = cityCentroids[city] || { lat: 32.0853, lng: 34.7818 };
          
          nurseMap[id] = {
            id,
            name: `Nurse ${id.substring(0, 8)}`,
            gender: row.gender,
            city: city || 'Unknown',
            lat: coords.lat,
            lng: coords.lng,
            services: new Set(),
            originalServices: new Set(), // Keep original specialization names for better matching
            rating: deterministicRating(id),
            reviewsCount: deterministicReviews(id),
            availability: {
              '2025-09-16': [{ start: '08:00', end: '17:00' }],
              '2025-09-17': [{ start: '08:00', end: '17:00' }],
              '2025-09-18': [{ start: '08:00', end: '17:00' }],
              '2025-09-19': [{ start: '08:00', end: '17:00' }],
              '2025-09-20': [{ start: '08:00', end: '14:00' }]
            }
          };
        }

        nurseMap[id].services.add(service);
        nurseMap[id].originalServices.add(specialization);
      }
      
      // Convert to array and services Set to array
      nursesData = Object.values(nurseMap).map(nurse => ({
        ...nurse,
        services: Array.from(nurse.services),
        originalServices: Array.from(nurse.originalServices)
      }));
      
      console.log(`Loaded ${nursesData.length} nurses from CSV`);
      
    } else {
      // Fall back to mock data if CSV doesn't exist
      console.log('CSV not found, using mock data');
      nursesData = [
        {
          id: 'nurse-001',
          name: 'Sarah Johnson',
          city: 'Tel Aviv',
          services: ['Wound Care', 'Medication', 'General'],
          lat: 32.0853,
          lng: 34.7818,
          rating: 4.8,
          reviewsCount: 127,
          availability: {
            '2025-09-16': [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
            '2025-09-17': [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }]
          }
        },
        {
          id: 'nurse-002',
          name: 'Michael Cohen',
          city: 'Tel Aviv',
          services: ['Pediatrics', 'General'],
          lat: 32.0753,
          lng: 34.7718,
          rating: 4.9,
          reviewsCount: 89,
          availability: {
            '2025-09-16': [{ start: '08:00', end: '16:00' }],
            '2025-09-17': [{ start: '08:00', end: '16:00' }]
          }
        },
        {
          id: 'nurse-003',
          name: 'Emma Davis',
          city: 'Haifa',
          services: ['Home Care', 'Wound Care'],
          lat: 32.7940,
          lng: 34.9896,
          rating: 4.7,
          reviewsCount: 156,
          availability: {
            '2025-09-16': [{ start: '10:00', end: '18:00' }],
            '2025-09-17': [{ start: '10:00', end: '18:00' }]
          }
        },
        {
          id: 'nurse-004',
          name: 'David Levi',
          city: 'Jerusalem',
          services: ['Hospital', 'General'],
          lat: 31.7683,
          lng: 35.2137,
          rating: 4.6,
          reviewsCount: 203,
          availability: {
            '2025-09-16': [{ start: '07:00', end: '15:00' }],
            '2025-09-17': [{ start: '07:00', end: '15:00' }]
          }
        },
        {
          id: 'nurse-005',
          name: 'Rachel Green',
          city: 'Beer Sheba',
          services: ['Day Night', 'Pediatrics'],
          lat: 31.2589,
          lng: 34.7996,
          rating: 4.9,
          reviewsCount: 97,
          availability: {
            '2025-09-16': [{ start: '06:00', end: '14:00' }],
            '2025-09-17': [{ start: '06:00', end: '14:00' }]
          }
        }
      ];
    }
  } catch (error) {
    console.error('Error loading nurses data:', error.message);
    nursesData = [];
  }
}

// Load data on startup
loadNursesData();

// Matching logic
function matchNurses(query) {
  const {
    city,
    service,
    servicesQuery = [],
    expertiseQuery = [],
    topK = 5
  } = query;

  let filtered = nursesData;
  let matchReasons = [];

  // Filter by city - handle variations like "Tel Aviv" vs "Tel Aviv-Yafo"
  if (city) {
    const cityLower = city.toLowerCase().replace(/-/g, ' ');
    filtered = filtered.filter(n => {
      if (!n.city) return false;
      const nCityLower = n.city.toLowerCase().replace(/-/g, ' ');
      // Check for partial matches
      return nCityLower.includes(cityLower) || cityLower.includes(nCityLower);
    });
    if (filtered.length > 0) matchReasons.push('city');
  }

  // Filter by services - check both servicesQuery and expertiseQuery
  const allServiceQueries = [
    ...(servicesQuery || []),
    ...(expertiseQuery || []),
    ...(service ? [service] : [])
  ].filter(Boolean);

  if (allServiceQueries.length > 0) {
    filtered = filtered.filter(n => {
      if (!n.services && !n.originalServices) return false;

      return allServiceQueries.some(query => {
        const queryLower = query.toLowerCase();

        // Check normalized service names
        const matchesService = n.services && n.services.some(s =>
          s.toLowerCase().includes(queryLower) ||
          queryLower.includes(s.toLowerCase())
        );

        // Check original specialization names (from CSV)
        const matchesOriginal = n.originalServices && n.originalServices.some(s =>
          s.toLowerCase().includes(queryLower) ||
          queryLower.includes(s.toLowerCase())
        );

        return matchesService || matchesOriginal;
      });
    });
    if (filtered.length > 0) matchReasons.push('services');
  }

  // Sort by rating
  filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Return top K results
  return filtered.slice(0, topK).map(n => ({
    id: n.id,
    name: n.name,
    city: n.city,
    services: n.services,
    rating: n.rating,
    reviewsCount: n.reviewsCount,
    score: 1,
    reason: matchReasons.length > 0 ? `matched: ${matchReasons.join(', ')}` : 'matched'
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    nursesLoaded: nursesData.length,
    engineStatuses: [
      {
        name: 'engine-basic',
        ok: true,
        message: 'Ready'
      }
    ]
  });
});

// Match endpoint
app.post('/match', (req, res) => {
  try {
    const results = matchNurses(req.body);
    
    res.json({
      engine: 'engine-basic',
      latency_ms: 10,
      count: results.length,
      results: results
    });
  } catch (error) {
    console.error('Match error:', error.message);
    res.status(500).json({
      error: error.message,
      engine: 'engine-basic',
      count: 0,
      results: []
    });
  }
});

// Engines endpoint
app.get('/engines', (req, res) => {
  res.json([
    {
      name: 'engine-basic',
      ok: true,
      message: 'Ready'
    }
  ]);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Gateway server running on port ${PORT}`);
  console.log(`Loaded ${nursesData.length} nurses`);
});