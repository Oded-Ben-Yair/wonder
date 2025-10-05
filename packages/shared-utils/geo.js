const R = 6371; // Earth's radius in kilometers
const toRad = d => d * Math.PI / 180;

// Cache for trigonometric calculations
const trigCache = new Map();

/**
 * Optimized Haversine distance calculation with caching
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number|null} Distance in kilometers or null if invalid coordinates
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => v == null)) return null;

  // Quick check for same location
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  // Cache trigonometric calculations for repeated coordinates
  const getCosRad = (lat) => {
    const key = `cos_${lat}`;
    if (!trigCache.has(key)) {
      trigCache.set(key, Math.cos(toRad(lat)));
      // Limit cache size to prevent memory issues
      if (trigCache.size > 1000) {
        const firstKey = trigCache.keys().next().value;
        trigCache.delete(firstKey);
      }
    }
    return trigCache.get(key);
  };

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);

  const a = sinHalfDLat * sinHalfDLat +
            getCosRad(lat1) * getCosRad(lat2) * sinHalfDLon * sinHalfDLon;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Batch distance calculation for multiple destinations from a single origin
 * Optimized for calculating distances from one point to many
 * @param {number} originLat - Origin latitude
 * @param {number} originLon - Origin longitude
 * @param {Array<{lat: number, lng: number}>} destinations - Array of destination coordinates
 * @returns {Array<number|null>} Array of distances in kilometers
 */
export function batchDistanceKm(originLat, originLon, destinations) {
  if (originLat == null || originLon == null) {
    return destinations.map(() => null);
  }

  // Pre-compute origin trigonometry once
  const originLatRad = toRad(originLat);
  const cosOriginLat = Math.cos(originLatRad);

  return destinations.map(dest => {
    if (dest.lat == null || dest.lng == null) return null;
    if (originLat === dest.lat && originLon === dest.lng) return 0;

    const dLat = toRad(dest.lat - originLat);
    const dLon = toRad(dest.lng - originLon);

    const sinHalfDLat = Math.sin(dLat / 2);
    const sinHalfDLon = Math.sin(dLon / 2);

    const a = sinHalfDLat * sinHalfDLat +
              cosOriginLat * Math.cos(toRad(dest.lat)) * sinHalfDLon * sinHalfDLon;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  });
}