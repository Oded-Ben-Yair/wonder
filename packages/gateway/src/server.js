import express from 'express';
import cors from 'cors';
import pino from 'pino';
import Joi from 'joi';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { maskObject, maskSensitive } from './util/mask.js';
import { startTimer, withTimeout } from './util/timing.js';
import { fetchNursesFromDB, testConnection as testDBConnection } from './db.js';
// import { generateShortNurseName } from './utils/nameGenerator.js'; // TODO: Fix module compatibility

// Configuration: Use database or file-based caching
const USE_DB = process.env.USE_DB === 'true';

// Load nurse names mapping (will load at startup)
let nurseNamesData = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5050;

// Initialize logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});

// Load engines
const engines = new Map();
let nursesData = [];

// Transform production data format to engine-compatible format
function transformNurseData(productionNurse, index) {
  // Extract municipalities - handle both string and array
  const municipalities = Array.isArray(productionNurse.municipality) 
    ? productionNurse.municipality 
    : [productionNurse.municipality].filter(Boolean);
  
  // Find primary city - prefer Tel Aviv, Jerusalem, Haifa, then any Hebrew/English city
  const primaryCity = municipalities.find(city => 
    city?.includes('Tel Aviv') || city?.includes('תל אביב')
  ) || municipalities.find(city => 
    city?.includes('Jerusalem') || city?.includes('ירושלים')
  ) || municipalities.find(city => 
    city?.includes('Hefa') || city?.includes('חיפה')
  ) || municipalities.find(city => 
    city && !city.includes('undefined')
  ) || 'Unknown';

  // Extract specializations and map to services
  const specializations = Array.isArray(productionNurse.specialization) 
    ? productionNurse.specialization 
    : [productionNurse.specialization].filter(Boolean);
  
  // Map specializations to user-friendly services
  const services = specializations.map(spec => {
    const specMap = {
      'DEFAULT': 'General',
      'WOUND_CARE': 'Wound Care',
      'WOUND_TREATMENT': 'Wound Care',
      'DIABETIC_WOUND_TREATMENT': 'Wound Care',
      'DIFFICULT_WOUND_HEALING_TREATMENT': 'Wound Care',
      'BURN_TREATMENT': 'Wound Care',
      'CENTRAL_CATHETER_TREATMENT': 'Hospital',
      'CATHETER_INSERTION_REPLACEMENT': 'Hospital',
      'FOLLOW_UP_AFTER_SURGERY': 'Hospital',
      'HOSPITAL': 'Hospital',
      'MEDICATION': 'Medication',
      'MEDICATION_ARRANGEMENT': 'Medication',
      'DAY_NIGHT_CIRCUMCISION_NURSE': 'Day Night',
      'PEDIATRICS': 'Pediatrics',
      'BREASTFEEDING_CONSULTATION': 'Pediatrics',
      'HOME_NEWBORN_VISIT': 'Pediatrics',
      'PRIVATE_SECURITY_HOSPITAL': 'Hospital',
      'PRIVATE_SECURITY_HOME': 'Home Care',
      'PALLIATIVE_CARE': 'Home Care',
      'GERIATRIC_CARE': 'Home Care',
      'ESCORTED_BY_NURSE': 'Home Care',
      'FERTILITY_TREATMENTS': 'Home Care',
      'GASTROSTOMY_CARE_FEEDING': 'Home Care',
      'HANDLING_AND_TRACKING_METRICS': 'Home Care',
      'HEALTHY_LIFESTYLE_GUIDANCE': 'Home Care',
      'BLOOD_TESTS': 'General',
      'ENEMA_UNDER_INSTRUCTION': 'General'
    };
    return specMap[spec] || 'General';
  }).filter(s => s);

  // Ensure at least one service
  if (services.length === 0) {
    services.push('General Nursing');
  }

  // Create expertise tags from specializations and mobility
  const expertiseTags = [
    ...specializations.filter(s => s !== 'DEFAULT').map(s => s.toLowerCase().replace(/_/g, ' ')),
    ...(Array.isArray(productionNurse.mobility) ? productionNurse.mobility : []).map(m => m.toLowerCase().replace(/_/g, ' '))
  ].slice(0, 5); // Limit to 5 tags

  // Generate synthetic coordinates for major cities (rough approximations)
  const cityCoords = {
    'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
    'תל אביב-יפו': { lat: 32.0853, lng: 34.7818 },
    'Jerusalem': { lat: 31.7683, lng: 35.2137 },
    'ירושלים': { lat: 31.7683, lng: 35.2137 },
    'Haifa': { lat: 32.7940, lng: 34.9896 },
    'חיפה': { lat: 32.7940, lng: 34.9896 },
    'Hefa': { lat: 32.7940, lng: 34.9896 },
    'Ramat-Gan': { lat: 32.0719, lng: 34.8242 },
    'רמת גן': { lat: 32.0719, lng: 34.8242 },
    'Petach Tikva': { lat: 32.0922, lng: 34.8878 },
    'פתח תקווה': { lat: 32.0922, lng: 34.8878 }
  };

  const coords = cityCoords[primaryCity] || 
    Object.values(cityCoords).find((_, i) => i === index % Object.keys(cityCoords).length) ||
    { lat: 32.0853, lng: 34.7818 }; // Default to Tel Aviv

  // Generate synthetic rating and reviews based on experience and approvals
  const isApproved = productionNurse.isApproved;
  const isProfileUpdated = productionNurse.isProfileUpdated;
  const hasMultipleSpecializations = specializations.length > 3;
  
  let rating = 4.2 + Math.random() * 0.6; // Base 4.2-4.8
  if (isApproved) rating += 0.2;
  if (isProfileUpdated) rating += 0.1;
  if (hasMultipleSpecializations) rating += 0.1;
  rating = Math.min(5.0, rating);

  const reviewsCount = Math.floor(20 + Math.random() * 200 + (specializations.length * 10));

  // Generate availability based on status and activity
  const availability = {};
  if (productionNurse.isActive && isApproved) {
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate random availability patterns
      if (Math.random() > 0.3) { // 70% chance of availability per day
        availability[dateStr] = [
          { start: "08:00", end: "16:00" },
          ...(Math.random() > 0.5 ? [{ start: "18:00", end: "22:00" }] : [])
        ];
      }
    }
  }

  // Get nurse name from the mapping
  const nurseId = productionNurse.nurseId || `nurse-${index}`;
  const nurseNameInfo = nurseNamesData[nurseId];
  const nurseName = nurseNameInfo ? nurseNameInfo.displayName :
    (productionNurse.displayName || productionNurse.firstName && productionNurse.lastName ?
      `${productionNurse.firstName} ${productionNurse.lastName}` : `Nurse ${index + 1}`);

  return {
    id: nurseId,
    name: nurseName,
    firstName: nurseNameInfo?.firstName || productionNurse.firstName || '',
    lastName: nurseNameInfo?.lastName || productionNurse.lastName || '',
    displayName: nurseName,
    isHebrew: nurseNameInfo?.isHebrew || false,
    searchableNames: nurseNameInfo?.searchVariations || [],
    city: primaryCity.replace(/תל אביב-יפו|תל אביב/g, 'Tel Aviv')
                    .replace(/ירושלים/g, 'Jerusalem')
                    .replace(/חיפה/g, 'Haifa')
                    .replace(/רמת גן/g, 'Ramat-Gan')
                    .replace(/פתח תקווה/g, 'Petach Tikva'),
    lat: coords.lat,
    lng: coords.lng,
    services: services,
    expertiseTags: expertiseTags,
    rating: Math.round(rating * 10) / 10,
    reviewsCount: reviewsCount,
    availability: availability,
    // Keep original data for debugging
    _originalId: productionNurse.nurseId,
    _isActive: productionNurse.isActive,
    _isApproved: productionNurse.isApproved,
    _originalMunicipalities: municipalities
  };
}

