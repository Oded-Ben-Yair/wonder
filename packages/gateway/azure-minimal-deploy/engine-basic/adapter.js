import { basicMatch } from './src/lib/basic.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from this engine's .env
dotenv.config({ path: join(__dirname, '.env') });

export async function match(query, allNurses, options = {}) {
  try {
    console.log(`[engine-basic] Starting match with query:`, query);
    console.log(`[engine-basic] Received ${allNurses?.length || 0} nurses`);
    console.log(`[engine-basic] Sample nurse:`, allNurses?.[0]);
    
    // Map query to the format expected by filterNurses
    const mappedQuery = {
      city: query.city,
      service: query.servicesQuery?.[0] || query.service,
      start: query.start,
      end: query.end,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm || 25,
      topK: query.topK || 5
    };
    
    console.log(`[engine-basic] Mapped query:`, mappedQuery);
    
    const results = basicMatch(mappedQuery, allNurses);
    
    console.log(`[engine-basic] basicMatch returned ${results.length} results`);
    
    // Transform to standard format
    const transformedResults = results.map(r => ({
      id: r.id,
      score: r.score || (1.0 - (r.meta?.distanceKm || 0) / 100), // Convert distance to score  
      reason: r.reason || `Matched by location and services`,
      name: r.name
    }));
    
    console.log(`[engine-basic] Returning ${transformedResults.length} transformed results`);
    
    return {
      count: transformedResults.length,
      results: transformedResults
    };
  } catch (error) {
    console.error('[engine-basic] Match error:', error.message);
    throw error;
  }
}

export async function health() {
  return { 
    ok: true, 
    engine: "engine-basic",
    message: "Ready"
  };
}

export const ENGINE_NAME = "engine-basic";