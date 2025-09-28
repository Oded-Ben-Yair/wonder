#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Nurse Data Integration Script
 * This script processes the nurse Excel file and integrates Hebrew localization
 * Run with: node integrate_nurse_data.js
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

// Configuration
const CONFIG = {
  excelPath: './data/nurse_data.xlsx',
  outputPath: './data/nurses_enhanced.json',
  localesPath: './packages/ui/src/i18n/locales',
  dbUpdateScript: './scripts/updateDatabase.sql'
};

/**
 * Detect language of text (Hebrew, Russian, English)
 */
function detectLanguage(text) {
  if (!text) return 'UNKNOWN';
  
  // Hebrew characters
  if (/[\u0590-\u05FF]/.test(text)) return 'HE';
  
  // Cyrillic characters  
  if (/[\u0400-\u04FF]/.test(text)) return 'RU';
  
  // Latin characters
  if (/[a-zA-Z]/.test(text)) return 'EN';
  
  return 'OTHER';
}

/**
 * Create searchable text variations for Hebrew names
 */
function createSearchVariations(firstName, lastName) {
  const variations = [];
  
  // Full name
  variations.push(`${firstName} ${lastName}`.trim());
  
  // Reverse order (common in Hebrew)
  variations.push(`${lastName} ${firstName}`.trim());
  
  // First name only
  if (firstName) variations.push(firstName);
  
  // Last name only
  if (lastName) variations.push(lastName);
  
  // Without nikud (Hebrew vowel marks)
  variations.push(removeNikud(`${firstName} ${lastName}`));
  
  return [...new Set(variations)]; // Remove duplicates
}

/**
 * Remove Hebrew nikud (vowel marks) for better search
 */
function removeNikud(text) {
  if (!text) return '';
  // Remove Hebrew nikud range U+0591 to U+05C7
  return text.replace(/[\u0591-\u05C7]/g, '');
}

/**
 * Main processing function
 */
