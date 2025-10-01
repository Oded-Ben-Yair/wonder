import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USE_DB = (process.env.USE_DB || 'false').toLowerCase() === 'true';
const DB_KIND = (process.env.DB_KIND || 'postgres').toLowerCase();

// Lazy holders
let pgClient = null;
let mongoClient = null;

export async function initDb() {
  if (!USE_DB) return { ok: false, reason: 'USE_DB=false' };

  if (DB_KIND === 'postgres') {
    const { Client } = await import('pg');
    pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();
    return { ok: true, kind: 'postgres' };
  } else if (DB_KIND === 'mongo') {
    const { MongoClient } = await import('mongodb');
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    return { ok: true, kind: 'mongo' };
  } else {
    throw new Error(`Unsupported DB_KIND: ${DB_KIND}`);
  }
}

export async function dbHealth() {
  if (!USE_DB) return { ok: false, reason: 'USE_DB=false' };
  try {
    if (DB_KIND === 'postgres') {
      const r = await pgClient.query('select 1 as ok');
      return { ok: true, probe: r.rows[0] };
    } else {
      const admin = mongoClient.db(process.env.MONGODB_DB || 'wondercare').admin();
      const info = await admin.ping();
      return { ok: true, probe: info };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
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

// Helper to normalize service names from CSV treatment types
function normalizeService(treatmentType) {
  const serviceMap = {
    'WOUND_TREATMENT': 'Wound Care',
    'DIABETIC_WOUND_TREATMENT': 'Wound Care',
    'DIFFICULT_WOUND_HEALING_TREATMENT': 'Wound Care',
    'BURN_TREATMENT': 'Wound Care',
    'MEDICATION': 'Medication',
    'MEDICATION_ARRANGEMENT': 'Medication',
    'PEDIATRICS': 'Pediatrics',
    'BREASTFEEDING_CONSULTATION': 'Pediatrics',
    'HOME_NEWBORN_VISIT': 'Pediatrics',
    'DAY_NIGHT_CIRCUMCISION_NURSE': 'Day Night',
    'HOSPITAL': 'Hospital',
    'FOLLOW_UP_AFTER_SURGERY': 'Hospital',
    'CENTRAL_CATHETER_TREATMENT': 'Hospital',
    'CATHETER_INSERTION_REPLACEMENT': 'Hospital',
    'DEFAULT': 'General',
    'BLOOD_TESTS': 'General',
    'ENEMA_UNDER_INSTRUCTION': 'General',
    'ESCORTED_BY_NURSE': 'Home Care',
    'FERTILITY_TREATMENTS': 'Home Care',
    'GASTROSTOMY_CARE_FEEDING': 'Home Care',
    'HANDLING_AND_TRACKING_METRICS': 'Home Care',
    'HEALTHY_LIFESTYLE_GUIDANCE': 'Home Care'
  };
  return serviceMap[treatmentType] || 'General';
}

// Load city centroids
let cityCentroids = {};
try {
  const centroidsPath = path.join(__dirname, '..', 'sample_data', 'city_centroids_il.json');
  if (fs.existsSync(centroidsPath)) {
    cityCentroids = JSON.parse(fs.readFileSync(centroidsPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Could not load city centroids:', e.message);
}

// Unified fetch: return array of nurses with same shape as sample_data/nurses.json
export async function loadNurses() {
  if (!USE_DB) {
    // Check for CSV first
    const csvPath = path.join(__dirname, '..', 'sample_data', 'nurses.csv');
    if (fs.existsSync(csvPath)) {
      let csvContent = fs.readFileSync(csvPath, 'utf-8');
      // Remove BOM if present
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        bom: true
      });
      
      // Group by nurse_id and aggregate data
      const nurseMap = {};
      for (const row of records) {
        const id = row.nurse_id;
        // Keep all rows unless explicitly cancelled/null ID
        if (!id) continue;
        if (row.status && row.status.toUpperCase() === 'CANCELLED') continue;
        
        const city = row.municipality;
        const service = normalizeService(row.name); // 'name' column contains treatment type
        
        if (!nurseMap[id]) {
          // Look up coordinates from centroids
          const coords = cityCentroids[city] || { lat: 31.4118, lng: 35.0818 };
          if (!cityCentroids[city] && city) {
            console.log(`No coordinates for city: ${city}, using default`);
          }
          
          // Try to parse availability from CSV columns if present
          let availability = {
            mon: [{ start: "08:00", end: "17:00" }],
            tue: [{ start: "08:00", end: "17:00" }],
            wed: [{ start: "08:00", end: "17:00" }],
            thu: [{ start: "08:00", end: "17:00" }],
            fri: [{ start: "08:00", end: "14:00" }]
          };
          
          // If from/to datetime columns exist, use them
          if (row.from_datetime_utc || row.to_datetime_utc) {
            availability = {
              from: row.from_datetime_utc || null,
              to: row.to_datetime_utc || null
            };
          }
          
          nurseMap[id] = {
            id,
            name: `Nurse ${id.substring(0, 8)}`, // Use partial ID as name
            gender: row.gender,
            city: city || 'Unknown',
            lat: coords.lat,
            lng: coords.lng,
            services: new Set(),
            rating: deterministicRating(id),
            reviewsCount: deterministicReviews(id),
            availability
          };
        }
        
        nurseMap[id].services.add(service);
      }
      
      // Convert to array and services Set to array
      return Object.values(nurseMap).map(nurse => ({
        ...nurse,
        services: Array.from(nurse.services)
      }));
    }
    
    // Fallback to JSON
    const json = fs.readFileSync(path.join(__dirname, '..', 'sample_data', 'nurses.json'), 'utf-8');
    return JSON.parse(json);
  }
  if (DB_KIND === 'postgres') {
    // Expect tables nurses, nurse_services, nurse_expertise, nurse_availability (see docs/DB_SETUP.md)
    const { rows } = await pgClient.query(`
      select n.id, n.name, n.city, n.lat, n.lng, n.rating, n.reviews_count,
             s.services, e.expertise, a.availability
      from nurses n
      left join (
        select nurse_id, array_agg(service order by service) as services
        from nurse_services group by nurse_id
      ) s on s.nurse_id = n.id
      left join (
        select nurse_id, array_agg(tag order by tag) as expertise
        from nurse_expertise group by nurse_id
      ) e on e.nurse_id = n.id
      left join (
        select nurse_id, json_agg(json_build_object('day', day, 'slots', slots) order by day) as availability
        from nurse_availability group by nurse_id
      ) a on a.nurse_id = n.id
    `);
    return rows.map(r => ({
      id: r.id, name: r.name, city: r.city, lat: Number(r.lat), lng: Number(r.lng),
      rating: Number(r.rating), reviewsCount: Number(r.reviews_count),
      services: r.services || [], expertise: r.expertise || [], availability: r.availability || []
    }));
  } else {
    const db = mongoClient.db(process.env.MONGODB_DB || 'wondercare');
    const docs = await db.collection(process.env.MONGODB_COLLECTION || 'nurses').find({}).toArray();
    return docs.map(d => ({
      id: d.id, name: d.name, city: d.city, lat: d.lat, lng: d.lng,
      rating: d.rating, reviewsCount: d.reviewsCount,
      services: d.services || [], expertise: d.expertise || [], availability: d.availability || []
    }));
  }
}