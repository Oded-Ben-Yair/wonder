// Advanced Hebrew NLP Matcher with Transparent Scoring
import { processHebrewText, extractEntities } from './hebrew-processor.js';
import { calculateDistance } from './geo-utils.js';

// Scoring weights (sum to 1.0 for transparency)
const SCORING_WEIGHTS = {
  serviceMatch: 0.30,     // 30% - Service/specialization match
  locationScore: 0.25,    // 25% - Location proximity
  ratingScore: 0.20,      // 20% - Nurse rating
  availabilityScore: 0.15, // 15% - Availability match
  experienceScore: 0.10   // 10% - Experience/seniority
};

// Service keyword mapping (Hebrew and English)
const SERVICE_KEYWORDS = {
  // Wound care
  'פצע': ['WOUND_CARE', 'WOUND_TREATMENT'],
  'פצעים': ['WOUND_CARE', 'WOUND_TREATMENT'],
  'wound': ['WOUND_CARE', 'WOUND_TREATMENT'],
  'כוויה': ['BURN_TREATMENT'],
  'burn': ['BURN_TREATMENT'],
  'סוכרת': ['DIABETIC_WOUND_TREATMENT'],
  'diabetic': ['DIABETIC_WOUND_TREATMENT'],

  // Medication
  'תרופות': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],
  'medication': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],
  'medicine': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],

  // Catheter/Stoma
  'צנתר': ['CENTRAL_CATHETER_TREATMENT', 'CATHETER_INSERTION_REPLACEMENT'],
  'catheter': ['CENTRAL_CATHETER_TREATMENT', 'CATHETER_INSERTION_REPLACEMENT'],
  'סטומה': ['STOMA_TREATMENT'],
  'stoma': ['STOMA_TREATMENT'],

  // Newborn/Pediatric
  'תינוק': ['HOME_NEWBORN_VISIT', 'BREASTFEEDING_CONSULTATION'],
  'baby': ['HOME_NEWBORN_VISIT', 'BREASTFEEDING_CONSULTATION'],
  'הנקה': ['BREASTFEEDING_CONSULTATION'],
  'breastfeeding': ['BREASTFEEDING_CONSULTATION'],
  'ברית': ['DAY_NIGHT_CIRCUMCISION_NURSE'],
  'circumcision': ['DAY_NIGHT_CIRCUMCISION_NURSE'],

  // Tests
  'דם': ['BLOOD_TESTS'],
  'blood': ['BLOOD_TESTS'],
  'בדיקה': ['BLOOD_TESTS', 'HANDLING_AND_TRACKING_METRICS'],
  'test': ['BLOOD_TESTS', 'HANDLING_AND_TRACKING_METRICS'],

  // Post-surgery
  'ניתוח': ['FOLLOW_UP_AFTER_SURGERY'],
  'surgery': ['FOLLOW_UP_AFTER_SURGERY'],
  'אחרי ניתוח': ['FOLLOW_UP_AFTER_SURGERY'],
  'post surgery': ['FOLLOW_UP_AFTER_SURGERY'],

  // Security/Escort
  'ליווי': ['ESCORTED_BY_NURSE', 'PRIVATE_SECURITY_HOSPITAL', 'PRIVATE_SECURITY_HOME'],
  'escort': ['ESCORTED_BY_NURSE', 'PRIVATE_SECURITY_HOSPITAL'],
  'שמירה': ['PRIVATE_SECURITY_HOSPITAL', 'PRIVATE_SECURITY_HOME'],
  'security': ['PRIVATE_SECURITY_HOSPITAL', 'PRIVATE_SECURITY_HOME']
};

// City normalization (Hebrew to English)
const CITY_MAPPING = {
  'תל אביב': 'Tel Aviv',
  'ירושלים': 'Jerusalem',
  'חיפה': 'Haifa',
  'נתניה': 'Nethanya',
  'פתח תקווה': 'Petach Tikva',
  'ראשון לציון': 'Rishon LeTsiyon',
  'רמת גן': 'Ramat-Gan',
  'בת ים': 'Bat-Yam',
  'חדרה': 'Hadera',
  'אשדוד': 'Ashdod',
  'אשקלון': 'Ashkelon',
  'באר שבע': 'Beer Sheva',
  'רחובות': 'Rehovoth'
};

/**
 * Calculate service match score (0-1)
 */
