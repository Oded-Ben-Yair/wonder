import { StructuredQuery, Specialization, Mobility, TreatmentType } from '@/types';

// City/Municipality mapping - matches actual CSV data
const cityMapping: Record<string, string[]> = {
  'tel aviv': ['Tel Aviv-Yafo', 'תל אביב-יפו', 'tel aviv', 'tlv', 'tel aviv yafo'],
  'jerusalem': ['Jerusalem', 'ירושלים', 'jlm'],
  'haifa': ['Hefa', 'חיפה', 'haifa', 'Haifa'],
  'netanya': ['Nethanya', 'נתניה', 'netanya'],
  'herzliya': ['Herzliya', 'הרצליה'],
  'petach tikva': ['Petach Tikva', 'פתח תקווה', 'petah tikva'],
  'rishon lezion': ['Rishon LeTsiyon', 'ראשון לציון', 'rishon letsiyon'],
  'ramat gan': ['Ramat-Gan', 'רמת גן', 'ramat gan'],
  'givatayim': ['Givatayim', 'גבעתיים'],
  'bat yam': ['Bat-Yam', 'בת ים', 'bat yam'],
  'kfar sava': ['Kefar Sava', 'כפר סבא', 'kfar saba'],
  'hadera': ['Hadera', 'חדרה'],
  'holon': ['Holon', 'חולון'],
  'ashdod': ['Ashdod', 'אשדוד'],
  'ashkelon': ['Ashkelon', 'אשקלון'],
  'beer sheva': ['Beer Sheva', 'באר שבע', 'beersheba', 'Beersheba'],
  'rehovoth': ['Rehovoth', 'רחובות', 'rehovot']
};

// Specialization keywords - maps natural language to actual CSV specializations
const specializationKeywords: Record<string, Specialization[]> = {
  // Wound care
  'wound care': ['WOUND_CARE', 'WOUND_TREATMENT'],
  'wound': ['WOUND_CARE', 'WOUND_TREATMENT'],
  'diabetic wound': ['DIABETIC_WOUND_TREATMENT'],
  'burn': ['BURN_TREATMENT'],
  'burns': ['BURN_TREATMENT'],
  'difficult wound': ['DIFFICULT_WOUND_HEALING_TREATMENT'],

  // Catheter and stoma
  'catheter': ['CENTRAL_CATHETER_TREATMENT', 'CATHETER_INSERTION_REPLACEMENT'],
  'central catheter': ['CENTRAL_CATHETER_TREATMENT'],
  'catheter insertion': ['CATHETER_INSERTION_REPLACEMENT'],
  'stoma': ['STOMA_TREATMENT'],
  'stoma care': ['STOMA_TREATMENT'],

  // Medication
  'medication': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],
  'medicine': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],
  'pills': ['MEDICATION_ARRANGEMENT'],
  'medication management': ['MEDICATION', 'MEDICATION_ARRANGEMENT'],

  // Pediatrics and newborn
  'circumcision': ['DAY_NIGHT_CIRCUMCISION_NURSE'],
  'breastfeeding': ['BREASTFEEDING_CONSULTATION'],
  'newborn': ['HOME_NEWBORN_VISIT'],
  'baby': ['HOME_NEWBORN_VISIT', 'BREASTFEEDING_CONSULTATION'],
  'pediatric': ['HOME_NEWBORN_VISIT', 'BREASTFEEDING_CONSULTATION'],
  'children': ['HOME_NEWBORN_VISIT'],
  'kids': ['HOME_NEWBORN_VISIT'],

  // Hospital and security
  'security': ['PRIVATE_SECURITY_HOSPITAL', 'PRIVATE_SECURITY_HOME'],
  'hospital security': ['PRIVATE_SECURITY_HOSPITAL'],
  'home security': ['PRIVATE_SECURITY_HOME'],
  'surgery': ['FOLLOW_UP_AFTER_SURGERY'],
  'post surgery': ['FOLLOW_UP_AFTER_SURGERY'],
  'after surgery': ['FOLLOW_UP_AFTER_SURGERY'],

  // Tests and procedures
  'blood test': ['BLOOD_TESTS'],
  'blood tests': ['BLOOD_TESTS'],
  'enema': ['ENEMA_UNDER_INSTRUCTION'],
  'drainage': ['ABDOMINAL_DRAINAGE_BY_EXTERNAL_DRAINAGE'],
  'abdominal drainage': ['ABDOMINAL_DRAINAGE_BY_EXTERNAL_DRAINAGE'],

  // Home care
  'escort': ['ESCORTED_BY_NURSE'],
  'nurse escort': ['ESCORTED_BY_NURSE'],
  'fertility': ['FERTILITY_TREATMENTS'],
  'gastrostomy': ['GASTROSTOMY_CARE_FEEDING'],
  'feeding tube': ['GASTROSTOMY_CARE_FEEDING'],
  'health monitoring': ['HANDLING_AND_TRACKING_METRICS'],
  'metrics': ['HANDLING_AND_TRACKING_METRICS'],
  'lifestyle': ['HEALTHY_LIFESTYLE_GUIDANCE'],

  // General
  'general': ['DEFAULT'],
  'regular': ['DEFAULT'],
  'basic': ['DEFAULT']
};

