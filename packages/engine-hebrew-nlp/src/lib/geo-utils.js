// Geographic utility functions for location-based matching

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(coord1, coord2) {
  if (!coord1 || !coord2 || !coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
    return Infinity;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Get default coordinates for Israeli cities
 */
export function getCityCoordinates(city) {
  const cityCoords = {
    'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
    'Tel Aviv-Yafo': { lat: 32.0853, lng: 34.7818 },
    'תל אביב': { lat: 32.0853, lng: 34.7818 },
    'Jerusalem': { lat: 31.7683, lng: 35.2137 },
    'ירושלים': { lat: 31.7683, lng: 35.2137 },
    'Haifa': { lat: 32.7940, lng: 34.9896 },
    'חיפה': { lat: 32.7940, lng: 34.9896 },
    'Nethanya': { lat: 32.3215, lng: 34.8532 },
    'נתניה': { lat: 32.3215, lng: 34.8532 },
    'Herzliya': { lat: 32.1624, lng: 34.8447 },
    'הרצליה': { lat: 32.1624, lng: 34.8447 },
    'Petach Tikva': { lat: 32.0871, lng: 34.8869 },
    'פתח תקווה': { lat: 32.0871, lng: 34.8869 },
    'Rishon LeTsiyon': { lat: 31.9730, lng: 34.7925 },
    'ראשון לציון': { lat: 31.9730, lng: 34.7925 },
    'Ramat-Gan': { lat: 32.0700, lng: 34.8235 },
    'רמת גן': { lat: 32.0700, lng: 34.8235 },
    'Bat-Yam': { lat: 32.0231, lng: 34.7503 },
    'בת ים': { lat: 32.0231, lng: 34.7503 },
    'Hadera': { lat: 32.4340, lng: 34.9196 },
    'חדרה': { lat: 32.4340, lng: 34.9196 },
    'Ashdod': { lat: 31.8044, lng: 34.6553 },
    'אשדוד': { lat: 31.8044, lng: 34.6553 },
    'Ashkelon': { lat: 31.6688, lng: 34.5743 },
    'אשקלון': { lat: 31.6688, lng: 34.5743 },
    'Beer Sheva': { lat: 31.2530, lng: 34.7915 },
    'באר שבע': { lat: 31.2530, lng: 34.7915 },
    'Rehovoth': { lat: 31.8928, lng: 34.8113 },
    'רחובות': { lat: 31.8928, lng: 34.8113 },
    'Kfar Sava': { lat: 32.1858, lng: 34.9077 },
    'כפר סבא': { lat: 32.1858, lng: 34.9077 },
    'Givatayim': { lat: 32.0719, lng: 34.8097 },
    'גבעתיים': { lat: 32.0719, lng: 34.8097 },
    'Holon': { lat: 32.0167, lng: 34.7667 },
    'חולון': { lat: 32.0167, lng: 34.7667 }
  };

  return cityCoords[city] || null;
}

/**
 * Check if location is within radius
 */
export function isWithinRadius(center, point, radiusKm) {
  const distance = calculateDistance(center, point);
  return distance <= radiusKm;
}

/**
 * Sort locations by distance from a point
 */
export function sortByDistance(locations, centerPoint) {
  return locations.sort((a, b) => {
    const distA = calculateDistance(centerPoint, { lat: a.lat, lng: a.lng });
    const distB = calculateDistance(centerPoint, { lat: b.lat, lng: b.lng });
    return distA - distB;
  });
}

/**
 * Get proximity score based on distance (0-1)
 */
export function getProximityScore(distance) {
  if (distance <= 1) return 1.0;    // Within 1km
  if (distance <= 5) return 0.9;    // Within 5km
  if (distance <= 10) return 0.7;   // Within 10km
  if (distance <= 25) return 0.5;   // Within 25km
  if (distance <= 50) return 0.3;   // Within 50km
  if (distance <= 100) return 0.1;  // Within 100km
  return 0.0;                       // Further than 100km
}