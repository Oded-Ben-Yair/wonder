/**
 * Professional Nurse Name Generator
 * Creates consistent, realistic nurse names for CEO demonstrations
 * Uses nurseId as seed for deterministic generation
 */

import crypto from 'crypto';

// Common Israeli first names by gender
const FEMALE_NAMES = [
  'Rachel', 'Sarah', 'Miriam', 'Leah', 'Tamar', 'Noa', 'Maya', 'Adi', 'Shira', 'Michal',
  'Yael', 'Dina', 'Rut', 'Hana', 'Tali', 'Orly', 'Miri', 'Irit', 'Orit', 'Liat',
  'Efrat', 'Ronit', 'Sigal', 'Limor', 'Keren', 'Galit', 'Nurit', 'Vered', 'Iris', 'Dana',
  'Chen', 'Tal', 'Noy', 'Yarden', 'Stav', 'Roni', 'Lihi', 'Nitzan', 'Rotem', 'Amit'
];

const MALE_NAMES = [
  'David', 'Michael', 'Daniel', 'Yosef', 'Moshe', 'Avi', 'Amit', 'Eran', 'Ronen', 'Shai',
  'Oren', 'Gal', 'Tal', 'Noam', 'Yaron', 'Alon', 'Dor', 'Roi', 'Nir', 'Chen',
  'Eyal', 'Itai', 'Omri', 'Yuval', 'Nadav', 'Gilad', 'Asaf', 'Ran', 'Guy', 'Lior',
  'Idan', 'Oded', 'Boaz', 'Elad', 'Roee', 'Ariel', 'Yair', 'Doron', 'Uri', 'Omer'
];

// Common Israeli last names
const LAST_NAMES = [
  'Cohen', 'Levy', 'Miller', 'Friedman', 'Goldberg', 'Rosen', 'Klein', 'Katz', 'Weiss', 'Schwartz',
  'Ben-David', 'Avraham', 'Mizrahi', 'Peretz', 'Biton', 'Dahan', 'Malka', 'Azulay', 'Hen', 'Sasson',
  'Shapiro', 'Romano', 'Tal', 'Bar', 'Gil', 'Noy', 'Paz', 'Raz', 'Lev', 'Ben-Ami',
  'Goldstein', 'Rosenberg', 'Weinstein', 'Stein', 'Green', 'Silver', 'Diamond', 'Pearl', 'Rose', 'Gold'
];

/**
 * Generate a consistent professional name for a nurse
 * @param {string} nurseId - The unique nurse identifier
 * @param {string} gender - 'MALE' or 'FEMALE'
 * @returns {string} Professional name in format "FirstName LastName, RN"
 */
function generateNurseName(nurseId, gender = 'FEMALE') {
  // Use nurseId as seed for consistent generation
  const hash = crypto.createHash('md5').update(nurseId).digest('hex');

  // Convert first 8 hex characters to numbers for indexing
  const seed1 = parseInt(hash.substring(0, 4), 16);
  const seed2 = parseInt(hash.substring(4, 8), 16);
  const seed3 = parseInt(hash.substring(8, 12), 16);

  // Select names based on gender
  const firstNames = gender === 'MALE' ? MALE_NAMES : FEMALE_NAMES;
  const firstName = firstNames[seed1 % firstNames.length];
  const lastName = LAST_NAMES[seed2 % LAST_NAMES.length];

  // Add variety - sometimes use double last names or Hebrew variants
  const useDoubleLastName = seed3 % 10 < 2; // 20% chance
  if (useDoubleLastName && LAST_NAMES.length > seed3 % LAST_NAMES.length + 1) {
    const secondLastName = LAST_NAMES[(seed2 + seed3) % LAST_NAMES.length];
    if (secondLastName !== lastName) {
      return `${firstName} ${lastName}-${secondLastName}, RN`;
    }
  }

  return `${firstName} ${lastName}, RN`;
}

/**
 * Generate a shorter display name without credentials
 * @param {string} nurseId - The unique nurse identifier
 * @param {string} gender - 'MALE' or 'FEMALE'
 * @returns {string} Name in format "FirstName LastName"
 */
function generateShortNurseName(nurseId, gender = 'FEMALE') {
  const fullName = generateNurseName(nurseId, gender);
  return fullName.replace(', RN', '');
}

/**
 * Test the name generator with sample data
 */
function testNameGenerator() {
  console.log('Testing Professional Name Generator:');
  console.log('===================================');

  const testCases = [
    { id: '0127d89a-51e7-4867-b5c7-3502d7038c88', gender: 'FEMALE' },
    { id: '012c767f-6856-40a2-9702-38b394dff355', gender: 'MALE' },
    { id: '01b52cbb-bee6-4b5d-9087-fd53c62b2a19', gender: 'FEMALE' },
    { id: '023f36e5-dce4-4c67-a860-b2f063ebe321', gender: 'FEMALE' },
    { id: '025cf8e8-b6a5-43e7-99a3-d8c769e58fc5', gender: 'MALE' },
  ];

  testCases.forEach((testCase, index) => {
    const name = generateNurseName(testCase.id, testCase.gender);
    const shortName = generateShortNurseName(testCase.id, testCase.gender);
    console.log(`${index + 1}. ID: ${testCase.id.substring(0, 8)} (${testCase.gender})`);
    console.log(`   Full: ${name}`);
    console.log(`   Short: ${shortName}`);
    console.log();
  });
}

export {
  generateNurseName,
  generateShortNurseName,
  testNameGenerator
};