async function loadEngines() {
  const packagesDir = path.join(__dirname, '..', '..');
  const dirs = await fs.readdir(packagesDir);
  
  for (const dir of dirs) {
    if (!dir.startsWith('engine-')) continue;
    
    try {
      const adapterPath = path.join(packagesDir, dir, 'adapter.js');
      const stats = await fs.stat(adapterPath).catch(() => null);
      
      if (stats && stats.isFile()) {
        const adapter = await import(`file://${adapterPath}`);
        const engineName = adapter.ENGINE_NAME || dir;
        
        engines.set(engineName, {
          name: engineName,
          match: adapter.match,
          health: adapter.health
        });
        
        logger.info({ engine: engineName }, 'Loaded engine adapter');
      }
    } catch (error) {
      logger.error({ engine: dir, error: error.message }, 'Failed to load engine adapter');
    }
  }
  
  logger.info({ count: engines.size }, 'Engines loaded');
}

async function loadNursesData() {
  try {
    // First load the nurse names mapping
    try {
      const namesPath = path.join(__dirname, 'data', 'nurse_names.json');
      const namesData = await fs.readFile(namesPath, 'utf-8');
      nurseNamesData = JSON.parse(namesData);
      logger.info({ count: Object.keys(nurseNamesData).length }, 'Nurse names mapping loaded');
    } catch (err) {
      logger.warn('Could not load nurse names mapping, using default names');
      nurseNamesData = {};
    }

    // Then try to load CSV data
    const csvPath = path.join(__dirname, 'data', 'nurses.csv');
    const jsonPath = path.join(__dirname, 'data', 'nurses.json');
    
    let rawNursesData;
    
    try {
      // Check if CSV exists
      await fs.access(csvPath);
      logger.info('Loading data from CSV file');
      
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      
      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
      });
      
      // Load city centroids for coordinate mapping
      const centroidsPath = path.join(__dirname, 'data', 'city_centroids_il.json');
      let cityCentroids = {};
      try {
        const centroidsData = await fs.readFile(centroidsPath, 'utf-8');
        cityCentroids = JSON.parse(centroidsData);
      } catch (e) {
        logger.warn('Could not load city centroids, using defaults');
      }
      
      // Transform CSV records to match expected format
      rawNursesData = records.map(row => {
        // Get coordinates from centroids
        const coords = cityCentroids[row.municipality] || { lat: 32.0853, lng: 34.7818 };
        
        // Parse boolean fields - handle 't', 'true', '1', 1, etc.
        const parseBoolean = (val) => {
          if (val === undefined || val === null || val === '') return false;
          if (typeof val === 'number') return val === 1;
          const str = String(val).toLowerCase().trim();
          return str === 'true' || str === 't' || str === '1' || str === 'yes';
        };
        
        return {
          nurseId: row.nurse_id,
          gender: row.gender,
          name: row.name,
          mobility: row.mobility ? [row.mobility] : [],
          municipality: row.municipality ? [row.municipality] : [],
          specialization: row.treatment_type ? [row.treatment_type] : [], // Use treatment_type column
          isActive: parseBoolean(row.is_active),
          isApproved: parseBoolean(row['is_approved[nurse_nurse]'] || row.is_approved),
          isProfileUpdated: parseBoolean(row.is_profile_updated),
          isOnboardingCompleted: parseBoolean(row.is_onboarding_completed),
          lat: coords.lat,
          lng: coords.lng
        };
      });
      
      logger.info({ count: rawNursesData.length }, 'CSV data loaded and transformed');
      
    } catch (csvError) {
      // Fall back to JSON if CSV doesn't exist
      logger.info('CSV not found, loading from JSON');
      const data = await fs.readFile(jsonPath, 'utf-8');
      rawNursesData = JSON.parse(data);
    }
    
    logger.info({ rawCount: rawNursesData.length }, 'Raw production data loaded');
    
    // Transform production data to engine-compatible format
    nursesData = rawNursesData
      .filter(nurse => nurse.isActive && nurse.isApproved) // Only active approved nurses
      .map(transformNurseData);
    
    logger.info({ 
      totalRaw: rawNursesData.length,
      activeApproved: nursesData.length,
      sampleCities: nursesData.slice(0, 5).map(n => n.city)
    }, 'Nurses data transformed and loaded');
    
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Failed to load nurses data');
    // Create minimal sample data if file doesn't exist
    nursesData = [
      {
        id: "nurse-001",
        name: "Jane Doe",
        city: "Tel Aviv",
        lat: 32.0853,
        lng: 34.7818,
        services: ["General Care", "Pediatric Care"],
        expertiseTags: ["pediatrics", "emergency"],
        rating: 4.8,
        reviewsCount: 42,
        availability: {
          "2024-01-15": [{ start: "08:00", end: "16:00" }]
        }
      }
    ];
    logger.warn({ count: nursesData.length }, 'Using fallback sample data');
  }
}

