import { distanceKm, availabilityOverlapRatio } from '@wonder/shared-utils';

/**
 * Calculate service match score (0-1)
 * Returns:
 * - 1.0 for exact match
 * - 0.8 for related services
 * - 0.6 for partial match
 * - 0.5 for no service query (all nurses are potentially valid)
 */
function calculateServiceMatch(nurse, serviceQuery) {
  if (!serviceQuery) return 0.5; // No service specified - neutral score

  const reqLower = String(serviceQuery).toLowerCase();
  const services = (nurse.services || []).map(s => s.toLowerCase());
  const specializations = (nurse.specialization || []).map(s => s.toLowerCase());

  // Exact match (1.0)
  const exactMatch = services.some(svc => svc === reqLower) ||
                     specializations.some(spec => spec === reqLower);
  if (exactMatch) return 1.0;

  // Related services (0.8)
  const relatedServices = {
    'wound': ['wound_care', 'wound care', 'treatment'],
    'pediatrics': ['pediatrics', 'pediatric', 'newborn', 'breastfeed'],
    'general': ['general nursing', 'default', 'general care'],
    'medication': ['medication', 'medication management'],
    'home': ['home care', 'escort', 'palliative']
  };

  for (const [key, related] of Object.entries(relatedServices)) {
    if (reqLower.includes(key)) {
      const hasRelated = services.some(svc => related.some(r => svc.includes(r))) ||
                        specializations.some(spec => related.some(r => spec.includes(r)));
      if (hasRelated) return 0.8;
    }
  }

  // Partial match (0.6)
  const partialMatch = services.some(svc => svc.includes(reqLower) || reqLower.includes(svc)) ||
                       specializations.some(spec => spec.includes(reqLower) || reqLower.includes(spec));
  if (partialMatch) return 0.6;

  return 0.0; // No match
}

/**
 * Calculate detailed score breakdown for a nurse match
 * Returns composite score and explanation for each component
 */
function calculateDetailedScore(nurse, query) {
  const { service, lat, lng, radiusKm = 25, start, end } = query || {};

  // 1. Service Match (30% weight)
  const serviceScore = calculateServiceMatch(nurse, service);
  const serviceExplanation = service
    ? (serviceScore >= 0.8
       ? `מתאים מאוד לשירות "${service}" | Perfect match for "${service}" service`
       : serviceScore >= 0.6
       ? `התאמה חלקית לשירות "${service}" | Partial match for "${service}" service`
       : `התאמה בסיסית | Basic service compatibility`)
    : 'אין דרישת שירות ספציפית | No specific service requirement';

  // 2. Location Score (25% weight)
  let locationScore = 1.0;
  let locationExplanation = 'מיקום לא צוין | Location not specified';
  if (lat != null && lng != null && nurse._dKm != null) {
    locationScore = Math.max(0, 1 - (nurse._dKm / radiusKm));
    locationExplanation = `${nurse._dKm.toFixed(1)} ק"מ מהמיקום שלך | ${nurse._dKm.toFixed(1)} km from your location`;
  }

  // 3. Rating Score (20% weight)
  // Using logarithmic scaling to avoid penalizing high-rated nurses with fewer reviews
  const rating = nurse.rating || 0;
  const reviewsCount = nurse.reviewsCount || 0;

  // Logarithmic scaling: rapidly increases for first reviews, then plateaus
  // Formula: rating * (1 - e^(-k*reviewCount)) where k controls steepness
  const k = 0.05; // Reaches ~86% confidence at 50 reviews, ~95% at 100 reviews
  const reviewConfidence = reviewsCount > 0 ? (1 - Math.exp(-k * reviewsCount)) : 0;
  const ratingScore = (rating / 5.0) * reviewConfidence;

  const ratingExplanation = reviewsCount > 0
    ? `${rating.toFixed(1)}★ מבוסס על ${reviewsCount} ביקורות (${(reviewConfidence * 100).toFixed(0)}% confidence) | ${rating.toFixed(1)}★ from ${reviewsCount} reviews (${(reviewConfidence * 100).toFixed(0)}% confidence)`
    : 'אין ביקורות עדיין | No reviews yet';

  // 4. Availability Score (15% weight)
  const availabilityScore = nurse._avail || 0;
  const availabilityExplanation = availabilityScore === 1.0
    ? 'זמין לחלוטין בזמן המבוקש | Fully available at requested time'
    : availabilityScore > 0.5
    ? `זמין חלקית (${Math.round(availabilityScore * 100)}%) | Partially available (${Math.round(availabilityScore * 100)}%)`
    : availabilityScore > 0
    ? 'זמינות מוגבלת | Limited availability'
    : 'זמינות לא צוינה | Availability not specified';

  // 5. Experience Score (10% weight)
  // Properly capped to ensure score stays within [0,1] range
  const specCount = (nurse.specialization || []).length;
  const specScore = Math.min(1, specCount / 5); // Cap at 5 specializations
  const caseScore = Math.min(1, reviewsCount / 200); // Cap at 200 reviews
  const experienceScore = (specScore * 0.5 + caseScore * 0.5);
  const experienceExplanation = `${specCount} התמחויות, ${reviewsCount} מקרים | ${specCount} specializations, ${reviewsCount} cases`;

  // Calculate composite score
  const weights = {
    serviceMatch: 0.30,
    location: 0.25,
    rating: 0.20,
    availability: 0.15,
    experience: 0.10
  };

  const weightedScores = {
    serviceMatch: serviceScore * weights.serviceMatch,
    location: locationScore * weights.location,
    rating: ratingScore * weights.rating,
    availability: availabilityScore * weights.availability,
    experience: experienceScore * weights.experience
  };

  const matchScore = Object.values(weightedScores).reduce((sum, s) => sum + s, 0);

  // Build formula string
  const formula = `(${(serviceScore * 100).toFixed(0)}% × 30%) + (${(locationScore * 100).toFixed(0)}% × 25%) + (${(ratingScore * 100).toFixed(0)}% × 20%) + (${(availabilityScore * 100).toFixed(0)}% × 15%) + (${(experienceScore * 100).toFixed(0)}% × 10%) = ${(matchScore * 100).toFixed(1)}%`;

  return {
    matchScore,
    scoreBreakdown: {
      serviceMatch: {
        weight: weights.serviceMatch,
        score: serviceScore,
        weighted: weightedScores.serviceMatch,
        explanation: serviceExplanation
      },
      location: {
        weight: weights.location,
        score: locationScore,
        weighted: weightedScores.location,
        explanation: locationExplanation
      },
      rating: {
        weight: weights.rating,
        score: ratingScore,
        weighted: weightedScores.rating,
        explanation: ratingExplanation
      },
      availability: {
        weight: weights.availability,
        score: availabilityScore,
        weighted: weightedScores.availability,
        explanation: availabilityExplanation
      },
      experience: {
        weight: weights.experience,
        score: experienceScore,
        weighted: weightedScores.experience,
        explanation: experienceExplanation
      }
    },
    calculationFormula: formula
  };
}

