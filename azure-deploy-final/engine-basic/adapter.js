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
    
    const matchResult = basicMatch(mappedQuery, allNurses);

    // basicMatch now returns {results, _locationCount, _serviceCount, _availableCount}
    const results = matchResult.results || matchResult;
    const isArray = Array.isArray(results);

    console.log(`[engine-basic] basicMatch returned ${isArray ? results.length : 'object with results'}`);

    // Pass through all result data including scoreBreakdown
    const transformedResults = (isArray ? results : [results]).map(r => ({
      id: r.id,
      name: r.name,
      firstName: r.firstName,
      lastName: r.lastName,
      displayName: r.displayName,
      isHebrew: r.isHebrew,
      city: r.city,
      municipality: r.municipality,
      specialization: r.specialization,
      rating: r.meta?.rating,
      reviewsCount: r.meta?.reviewsCount,
      // New scoring fields
      matchScore: r.matchScore,
      scoreBreakdown: r.scoreBreakdown,
      calculationFormula: r.calculationFormula,
      // Legacy fields
      score: r.score || r.matchScore,
      reason: r.reason,
      meta: r.meta
    }));

    console.log(`[engine-basic] Returning ${transformedResults.length} transformed results with scoring`);

    return {
      count: transformedResults.length,
      results: transformedResults,
      // Pass through filter counts
      _locationCount: matchResult._locationCount,
      _serviceCount: matchResult._serviceCount,
      _availableCount: matchResult._availableCount
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