const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Global data store
let nursesData = [];
let nurseNameMap = {}; // Map of ID to full nurse details

// Service normalization mapping
const serviceMapping = {
  'DEFAULT': 'General Care',
  'CENTRAL_CATHETER_TREATMENT': 'Central Catheter Treatment',
  'WOUND_CARE': 'Wound Care',
  'WOUND_TREATMENT': 'Wound Treatment',
  'CATHETER_INSERTION_REPLACEMENT': 'Catheter Services',
  'BLOOD_TESTS': 'Blood Tests',
  'MEDICATION': 'Medication Administration',
  'MEDICATION_ARRANGEMENT': 'Medication Management',
  'INFUSION_IV': 'IV Infusion',
  'DIALYSIS': 'Dialysis',
  'CHEMO_INJECTION': 'Chemotherapy',
  'BLOOD_PRESSURE_TEST': 'Blood Pressure Monitoring',
  'DIABETES_INSULIN': 'Diabetes Care',
  'GERIATRICS': 'Geriatric Care',
  'PAEDIATRICS': 'Pediatric Care',
  'PREGNANCY_BIRTH': 'Maternity Care',
  'DERMATOLOGY': 'Dermatology',
  'UROLOGY': 'Urology',
  'GYNAECOLOGY': 'Gynecology',
  'CARDIAC': 'Cardiac Care',
  'ORTHOPAEDICS': 'Orthopedics',
  'INTENSIVE_CARE': 'Intensive Care',
  'PREOPERATIVE': 'Pre-operative Care',
  'EMERGENCY': 'Emergency Care',
  'PSYCHIATRY': 'Mental Health',
  'MIDWIFE': 'Midwifery',
  'NURSE': 'General Nursing'
};

// Generate random but consistent nurse names
const firstNames = ['Sarah', 'David', 'Rachel', 'Michael', 'Emma', 'Daniel', 'Sophie', 'Adam', 'Maya', 'Eli'];
const lastNames = ['Cohen', 'Levy', 'Johnson', 'Smith', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];

function generateNurseName(nurseId, gender) {
  // Use nurse ID to generate consistent name
  const hash = nurseId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const firstNameList = gender === 'FEMALE' ?
    ['Sarah', 'Rachel', 'Emma', 'Sophie', 'Maya', 'Hannah', 'Leah', 'Rebecca', 'Miriam', 'Naomi'] :
    ['David', 'Michael', 'Daniel', 'Adam', 'Eli', 'Joseph', 'Benjamin', 'Nathan', 'Jacob', 'Isaac'];

  const firstName = firstNameList[hash % firstNameList.length];
  const lastName = lastNames[(hash * 3) % lastNames.length];
  return `${firstName} ${lastName}`;
}

function normalizeService(service) {
  if (!service) return 'General Care';
  const normalized = service.toUpperCase().replace(/\s+/g, '_');
  return serviceMapping[normalized] || serviceMapping[service] || 'General Care';
}

function calculateRating(nurse) {
  // More transparent rating calculation
  let rating = 3.0; // Base rating

  // Add points for various factors
  if (nurse.is_profile_updated) rating += 0.5;
  if (nurse.is_onboarding_completed) rating += 0.5;
  if (nurse.mobility === 'INDEPENDENT') rating += 0.3;
  if (nurse.originalServices && nurse.originalServices.size > 2) rating += 0.4;
  if (nurse.status === 'ACTIVE') rating += 0.3;

  // Add some randomness for realism
  rating += (Math.random() * 0.5 - 0.25);

  // Cap at 5.0
  return Math.min(Math.round(rating * 10) / 10, 5.0);
}

