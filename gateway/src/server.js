import express from 'express';
import cors from 'cors';
import pino from 'pino';
import Joi from 'joi';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { maskObject, maskSensitive } from './util/mask.js';
import { startTimer, withTimeout } from './util/timing.js';

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

async function loadEngines() {
  const rootDir = path.join(__dirname, '..', '..');
  const dirs = await fs.readdir(rootDir);
  
  for (const dir of dirs) {
    if (!dir.startsWith('engine-')) continue;
    
    try {
      const adapterPath = path.join(rootDir, dir, 'adapter.js');
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
    const dataPath = path.join(__dirname, 'data', 'nurses.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    nursesData = JSON.parse(data);
    logger.info({ count: nursesData.length }, 'Nurses data loaded');
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to load nurses data');
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
  }
}

// Request validation schema
const matchSchema = Joi.object({
  city: Joi.string().required(),
  servicesQuery: Joi.array().items(Joi.string()).default([]),
  expertise: Joi.array().items(Joi.string()).default([]),
  expertiseQuery: Joi.array().items(Joi.string()).default([]),
  urgent: Joi.boolean().default(false),
  topK: Joi.number().min(1).max(10).default(5),
  engine: Joi.string().optional(),
  start: Joi.string().isoDate().optional(),
  end: Joi.string().isoDate().optional(),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
  radiusKm: Joi.number().optional(),
  weights: Joi.object().optional()
});

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:*', 'http://127.0.0.1:*'],
  credentials: true
}));
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
      const result = await engine.match(query, nursesData, {
        timeout: 95000 // 95 second timeout
      });
      
      const latency = timer.end();
      
      res.json({
        engine: engineName,
        latency_ms: latency,
        count: result.count || result.results?.length || 0,
        results: result.results || [],
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
    await loadNursesData();
    
    app.listen(PORT, () => {
      logger.info({ port: PORT }, `Gateway server running at http://localhost:${PORT}`);
      logger.info(`CEO Playground available at http://localhost:${PORT}/ceo-playground.html`);
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

start();