// Request validation schema with enhanced validation
const matchSchema = Joi.object({
  city: Joi.string().optional(), // Made optional to allow searching by nurseName
  nurseName: Joi.string().optional(), // Added for Hebrew name searches
  servicesQuery: Joi.array().items(Joi.string()).default([]),
  expertise: Joi.array().items(Joi.string()).default([]),
  expertiseQuery: Joi.array().items(Joi.string()).default([]),
  urgent: Joi.boolean().default(false),
  topK: Joi.number().min(1).max(100).default(5),
  engine: Joi.string().optional(),
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional(),
  lat: Joi.number().min(-90).max(90).optional(), // Valid latitude range
  lng: Joi.number().min(-180).max(180).optional(), // Valid longitude range
  radiusKm: Joi.number().min(0).max(500).optional(), // Reasonable radius limit
  weights: Joi.object().optional()
})
.or('city', 'nurseName') // Require at least city OR nurseName
.and('lat', 'lng') // If lat provided, lng must be provided too
.custom((value, helpers) => {
  // Validate that end time is after start time
  if (value.start && value.end) {
    const startDate = new Date(value.start);
    const endDate = new Date(value.end);
    if (endDate <= startDate) {
      return helpers.error('any.invalid', { message: 'End time must be after start time' });
    }
    // Validate reasonable time range (max 30 days)
    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      return helpers.error('any.invalid', { message: 'Time range cannot exceed 30 days' });
    }
  }
  return value;
});