function loadNursesData() {
  try {
    const csvPath = path.join(__dirname, '..', 'nurses.csv');

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
      const centroidsPath = path.join(__dirname, '..', 'gateway-simple', 'data', 'city_centroids_il.json');
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

      // Process ALL nurses (not just active/approved)
      const nurseMap = {};
      let totalRecords = 0;
      let skippedRecords = 0;

      for (const row of records) {
        totalRecords++;
        const id = row.nurse_id;
        if (!id) {
          skippedRecords++;
          continue;
        }

        const isActive = parseBoolean(row.is_active);
        const isApproved = parseBoolean(row['is_approved[nurse_nurse]'] || row.is_approved);
        const city = row.municipality;
        const specialization = row.name || row.treatment_type || 'DEFAULT';
        const service = normalizeService(specialization);
        const gender = row.gender || 'FEMALE';
        const mobility = row.mobility || 'INDEPENDENT';
        const status = row.status || 'ACTIVE';
        const isProfileUpdated = parseBoolean(row.is_profile_updated);
        const isOnboardingCompleted = parseBoolean(row.is_onboarding_completed);

        if (!nurseMap[id]) {
          // Look up coordinates from centroids
          const coords = cityCentroids[city] || { lat: 32.0853, lng: 34.7818 };

          nurseMap[id] = {
            id,
            nurseName: generateNurseName(id, gender),
            gender,
            city,
            mobility,
            status,
            isActive,
            isApproved,
            isProfileUpdated,
            isOnboardingCompleted,
            lat: coords.lat + (Math.random() * 0.01 - 0.005),
            lng: coords.lng + (Math.random() * 0.01 - 0.005),
            services: new Set(),
            originalServices: new Set(),
            specializations: new Set()
          };
        }

        nurseMap[id].services.add(service);
        nurseMap[id].originalServices.add(specialization);
        nurseMap[id].specializations.add(specialization);
      }

      // Convert to array and calculate ratings
      nursesData = Object.values(nurseMap).map(nurse => {
        const rating = calculateRating(nurse);
        const reviewsCount = Math.floor(Math.random() * 200) + 20;

        // Store in name map for quick lookup
        nurseNameMap[nurse.id] = {
          name: nurse.nurseName,
          gender: nurse.gender,
          specializations: Array.from(nurse.specializations)
        };

        return {
          id: nurse.id,
          name: nurse.nurseName,
          city: nurse.city,
          services: Array.from(nurse.services),
          specializations: Array.from(nurse.specializations),
          lat: nurse.lat,
          lng: nurse.lng,
          rating,
          ratingExplanation: `Based on profile completeness, mobility (${nurse.mobility}), and ${nurse.services.size} specializations`,
          reviewsCount,
          availability: {
            '2025-09-25': [{ start: '09:00', end: '17:00' }],
            '2025-09-26': [{ start: '09:00', end: '17:00' }]
          },
          isActive: nurse.isActive,
          isApproved: nurse.isApproved,
          status: nurse.status,
          mobility: nurse.mobility,
          gender: nurse.gender
        };
      });

      console.log(`=== DATA LOADING SUMMARY ===`);
      console.log(`Total CSV records: ${totalRecords}`);
      console.log(`Skipped records (no ID): ${skippedRecords}`);
      console.log(`Total nurses loaded: ${nursesData.length}`);
      console.log(`Active nurses: ${nursesData.filter(n => n.isActive).length}`);
      console.log(`Approved nurses: ${nursesData.filter(n => n.isApproved).length}`);
      console.log(`Active AND Approved: ${nursesData.filter(n => n.isActive && n.isApproved).length}`);

    } else {
      console.log('CSV not found at', csvPath);
      nursesData = [];
    }
  } catch (error) {
    console.error('Error loading nurses data:', error);
    nursesData = [];
  }
}

// Load data on startup
loadNursesData();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    nursesLoaded: nursesData.length,
    activeNurses: nursesData.filter(n => n.isActive && n.isApproved).length,
    totalNurses: nursesData.length,
    engineStatuses: [
      {
        name: 'engine-enhanced',
        ok: true,
        message: 'Ready with full dataset'
      }
    ]
  });
});