export function basicMatch(query, nurses) {
  const { city, service, nurseName, start, end, lat, lng, radiusKm = 25, topK = 3 } = query || {};
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;
  const day = s ? ['sun','mon','tue','wed','thu','fri','sat'][s.getUTCDay()] : null;

  // Track filtering counts at each stage
  const startingCount = (nurses || []).length;

  // Filter by nurse name first if provided
  const afterNameFilter = (nurses||[])
    .filter(n => {
      if (!nurseName) return true;
      const searchName = String(nurseName).toLowerCase();

      // Check displayName, name, firstName+lastName, and searchableNames
      if (n.displayName && n.displayName.toLowerCase().includes(searchName)) return true;
      if (n.name && n.name.toLowerCase().includes(searchName)) return true;
      if (n.firstName && n.firstName.toLowerCase().includes(searchName)) return true;
      if (n.lastName && n.lastName.toLowerCase().includes(searchName)) return true;

      // Check full name combination
      if (n.firstName && n.lastName) {
        const fullName = `${n.firstName} ${n.lastName}`.toLowerCase();
        if (fullName.includes(searchName)) return true;
      }

      // Check searchable name variations
      if (n.searchableNames && Array.isArray(n.searchableNames)) {
        return n.searchableNames.some(sn => sn.toLowerCase().includes(searchName));
      }

      return false;
    });

  // Then filter by city
  const afterCityFilter = afterNameFilter
    .filter(n => {
      if (!city) return true;
      const cityLower = String(city).toLowerCase();

      // Check the city field directly
      if (n.city && n.city.toLowerCase().includes(cityLower)) {
        return true;
      }

      // Also check municipality array for backwards compatibility
      if (n.municipality && n.municipality.length > 0) {
        return n.municipality.some(muni =>
          muni.toLowerCase().includes(cityLower) ||
          cityLower.includes(muni.toLowerCase())
        );
      }

      // Check _originalMunicipalities if available
      if (n._originalMunicipalities && n._originalMunicipalities.length > 0) {
        return n._originalMunicipalities.some(muni =>
          muni.toLowerCase().includes(cityLower) ||
          cityLower.includes(muni.toLowerCase())
        );
      }

      return false;
    });

  const locationCount = afterCityFilter.length;

  // Then filter by service
  const afterServiceFilter = afterCityFilter
    .filter(n => {
      if (!service) return true;
      const reqLower = String(service).toLowerCase();

      // Check services array (formatted friendly names like "General Nursing")
      const hasServiceMatch = (n.services || []).some(svc => {
        const svcLower = svc.toLowerCase();
        return svcLower.includes(reqLower) ||
               reqLower.includes(svcLower) ||
               // Special mappings for common service names
               (reqLower === 'general care' && svcLower === 'general nursing') ||
               (reqLower === 'wound care' && svcLower.includes('wound')) ||
               (reqLower === 'pediatrics' && svcLower === 'pediatrics') ||
               (reqLower === 'day night' && svcLower === 'day night') ||
               (reqLower === 'home care' && svcLower === 'home care') ||
               (reqLower === 'hospital' && svcLower === 'hospital') ||
               (reqLower === 'medication' && svcLower === 'medication') ||
               (reqLower === 'general' && svcLower === 'general');
      });

      // Also check specialization array (raw format like "DEFAULT", "WOUND_CARE")
      const hasSpecMatch = (n.specialization || []).some(spec => {
        const specLower = spec.toLowerCase();
        return specLower.includes(reqLower) ||
               reqLower.includes(specLower) ||
               (reqLower.includes('wound') && specLower.includes('wound')) ||
               (reqLower.includes('care') && (specLower.includes('care') || specLower.includes('treatment'))) ||
               (reqLower.includes('general') && specLower.includes('default')) ||
               (reqLower === 'pediatrics' && (specLower.includes('pediatric') || specLower.includes('newborn') || specLower.includes('breastfeed'))) ||
               (reqLower === 'day night' && specLower.includes('day_night')) ||
               (reqLower === 'home care' && (specLower.includes('home') || specLower.includes('escort') || specLower.includes('palliative')));
      });

      return hasServiceMatch || hasSpecMatch;
    });

  const serviceCount = afterServiceFilter.length;

  // Add distance and availability calculations
  const withMetadata = afterServiceFilter
    .map(n => {
      const dKm = (lat!=null && lng!=null && n.lat!=null && n.lng!=null) ? distanceKm(lat,lng,n.lat,n.lng) : null;
      const avail = (s && e) ? availabilityOverlapRatio(s,e,n.availability,day) : 1;
      return { ...n, _dKm: dKm, _avail: avail };
    });

  // Filter by availability and radius
  const filtered = withMetadata
    .filter(n => n._avail > 0)
    .filter(n => (n._dKm == null) || (n._dKm <= radiusKm));

  const availableCount = filtered.length;

  // Calculate detailed scores for each filtered nurse
  const withScores = filtered.map(n => {
    const scoreData = calculateDetailedScore(n, query);
    return { ...n, ...scoreData };
  });

  // Sort by composite matchScore (highest first)
  const sorted = withScores.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    // Tiebreakers: rating, reviews, distance
    if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
    if ((b.reviewsCount ?? 0) !== (a.reviewsCount ?? 0)) return (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0);
    return (a._dKm ?? 1e9) - (b._dKm ?? 1e9);
  });

  const results = sorted.slice(0, topK).map(n => ({
    id: n.nurseId || n.id,
    name: n.displayName || n.name || `Nurse ${n.nurseId?.substring(0,8)}`,
    firstName: n.firstName || '',
    lastName: n.lastName || '',
    displayName: n.displayName || n.name || '',
    isHebrew: n.isHebrew || false,
    city: n.municipality?.[0] || n.city || 'Unknown',
    municipality: n.municipality,
    specialization: n.specialization,
    matchScore: n.matchScore,
    scoreBreakdown: n.scoreBreakdown,
    calculationFormula: n.calculationFormula,
    reason: `Match Score: ${(n.matchScore * 100).toFixed(1)}% | ${n.calculationFormula}`,
    meta: {
      distanceKm: n._dKm,
      availabilityRatio: n._avail,
      rating: n.rating,
      reviewsCount: n.reviewsCount,
      compositeScore: n.matchScore
    }
  }));

  // Return results with intermediate filtering counts
  return {
    results,
    _locationCount: locationCount,
    _serviceCount: serviceCount,
    _availableCount: availableCount
  };
}
