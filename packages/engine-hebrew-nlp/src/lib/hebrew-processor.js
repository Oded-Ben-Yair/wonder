// Hebrew text processing utilities
// Handles Hebrew-specific NLP tasks and mixed Hebrew-English text

/**
 * Process Hebrew text for NLP analysis
 */
export function processHebrewText(text) {
  if (!text) return '';

  // Handle mixed Hebrew-English text
  let processed = text;

  // Normalize Hebrew characters
  processed = normalizeHebrewText(processed);

  // Remove diacritics (nikud)
  processed = removeHebrewDiacritics(processed);

  return processed;
}

/**
 * Normalize Hebrew text variations
 */
function normalizeHebrewText(text) {
  // Replace final letters with regular equivalents for matching
  const finalLetterMap = {
    'ץ': 'צ', // final tsadi
    'ף': 'פ', // final pe
    'ך': 'כ', // final kaf
    'ם': 'מ', // final mem
    'ן': 'נ'  // final nun
  };

  let normalized = text;
  for (const [final, regular] of Object.entries(finalLetterMap)) {
    // Only replace for search matching, not display
    normalized = normalized.replace(new RegExp(final, 'g'), regular);
  }

  return normalized;
}

/**
 * Remove Hebrew diacritics (nikud) for better matching
 */
function removeHebrewDiacritics(text) {
  // Hebrew diacritics Unicode range: 0x0591-0x05C7
  return text.replace(/[\u0591-\u05C7]/g, '');
}

/**
 * Extract entities from Hebrew/English text
 */
export function extractEntities(text) {
  const entities = {
    names: [],
    locations: [],
    services: [],
    times: [],
    urgency: false
  };

  // Check for urgency markers
  const urgentMarkers = ['דחוף', 'מיידי', 'עכשיו', 'urgent', 'now', 'immediately', 'asap'];
  entities.urgency = urgentMarkers.some(marker =>
    text.toLowerCase().includes(marker.toLowerCase())
  );

  // Extract time expressions
  const timePatterns = [
    /היום/g,         // today
    /מחר/g,          // tomorrow
    /עכשיו/g,        // now
    /השבוע/g,        // this week
    /\d{1,2}:\d{2}/g, // time format
  ];

  timePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      entities.times.push(...matches);
    }
  });

  // Extract Hebrew names (common patterns)
  const hebrewNamePattern = /[א-ת]+\s+[א-ת]+/g;
  const nameMatches = text.match(hebrewNamePattern);
  if (nameMatches) {
    entities.names.push(...nameMatches);
  }

  return entities;
}

/**
 * Check if text contains Hebrew characters
 */
export function containsHebrew(text) {
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Detect language of text
 */
export function detectLanguage(text) {
  const hebrewCount = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length;

  if (hebrewCount > englishCount) return 'hebrew';
  if (englishCount > hebrewCount) return 'english';
  return 'mixed';
}

/**
 * Tokenize Hebrew text
 */
export function tokenizeHebrew(text) {
  // Split on spaces and punctuation
  return text
    .split(/[\s,\.;!?]+/)
    .filter(token => token.length > 0);
}

/**
 * Calculate text similarity for Hebrew
 */
export function hebrewSimilarity(text1, text2) {
  const processed1 = processHebrewText(text1).toLowerCase();
  const processed2 = processHebrewText(text2).toLowerCase();

  // Simple character-based similarity
  const maxLength = Math.max(processed1.length, processed2.length);
  if (maxLength === 0) return 1.0;

  let matches = 0;
  const minLength = Math.min(processed1.length, processed2.length);

  for (let i = 0; i < minLength; i++) {
    if (processed1[i] === processed2[i]) {
      matches++;
    }
  }

  return matches / maxLength;
}