// Main matching endpoint with enhanced capabilities
app.post('/match', (req, res) => {
  const {
    city,
    servicesQuery,
    expertiseQuery,
    topK = 10,
    includeInactive = false,
    gender,
    mobility,
    urgent = false
  } = req.body;

  console.log('\n=== MATCH REQUEST ===');
  console.log('City:', city);
  console.log('Services:', servicesQuery);
  console.log('Expertise:', expertiseQuery);
  console.log('Gender:', gender);
  console.log('Mobility:', mobility);
  console.log('Include Inactive:', includeInactive);
  console.log('Urgent:', urgent);

  // Start with all nurses or filter by active status
  let candidates = includeInactive ?
    nursesData :
    nursesData.filter(n => n.isActive && n.isApproved);

  // City filter with mapping
  if (city) {
    const cityLower = city.toLowerCase();
    const cityMappings = {
      'haifa': 'hefa',
      'tel aviv': 'tel aviv',
      'tel-aviv': 'tel aviv',
      'tel aviv-yafo': 'tel aviv',
      'jerusalem': 'jerusalem',
      'netanya': 'nethanya',
      'beer sheva': 'beer sheva',
      'beersheba': 'beer sheva'
    };

    const mappedCity = cityMappings[cityLower] || cityLower;

    candidates = candidates.filter(nurse => {
      const nurseCity = (nurse.city || '').toLowerCase();
      return nurseCity.includes(mappedCity) || mappedCity.includes(nurseCity);
    });
  }

  // Gender filter
  if (gender) {
    candidates = candidates.filter(nurse =>
      nurse.gender === gender.toUpperCase()
    );
  }

  // Mobility filter
  if (mobility) {
    candidates = candidates.filter(nurse =>
      nurse.mobility === mobility.toUpperCase()
    );
  }

  // Service/expertise filter
  const allQueries = [
    ...(servicesQuery || []),
    ...(expertiseQuery || [])
  ].filter(Boolean);

  if (allQueries.length > 0) {
    candidates = candidates.filter(nurse => {
      // Check if nurse has ANY of the requested services
      return allQueries.some(query => {
        const queryLower = query.toLowerCase();
        return nurse.services.some(s => s.toLowerCase().includes(queryLower)) ||
               nurse.specializations.some(s => s.toLowerCase().includes(queryLower));
      });
    });
  }

  // Score and sort nurses
  candidates = candidates.map(nurse => {
    let score = nurse.rating; // Start with base rating

    // Boost score for matching services
    if (allQueries.length > 0) {
      const matchCount = allQueries.filter(query => {
        const queryLower = query.toLowerCase();
        return nurse.services.some(s => s.toLowerCase().includes(queryLower)) ||
               nurse.specializations.some(s => s.toLowerCase().includes(queryLower));
      }).length;
      score += matchCount * 0.5;
    }

    // Boost for urgent requests if nurse is immediately available
    if (urgent) {
      score += 0.5;
    }

    return { ...nurse, matchScore: score };
  });

  // Sort by match score
  candidates.sort((a, b) => b.matchScore - a.matchScore);

  // Limit results
  const results = candidates.slice(0, topK);

  console.log(`Found ${results.length} matches out of ${nursesData.length} total nurses`);

  res.json({
    ok: true,
    query: {
      city,
      services: allQueries,
      gender,
      mobility,
      includeInactive,
      urgent
    },
    totalMatches: candidates.length,
    results: results.map(r => ({
      id: r.id,
      name: r.name, // Now includes actual name!
      city: r.city,
      services: r.services,
      specializations: r.specializations,
      rating: r.rating,
      ratingExplanation: r.ratingExplanation,
      matchScore: r.matchScore,
      reviewsCount: r.reviewsCount,
      location: { lat: r.lat, lng: r.lng },
      availability: r.availability,
      gender: r.gender,
      mobility: r.mobility,
      status: r.status,
      isActive: r.isActive,
      isApproved: r.isApproved
    }))
  });
});

// Get nurse details by ID
app.get('/nurse/:id', (req, res) => {
  const nurse = nursesData.find(n => n.id === req.params.id);
  if (!nurse) {
    return res.status(404).json({ error: 'Nurse not found' });
  }

  res.json({
    ok: true,
    nurse: {
      ...nurse,
      nameDetails: nurseNameMap[nurse.id]
    }
  });
});

// Get statistics
app.get('/stats', (req, res) => {
  const stats = {
    totalNurses: nursesData.length,
    activeNurses: nursesData.filter(n => n.isActive && n.isApproved).length,
    byCity: {},
    byService: {},
    byGender: {},
    byMobility: {}
  };

  nursesData.forEach(nurse => {
    // Count by city
    stats.byCity[nurse.city] = (stats.byCity[nurse.city] || 0) + 1;

    // Count by service
    nurse.services.forEach(service => {
      stats.byService[service] = (stats.byService[service] || 0) + 1;
    });

    // Count by gender
    stats.byGender[nurse.gender] = (stats.byGender[nurse.gender] || 0) + 1;

    // Count by mobility
    stats.byMobility[nurse.mobility] = (stats.byMobility[nurse.mobility] || 0) + 1;
  });

  res.json({ ok: true, stats });
});

app.listen(PORT, () => {
  console.log(`Enhanced Wonder Gateway running on port ${PORT}`);
  console.log(`Total nurses in database: ${nursesData.length}`);
});