// Initialize Express app
const app = express();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allowed origins patterns
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^https?:\/\/.*\.ngrok\.io$/,
      /^https?:\/\/.*\.ngrok-free\.app$/,
      /^https?:\/\/.*\.onrender\.com$/,
      /^https?:\/\/.*\.railway\.app$/
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    // In production, also check explicit allowed origins from env
    if (process.env.ALLOWED_ORIGINS) {
      const explicitOrigins = process.env.ALLOWED_ORIGINS.split(',');
      if (explicitOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging
app.use((req, res, next) => {
  const timer = startTimer();
  const originalSend = res.send;
  
  res.send = function(data) {
    res.send = originalSend;
    const latency = timer.end();
    
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      latency_ms: latency,
      query: maskObject(req.query),
      body: req.body ? maskObject(req.body) : undefined
    }, 'Request completed');
    
    return res.send(data);
  };
  
  next();
});

// Routes
app.get('/health', async (req, res) => {
  const engineStatuses = [];
  
  for (const [name, engine] of engines) {
    try {
      const status = await withTimeout(engine.health(), 1000);
      engineStatuses.push({ name, ...status });
    } catch (error) {
      engineStatuses.push({ name, ok: false, error: error.message });
    }
  }
  
  res.json({
    ok: true,
    engines: engines.size,
    nursesLoaded: nursesData.length,
    engineStatuses
  });
});

app.get('/engines', async (req, res) => {
  const engineList = [];
  
  for (const [name, engine] of engines) {
    try {
      const health = await withTimeout(engine.health(), 3000);
      engineList.push({
        name,
        healthy: health.ok || false,
        message: health.message,
        configured: health.configured
      });
    } catch (error) {
      engineList.push({
        name,
        healthy: false,
        message: error.message
      });
    }
  }
  
  res.json({ engines: engineList });
});