function calculateServiceMatch(queryServices, nurseServices) {
  if (!queryServices || queryServices.length === 0) return 0.5; // Neutral if no service specified
  if (!nurseServices || nurseServices.length === 0) return 0;

  const matches = queryServices.filter(qs =>
    nurseServices.some(ns => ns === qs || ns.includes(qs) || qs.includes(ns))
  );

  return matches.length / queryServices.length;
}

/**
 * Calculate location score (0-1)
 */
function calculateLocationScore(queryCity, nurseCities, queryCoords, nurseCoords) {
  if (!queryCity && !queryCoords) return 0.5; // Neutral if no location specified

  // Direct city match
  if (queryCity && nurseCities) {
    const normalizedQueryCity = CITY_MAPPING[queryCity] || queryCity;
    const cityMatch = nurseCities.some(city =>
      city.toLowerCase().includes(normalizedQueryCity.toLowerCase()) ||
      normalizedQueryCity.toLowerCase().includes(city.toLowerCase())
    );
    if (cityMatch) return 1.0;
  }

  // Coordinate-based proximity
  if (queryCoords && nurseCoords) {
    const distance = calculateDistance(queryCoords, nurseCoords);
    if (distance < 5) return 1.0;      // Within 5km
    if (distance < 10) return 0.8;     // Within 10km
    if (distance < 25) return 0.6;     // Within 25km
    if (distance < 50) return 0.4;     // Within 50km
    return 0.2;                        // Further than 50km
  }

  return 0.3; // Low score if no match
}

/**
 * Calculate rating score (0-1)
 */
function calculateRatingScore(rating, reviewsCount) {
  if (!rating) return 0.5;

  const normalizedRating = (rating - 3.0) / 2.0; // Normalize 3-5 rating to 0-1
  const reviewWeight = Math.min(reviewsCount / 100, 1.0); // More reviews = more confidence

  return normalizedRating * 0.7 + reviewWeight * 0.3;
}

/**
 * Calculate availability score (0-1)
 */
function calculateAvailabilityScore(queryTime, nurseAvailability, isUrgent) {
  if (isUrgent) return 1.0; // Urgent requests get full availability score
  if (!queryTime) return 0.5; // Neutral if no time specified

  // TODO: Implement actual availability checking
  return 0.7; // Default score
}

/**
 * Calculate experience score (0-1)
 */
function calculateExperienceScore(nurseData) {
  // Calculate based on specializations count and review count
  const specializationScore = Math.min(nurseData.services?.length / 10, 1.0) || 0.5;
  const reviewScore = Math.min(nurseData.reviewsCount / 200, 1.0) || 0.5;

  return (specializationScore + reviewScore) / 2;
}

/**
 * Extract services from query text
 */
function extractServices(queryText) {
  const services = new Set();
  const lowerQuery = queryText.toLowerCase();

  for (const [keyword, serviceList] of Object.entries(SERVICE_KEYWORDS)) {
    if (lowerQuery.includes(keyword)) {
      serviceList.forEach(service => services.add(service));
    }
  }

  return Array.from(services);
}

/**
 * Extract city from query text
 */
function extractCity(queryText) {
  const lowerQuery = queryText.toLowerCase();

  // Check Hebrew cities
  for (const [hebrew, english] of Object.entries(CITY_MAPPING)) {
    if (queryText.includes(hebrew)) {
      return english;
    }
  }

  // Check English cities
  const englishCities = ['tel aviv', 'jerusalem', 'haifa', 'netanya', 'herzliya',
    'petach tikva', 'rishon lezion', 'ramat gan', 'bat yam', 'hadera'];

  for (const city of englishCities) {
    if (lowerQuery.includes(city.toLowerCase())) {
      return city.charAt(0).toUpperCase() + city.slice(1);
    }
  }

  return null;
}

/**
 * Main Hebrew NLP matching function with transparent scoring
 */