async function processNurseData() {
  console.log('🏥 Wonder Healthcare - Nurse Data Integration');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Read Excel file
    console.log('\n📊 Step 1: Reading nurse data from Excel...');
    const workbook = xlsx.readFile(CONFIG.excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawNurses = xlsx.utils.sheet_to_json(sheet);
    console.log(`   ✓ Found ${rawNurses.length} nurses`);
    
    // Step 2: Process and enhance nurse data
    console.log('\n🔄 Step 2: Processing nurse records...');
    const enhancedNurses = rawNurses.map((nurse, index) => {
      const firstName = nurse.first_name?.trim() || '';
      const lastName = nurse.last_name?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Detect primary language
      const firstNameLang = detectLanguage(firstName);
      const lastNameLang = detectLanguage(lastName);
      const primaryLanguage = firstNameLang !== 'UNKNOWN' ? firstNameLang : lastNameLang;
      
      // Create enhanced nurse object
      const enhanced = {
        id: nurse.id,
        firstName: firstName,
        lastName: lastName,
        displayName: fullName,
        displayNameHebrew: primaryLanguage === 'HE' ? fullName : '',
        searchableText: createSearchVariations(firstName, lastName),
        language: primaryLanguage,
        nameWithoutNikud: removeNikud(fullName),
        // For LLM context
        llmContext: {
          identifier: nurse.id,
          humanReadableName: fullName,
          searchTerms: createSearchVariations(firstName, lastName),
          isHebrewSpeaker: primaryLanguage === 'HE'
        }
      };
      
      // Progress indicator
      if ((index + 1) % 500 === 0) {
        console.log(`   Processing: ${index + 1}/${rawNurses.length}`);
      }
      
      return enhanced;
    });
    
    // Language statistics
    const stats = {
      total: enhancedNurses.length,
      hebrew: enhancedNurses.filter(n => n.language === 'HE').length,
      russian: enhancedNurses.filter(n => n.language === 'RU').length,
      english: enhancedNurses.filter(n => n.language === 'EN').length,
      other: enhancedNurses.filter(n => n.language === 'OTHER' || n.language === 'UNKNOWN').length
    };
    
    console.log('\n📈 Language Distribution:');
    console.log(`   Hebrew:  ${stats.hebrew} (${(stats.hebrew/stats.total*100).toFixed(1)}%)`);
    console.log(`   Russian: ${stats.russian} (${(stats.russian/stats.total*100).toFixed(1)}%)`);
    console.log(`   English: ${stats.english} (${(stats.english/stats.total*100).toFixed(1)}%)`);
    console.log(`   Other:   ${stats.other} (${(stats.other/stats.total*100).toFixed(1)}%)`);
    
    // Step 3: Save enhanced data
    console.log('\n💾 Step 3: Saving enhanced nurse data...');
    fs.writeFileSync(
      CONFIG.outputPath,
      JSON.stringify(enhancedNurses, null, 2),
      'utf8'
    );
    console.log(`   ✓ Saved to ${CONFIG.outputPath}`);
    
    // Step 4: Generate SQL update script
    console.log('\n🗄️ Step 4: Generating database update script...');
    const sqlStatements = generateSQLUpdates(enhancedNurses);
    fs.writeFileSync(CONFIG.dbUpdateScript, sqlStatements, 'utf8');
    console.log(`   ✓ SQL script saved to ${CONFIG.dbUpdateScript}`);
    
    // Step 5: Create search index
    console.log('\n🔍 Step 5: Creating Hebrew search index...');
    const searchIndex = createSearchIndex(enhancedNurses);
    fs.writeFileSync(
      './data/nurse_search_index.json',
      JSON.stringify(searchIndex, null, 2),
      'utf8'
    );
    console.log(`   ✓ Search index created`);
    
    // Step 6: Generate LLM prompt templates
    console.log('\n🤖 Step 6: Generating LLM prompt templates...');
    generateLLMTemplates(enhancedNurses);
    
    console.log('\n✅ Integration complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: psql healthcare_db < scripts/updateDatabase.sql');
    console.log('   2. Restart the gateway service');
    console.log('   3. Test with Hebrew queries');
    
    return enhancedNurses;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

/**
 * Generate SQL statements for database updates
 */
function generateSQLUpdates(nurses) {
  let sql = '-- Wonder Healthcare Nurse Data Update\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
  
  sql += 'BEGIN TRANSACTION;\n\n';
  
  // Add columns if they don't exist
  sql += '-- Add new columns for name display\n';
  sql += 'ALTER TABLE nurses ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);\n';
  sql += 'ALTER TABLE nurses ADD COLUMN IF NOT EXISTS name_language VARCHAR(10);\n';
  sql += 'ALTER TABLE nurses ADD COLUMN IF NOT EXISTS searchable_text TEXT;\n\n';
  
  // Update each nurse
  sql += '-- Update nurse records with display names\n';
  nurses.forEach(nurse => {
    const displayName = nurse.displayName.replace(/'/g, "''"); // Escape quotes
    const searchableText = nurse.searchableText.join(' ').replace(/'/g, "''");
    
    sql += `UPDATE nurses SET 
      display_name = '${displayName}',
      name_language = '${nurse.language}',
      searchable_text = '${searchableText}'
    WHERE id = '${nurse.id}';\n`;
  });
  
  // Add indexes
  sql += '\n-- Add indexes for faster search\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_nurse_display_name ON nurses(display_name);\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_nurse_language ON nurses(name_language);\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_nurse_search_gin ON nurses USING GIN(to_tsvector(\'simple\', searchable_text));\n';
  
  sql += '\nCOMMIT;\n';
  
  return sql;
}

/**
 * Create search index for fast lookups
 */
function createSearchIndex(nurses) {
  const index = {
    byId: {},
    byName: {},
    byFirstName: {},
    byLastName: {},
    hebrewOnly: []
  };
  
  nurses.forEach(nurse => {
    // Index by ID
    index.byId[nurse.id] = nurse;
    
    // Index by full name (normalized)
    const normalizedName = nurse.displayName.toLowerCase();
    if (!index.byName[normalizedName]) {
      index.byName[normalizedName] = [];
    }
    index.byName[normalizedName].push(nurse.id);
    
    // Index by first name
    if (nurse.firstName) {
      const normalizedFirst = nurse.firstName.toLowerCase();
      if (!index.byFirstName[normalizedFirst]) {
        index.byFirstName[normalizedFirst] = [];
      }
      index.byFirstName[normalizedFirst].push(nurse.id);
    }
    
    // Index by last name
    if (nurse.lastName) {
      const normalizedLast = nurse.lastName.toLowerCase();
      if (!index.byLastName[normalizedLast]) {
        index.byLastName[normalizedLast] = [];
      }
      index.byLastName[normalizedLast].push(nurse.id);
    }
    
    // Hebrew-only index
    if (nurse.language === 'HE') {
      index.hebrewOnly.push({
        id: nurse.id,
        name: nurse.displayName,
        searchTerms: nurse.searchableText
      });
    }
  });
  
  return index;
}

/**
 * Generate LLM prompt templates for Hebrew queries
 */
function generateLLMTemplates(nurses) {
  const templates = {
    hebrewQueries: [
      "מצא אחות בשם {{nurseName}}",
      "אני צריך אחות ש{{service}} ב{{city}}",
      "האם {{nurseName}} זמינה ל{{service}}?",
      "מי האחיות שמדברות {{language}}?",
      "אילו אחיות יש ב{{city}} עם התמחות ב{{specialization}}?"
    ],
    systemPrompt: `You are a Hebrew-speaking healthcare assistant for Wonder Healthcare Platform.
    
    You have access to ${nurses.length} nurses in the system.
    ${nurses.filter(n => n.language === 'HE').length} nurses have Hebrew names.
    
    When users ask for nurses:
    1. Search by NAME not ID
    2. Respond in Hebrew when asked in Hebrew
    3. Show nurse full names: firstName + lastName
    4. Example: "אסתר אלגרבלי" not "a09817cd-26c4-407b-843a-34fef3c3af67"
    
    Common Hebrew queries patterns:
    - "אחות בשם..." = nurse named...
    - "צריך אחות ל..." = need a nurse for...
    - "אחיות ב..." = nurses in... (location)
    - "זמינה" = available
    - "מומחית ב..." = specialist in...`
  };
  
  fs.writeFileSync(
    './data/llm_hebrew_templates.json',
    JSON.stringify(templates, null, 2),
    'utf8'
  );
  
  console.log('   ✓ LLM templates generated');
}

// Run the script
if (require.main === module) {
  processNurseData()
    .then(() => {
      console.log('\n🎉 Success! The nurse data has been processed and integrated.');
    })
    .catch(error => {
      console.error('\n💥 Failed:', error);
      process.exit(1);
    });
}

module.exports = { processNurseData, detectLanguage, createSearchVariations };