app.post('/match', async (req, res) => {
  try {
    const startTime = Date.now();

    // Validate request
    const { error, value: query } = matchSchema.validate({
      ...req.body,
      ...req.query
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details
      });
    }

    // Merge expertise and expertiseQuery
    if (query.expertise && query.expertise.length > 0) {
      query.expertiseQuery = [...(query.expertiseQuery || []), ...query.expertise];
    }

    // Fetch fresh data from database if USE_DB mode enabled
    let currentNursesData = nursesData;
    if (USE_DB) {
      try {
        logger.info('[USE_DB] Fetching fresh nurse data from database');
        const rawData = await fetchNursesFromDB();
        currentNursesData = rawData
          .filter(nurse => nurse.is_active && nurse.is_approved)
          .map(transformNurseData);
        logger.info({ count: currentNursesData.length }, '[USE_DB] Fresh data loaded');
      } catch (error) {
        logger.error({ error: error.message }, '[USE_DB] Database fetch failed, falling back to cached data');
        // Fall back to cached data on error
        currentNursesData = nursesData;
      }
    }

    const totalNurses = currentNursesData.length;
    const parseTime = Date.now();

    // Determine engine
    const engineName = req.query.engine || query.engine || engines.keys().next().value;

    if (!engineName) {
      return res.status(503).json({
        error: 'No engines available'
      });
    }

    const engine = engines.get(engineName);

    if (!engine) {
      return res.status(400).json({
        error: `Unknown engine: ${engineName}`,
        available: Array.from(engines.keys())
      });
    }

    // Call engine
    const timer = startTimer();

    try {
      console.log(`[Gateway] Calling ${engineName} with ${currentNursesData.length} nurses (USE_DB: ${USE_DB})`);
      const result = await engine.match(query, currentNursesData, {
        timeout: 95000 // 95 second timeout
      });

      const matchTime = Date.now();
      const latency = timer.end();

      console.log(`[Gateway] ${engineName} returned:`, {
        type: typeof result,
        isArray: Array.isArray(result),
        hasResults: !!result.results,
        hasCount: !!result.count,
        resultType: result.results ? typeof result.results : 'none',
        resultLength: result.results ? result.results.length : 0,
        directLength: Array.isArray(result) ? result.length : 'not array'
      });

      // Extract results array - handle both array and object responses
      const resultsArray = result.results || (Array.isArray(result) ? result : []);

      res.json({
        engine: engineName,
        latency_ms: latency,
        count: result.count || resultsArray.length || 0,
        results: resultsArray,
        statistics: {
          totalNurses,
          filteredByLocation: result._locationCount || 0,
          filteredByService: result._serviceCount || 0,
          availableNurses: result._availableCount || 0,
          rankedResults: resultsArray.length,
          timings: {
            parsing: parseTime - startTime,
            matching: matchTime - parseTime,
            total: matchTime - startTime
          }
        },
        raw: process.env.DEBUG ? result : undefined
      });

    } catch (engineError) {
      logger.error({
        engine: engineName,
        error: engineError.message,
        stack: process.env.DEBUG ? engineError.stack : undefined
      }, 'Engine error');

      return res.status(502).json({
        error: 'Engine error',
        engine: engineName,
        message: maskSensitive(engineError.message)
      });
    }

  } catch (error) {
    logger.error({ error: error.message }, 'Request handler error');

    res.status(500).json({
      error: 'Internal server error',
      message: process.env.DEBUG ? error.message : 'An error occurred'
    });
  }
});

// Start server
async function start() {
  try {
    await loadEngines();

    // Test database connection if USE_DB enabled
    if (USE_DB) {
      logger.info('[USE_DB] Database mode enabled - testing connection');
      const dbConnected = await testDBConnection();
      if (dbConnected) {
        logger.info('[USE_DB] ✓ Database connection successful - fresh queries enabled');
      } else {
        logger.warn('[USE_DB] ⚠️  Database connection failed - will fall back to cached data');
      }
    } else {
      logger.info('[USE_DB] File-based caching mode (set USE_DB=true for fresh queries)');
    }

    await loadNursesData();

    app.listen(PORT, '0.0.0.0', () => {
      const host = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
      logger.info({ port: PORT }, `Gateway server running at ${host}`);
      logger.info(`CEO Playground available at ${host}/ceo-playground.html`);
      if (USE_DB) {
        logger.info('💾 DATABASE MODE: Queries fetch fresh data on each request');
      } else {
        logger.info('📁 CACHE MODE: Data loaded once at startup');
      }
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

start();