export async function hebrewNlpMatch(query, allNurses) {
  // Process query to extract entities
  const queryText = query.nurseName || query.query || '';
  const isUrgent = query.urgent || queryText.includes('דחוף') || queryText.includes('urgent');

  // Extract services and city from natural language
  const extractedServices = query.servicesQuery || extractServices(queryText);
  const extractedCity = query.city || extractCity(queryText);

  console.log('Hebrew NLP Processing:', {
    queryText,
    extractedServices,
    extractedCity,
    isUrgent,
    nursesCount: allNurses.length
  });

  // Score all nurses
  const scoredNurses = allNurses.map(nurse => {
    // Calculate individual scores
    const serviceScore = calculateServiceMatch(extractedServices, nurse.services);
    const locationScore = calculateLocationScore(
      extractedCity,
      Array.isArray(nurse.city) ? nurse.city : [nurse.city],
      query.coordinates ? { lat: query.lat, lng: query.lng } : null,
      nurse.lat && nurse.lng ? { lat: nurse.lat, lng: nurse.lng } : null
    );
    const ratingScore = calculateRatingScore(nurse.rating, nurse.reviewsCount);
    const availabilityScore = calculateAvailabilityScore(query.start, nurse.availability, isUrgent);
    const experienceScore = calculateExperienceScore(nurse);

    // Calculate weighted total score
    const totalScore =
      SCORING_WEIGHTS.serviceMatch * serviceScore +
      SCORING_WEIGHTS.locationScore * locationScore +
      SCORING_WEIGHTS.ratingScore * ratingScore +
      SCORING_WEIGHTS.availabilityScore * availabilityScore +
      SCORING_WEIGHTS.experienceScore * experienceScore;

    // Create detailed scoring breakdown
    const scoreBreakdown = {
      serviceMatch: {
        weight: SCORING_WEIGHTS.serviceMatch,
        score: serviceScore,
        weighted: SCORING_WEIGHTS.serviceMatch * serviceScore,
        explanation: serviceScore > 0.8 ? 'מתאימה במיוחד לשירות המבוקש' :
                    serviceScore > 0.5 ? 'התאמה טובה לשירות' : 'התאמה חלקית'
      },
      location: {
        weight: SCORING_WEIGHTS.locationScore,
        score: locationScore,
        weighted: SCORING_WEIGHTS.locationScore * locationScore,
        explanation: locationScore > 0.8 ? 'מיקום קרוב מאוד' :
                    locationScore > 0.5 ? 'מיקום סביר' : 'מרחק גדול יחסית'
      },
      rating: {
        weight: SCORING_WEIGHTS.ratingScore,
        score: ratingScore,
        weighted: SCORING_WEIGHTS.ratingScore * ratingScore,
        explanation: `דירוג ${nurse.rating || 'לא זמין'} כוכבים (${nurse.reviewsCount || 0} ביקורות)`
      },
      availability: {
        weight: SCORING_WEIGHTS.availabilityScore,
        score: availabilityScore,
        weighted: SCORING_WEIGHTS.availabilityScore * availabilityScore,
        explanation: isUrgent ? 'זמינות מיידית לבקשה דחופה' : 'זמינות מתאימה'
      },
      experience: {
        weight: SCORING_WEIGHTS.experienceScore,
        score: experienceScore,
        weighted: SCORING_WEIGHTS.experienceScore * experienceScore,
        explanation: experienceScore > 0.7 ? 'ניסיון רב' : 'ניסיון סביר'
      }
    };

    // Generate match reason
    const matchReasons = [];
    if (serviceScore > 0.8) matchReasons.push('התאמה מצוינת לשירות המבוקש');
    if (locationScore > 0.8) matchReasons.push('קרובה למיקום המבוקש');
    if (ratingScore > 0.8) matchReasons.push('דירוג גבוה במיוחד');
    if (isUrgent) matchReasons.push('זמינה לבקשה דחופה');

    return {
      id: nurse.id,
      name: nurse.name,
      score: totalScore,
      scoreBreakdown,
      matchReason: matchReasons.join(', ') || 'התאמה כללית טובה',
      // Include original nurse data for display
      city: nurse.city,
      services: nurse.services,
      rating: nurse.rating,
      reviewsCount: nurse.reviewsCount
    };
  });

  // Sort by score and return top matches
  const topK = query.topK || 5;
  const topMatches = scoredNurses
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Add rank and format for response
  return topMatches.map((match, index) => ({
    ...match,
    rank: index + 1,
    scorePercentage: Math.round(match.score * 100) + '%',
    calculationFormula: `Score = (0.30 × ${match.scoreBreakdown.serviceMatch.score.toFixed(2)}) + ` +
                       `(0.25 × ${match.scoreBreakdown.location.score.toFixed(2)}) + ` +
                       `(0.20 × ${match.scoreBreakdown.rating.score.toFixed(2)}) + ` +
                       `(0.15 × ${match.scoreBreakdown.availability.score.toFixed(2)}) + ` +
                       `(0.10 × ${match.scoreBreakdown.experience.score.toFixed(2)}) = ` +
                       `${match.score.toFixed(3)}`
  }));
}