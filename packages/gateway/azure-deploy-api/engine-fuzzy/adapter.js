import { weightedMatch } from './src/lib/weighted.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from this engine's .env
dotenv.config({ path: join(__dirname, '.env') });

export async function match(query, allNurses, options = {}) {
  try {
    // Map query to the format expected by weightedMatch
    const mappedQuery = {
      servicesQuery: query.servicesQuery || (query.service ? [query.service] : []),
      expertiseQuery: query.expertiseQuery || query.expertise || [],
      city: query.city,
      lat: query.lat,
      lng: query.lng,
      maxDistanceKm: query.maxDistanceKm || query.radiusKm || 30,
      start: query.start,
      end: query.end,
      urgent: query.urgent || false,
      topK: query.topK || 5,
      weights: query.weights || options.weights
    };
    
    const results = weightedMatch(allNurses, mappedQuery);
    
    // Transform to standard format
    return {
      count: results.length,
      results: results.map(r => ({
        id: r.id,
        score: r.score,
        reason: r.reason,
        name: r.name
      }))
    };
  } catch (error) {
    console.error('[engine-fuzzy] Match error:', error.message);
    throw error;
  }
}

export async function health() {
  return { 
    ok: true, 
    engine: "engine-fuzzy",
    message: "Ready"
  };
}

export const ENGINE_NAME = "engine-fuzzy";