// Mobility keywords
const mobilityKeywords: Record<string, Mobility[]> = {
  'wheelchair': ['WHEELCHAIR'],
  'walker': ['WALKER'],
  'walking stick': ['WALKING_CANE'],
  'cane': ['WALKING_CANE'],
  'independent': ['INDEPENDENT'],
  'mobile': ['INDEPENDENT'],
  'bedridden': ['BEDRIDDEN'],
  'bed bound': ['BEDRIDDEN']
};

// Treatment type keywords
const treatmentKeywords: Record<string, TreatmentType[]> = {
  'injection': ['INJECTION'],
  'shot': ['INJECTION'],
  'vaccine': ['INJECTION'],
  'infusion': ['INFUSION'],
  'iv': ['INFUSION'],
  'medication': ['MEDICATION_MANAGEMENT'],
  'pills': ['MEDICATION_MANAGEMENT'],
  'medicine': ['MEDICATION_MANAGEMENT'],
  'monitoring': ['MONITORING'],
  'check': ['MONITORING'],
  'therapy': ['THERAPY'],
  'rehabilitation': ['THERAPY']
};

// Time parsing patterns
const timePatterns = [
  /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
  /(\d{1,2})\s*(am|pm)/i,
  /(\d{1,2})\s*o'?clock/i,
  /at\s*(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i
];

// Date parsing patterns  
const datePatterns = [
  /today/i,
  /tomorrow/i,
  /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  /(\d{1,2})-(\d{1,2})-(\d{2,4})/,
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
];

/**
 * Parse natural language query into structured format
 */
export function parseNaturalLanguageQuery(text: string): StructuredQuery {
  const query: StructuredQuery = {};
  const normalizedText = text.toLowerCase().trim();

  // Parse municipality
  const municipality = extractMunicipality(normalizedText);
  if (municipality) query.municipality = municipality;

  // Parse specializations - use 'specializations' plural for UI compatibility
  const specializations = extractSpecializations(normalizedText);
  if (specializations.length > 0) query.specializations = specializations;

  // Parse mobility requirements
  const mobility = extractMobility(normalizedText);
  if (mobility.length > 0) query.mobility = mobility;

  // Parse treatment types
  const treatmentTypes = extractTreatmentTypes(normalizedText);
  if (treatmentTypes.length > 0) query.treatmentType = treatmentTypes;

  // Parse time
  const time = extractTime(normalizedText);
  if (time) query.time = time;

  // Parse date
  const date = extractDate(normalizedText);
  if (date) query.date = date;

  // Check for urgency
  if (/(urgent|emergency|asap|immediately|now)/i.test(normalizedText)) {
    query.isUrgent = true;
  }

  // Check for availability
  if (/(available|free|open)/i.test(normalizedText)) {
    query.available = true;
  }

  // Extract number of results requested
  const limit = extractTopK(normalizedText);
  if (limit) query.limit = limit;

  return query;
}

/**
 * Extract municipality from query text
 */
function extractMunicipality(text: string): string | undefined {
  for (const [, variants] of Object.entries(cityMapping)) {
    for (const variant of variants) {
      if (text.includes(variant.toLowerCase())) {
        return variants[0]; // Return the first (canonical) form
      }
    }
  }
  return undefined;
}

/**
 * Extract specializations from query text
 */
function extractSpecializations(text: string): Specialization[] {
  const specializations = new Set<Specialization>();
  
  for (const [keyword, specs] of Object.entries(specializationKeywords)) {
    if (text.includes(keyword.toLowerCase())) {
      specs.forEach(spec => specializations.add(spec));
    }
  }
  
  return Array.from(specializations);
}

/**
 * Extract mobility requirements from query text
 */
function extractMobility(text: string): Mobility[] {
  const mobility = new Set<Mobility>();
  
  for (const [keyword, mobilities] of Object.entries(mobilityKeywords)) {
    if (text.includes(keyword.toLowerCase())) {
      mobilities.forEach(m => mobility.add(m));
    }
  }
  
  return Array.from(mobility);
}

/**
 * Extract treatment types from query text
 */
function extractTreatmentTypes(text: string): TreatmentType[] {
  const treatments = new Set<TreatmentType>();
  
  for (const [keyword, types] of Object.entries(treatmentKeywords)) {
    if (text.includes(keyword.toLowerCase())) {
      types.forEach(t => treatments.add(t));
    }
  }
  
  return Array.from(treatments);
}

/**
 * Extract time from query text
 */
function extractTime(text: string): string | undefined {
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const period = match[3]?.toLowerCase();
      
      // Convert to 24-hour format
      if (period === 'pm' && hours < 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  return undefined;
}

/**
 * Extract date from query text
 */
function extractDate(text: string): string | undefined {
  const today = new Date();
  
  if (text.includes('today')) {
    return today.toISOString().split('T')[0];
  }
  
  if (text.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Try other date patterns
  for (const pattern of datePatterns.slice(2)) {
    const match = text.match(pattern);
    if (match) {
      if (match[1] && match[2] && match[3]) {
        // MM/DD/YYYY or DD/MM/YYYY format
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        let year = parseInt(match[3]);
        
        if (year < 100) year += 2000; // Handle 2-digit years
        
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      } else if (match[1]) {
        // Day of week
        const dayName = match[1].toLowerCase();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName);
        
        if (targetDay !== -1) {
          const currentDay = today.getDay();
          let daysAhead = targetDay - currentDay;
          if (daysAhead <= 0) daysAhead += 7; // Next week if already passed
          
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + daysAhead);
          return targetDate.toISOString().split('T')[0];
        }
      }
    }
  }
  
  return undefined;
}

/**
 * Extract number of results requested
 */
function extractTopK(text: string): number | undefined {
  const match = text.match(/(?:top|first|best)\s*(\d+)|(\d+)\s*(?:results|nurses|options)/i);
  if (match) {
    const num = parseInt(match[1] || match[2]);
    return num > 0 && num <= 50 ? num : undefined; // Reasonable limits
  }
  return undefined;
}

/**
 * Convert structured query back to natural language
 */
export function queryToNaturalLanguage(query: StructuredQuery): string {
  const parts: string[] = [];
  
  if (query.municipality) {
    parts.push(`in ${query.municipality}`);
  }
  
  if (query.specialization && query.specialization.length > 0) {
    const specs = query.specialization.map(s => 
      s.toLowerCase().replace(/_/g, ' ')
    ).join(', ');
    parts.push(`specializing in ${specs}`);
  }
  
  if (query.treatmentType && query.treatmentType.length > 0) {
    const treatments = query.treatmentType.map(t => 
      t.toLowerCase().replace(/_/g, ' ')
    ).join(', ');
    parts.push(`for ${treatments}`);
  }
  
  if (query.date) {
    if (query.date === new Date().toISOString().split('T')[0]) {
      parts.push('today');
    } else {
      parts.push(`on ${query.date}`);
    }
  }
  
  if (query.time) {
    parts.push(`at ${query.time}`);
  }
  
  if (query.urgent) {
    parts.push('urgently');
  }
  
  const basePhrase = query.topK 
    ? `Find ${query.topK} nurses` 
    : 'Find nurses';
  
  if (parts.length === 0) {
    return basePhrase;
  }
  
  return `${basePhrase} ${parts.join(' ')}`;
}

/**
 * Validate structured query
 */
export function validateQuery(query: StructuredQuery): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (query.topK && (query.topK < 1 || query.topK > 50)) {
    errors.push('Number of results must be between 1 and 50');
  }
  
  if (query.date) {
    const queryDate = new Date(query.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (queryDate < today) {
      errors.push('Date cannot be in the past');
    }
  }
  
  if (query.time && !/^\d{2}:\d{2}$/.test(query.time)) {
    errors.push('Time must be in HH:MM format');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}