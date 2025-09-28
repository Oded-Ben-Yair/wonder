#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

/**
 * Process Hebrew Nurse Data
 */
function processNurseData() {
  console.log('🏥 Processing Hebrew Nurse Database...\n');

  // Read Excel file
  const workbook = xlsx.readFile('data-17588841641121111.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const excelData = xlsx.utils.sheet_to_json(sheet);

  console.log(`📊 Found ${excelData.length} nurses in Excel\n`);

  // Read current nurses.json to get existing data
  const existingNursesPath = './packages/gateway/src/data/nurses.json';
  const existingNurses = JSON.parse(fs.readFileSync(existingNursesPath, 'utf8'));

  // Create ID to name mapping
  const idToNameMap = {};
  const hebrewSearchIndex = {};

  excelData.forEach(nurse => {
    const id = nurse.id;
    const firstName = nurse.first_name || '';
    const lastName = nurse.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    idToNameMap[id] = {
      firstName: firstName,
      lastName: lastName,
      fullName: fullName,
      displayName: fullName,
      isHebrew: /[\u0590-\u05FF]/.test(fullName),
      searchVariations: [
        fullName,
        `${lastName} ${firstName}`,
        firstName,
        lastName,
        fullName.replace(/[\u0591-\u05C7]/g, '') // Remove nikud
      ].filter(Boolean)
    };

    // Create search index for Hebrew names
    if (idToNameMap[id].isHebrew) {
      const normalizedName = fullName.toLowerCase();
      hebrewSearchIndex[normalizedName] = id;

      // Also index by first and last name separately
      if (firstName) hebrewSearchIndex[firstName.toLowerCase()] = id;
      if (lastName) hebrewSearchIndex[lastName.toLowerCase()] = id;
    }
  });

  // Merge with existing nurse data
  const enhancedNurses = existingNurses.map(nurse => {
    const nameData = idToNameMap[nurse.nurseId];
    if (nameData) {
      return {
        ...nurse,
        firstName: nameData.firstName,
        lastName: nameData.lastName,
        displayName: nameData.fullName,
        searchableNames: nameData.searchVariations,
        isHebrew: nameData.isHebrew
      };
    }
    return nurse;
  });

  // Save enhanced nurses data
  fs.writeFileSync(
    existingNursesPath,
    JSON.stringify(enhancedNurses, null, 2),
    'utf8'
  );

  console.log(`✅ Updated ${existingNursesPath} with Hebrew names\n`);

  // Save name mapping for quick lookup
  fs.writeFileSync(
    './packages/gateway/src/data/nurse_names.json',
    JSON.stringify(idToNameMap, null, 2),
    'utf8'
  );

  console.log('✅ Created nurse_names.json mapping\n');

  // Save Hebrew search index
  fs.writeFileSync(
    './packages/gateway/src/data/hebrew_search_index.json',
    JSON.stringify(hebrewSearchIndex, null, 2),
    'utf8'
  );

  console.log('✅ Created hebrew_search_index.json\n');

  // Statistics
  const hebrewCount = enhancedNurses.filter(n => n.isHebrew).length;
  console.log('📈 Statistics:');
  console.log(`  - Total nurses: ${enhancedNurses.length}`);
  console.log(`  - Hebrew names: ${hebrewCount} (${(hebrewCount/enhancedNurses.length*100).toFixed(1)}%)`);
  console.log(`  - Other: ${enhancedNurses.length - hebrewCount}`);
}

// Run the script
processNurseData();