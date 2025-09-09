#!/usr/bin/env node

/**
 * Wonder Healthcare Platform - Database Migration Script
 * 
 * Migrates nurse data from JSON files to Azure PostgreSQL database
 * Compatible with existing packages/gateway/src/server.js transformNurseData function
 * 
 * Usage:
 *   node database/migrate.js --env production
 *   node database/migrate.js --env development --dry-run
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configuration
const config = {
  batchSize: 100, // Process records in batches
  maxRetries: 3,  // Retry failed operations
  logLevel: process.env.LOG_LEVEL || 'info'
};

class DatabaseMigrator {
  constructor(connectionString, isDryRun = false) {
    this.connectionString = connectionString;
    this.isDryRun = isDryRun;
    this.client = null;
    this.stats = {
      totalRecords: 0,
      processed: 0,
      errors: 0,
      skipped: 0
    };
  }

  async connect() {
    this.client = new Client({ 
      connectionString: this.connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await this.client.connect();
    console.log('✅ Database connected successfully');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Database connection closed');
    }
  }

  async loadNurseData() {
    try {
      const dataPath = path.join(__dirname, '..', 'packages', 'gateway', 'src', 'data', 'nurses.json');
      const rawData = await fs.readFile(dataPath, 'utf-8');
      const nurses = JSON.parse(rawData);
      
      console.log(`📊 Loaded ${nurses.length} nurse records from JSON`);
      this.stats.totalRecords = nurses.length;
      
      return nurses;
    } catch (error) {
      console.error('❌ Failed to load nurse data:', error.message);
      throw error;
    }
  }

  // Transform data using the same logic as gateway/src/server.js
  transformNurseData(productionNurse, index) {
    // Extract municipalities - handle both string and array
    const municipalities = Array.isArray(productionNurse.municipality) 
      ? productionNurse.municipality 
      : [productionNurse.municipality].filter(Boolean);
    
    // Find primary city - prefer Tel Aviv, Jerusalem, Haifa, then any Hebrew/English city
    const primaryCity = municipalities.find(city => 
      city?.includes('Tel Aviv') || city?.includes('תל אביב')
    ) || municipalities.find(city => 
      city?.includes('Jerusalem') || city?.includes('ירושלים')
    ) || municipalities.find(city => 
      city?.includes('Hefa') || city?.includes('חיפה')
    ) || municipalities.find(city => 
      city && !city.includes('undefined')
    ) || 'Unknown';

    // Extract specializations and map to services
    const specializations = Array.isArray(productionNurse.specialization) 
      ? productionNurse.specialization 
      : [productionNurse.specialization].filter(Boolean);
    
    // Map specializations to user-friendly services
    const services = specializations.map(spec => {
      const specMap = {
        'DEFAULT': 'General Nursing',
        'WOUND_CARE': 'Wound Care',
        'CENTRAL_CATHETER_TREATMENT': 'IV Therapy',
        'MEDICATION': 'Medication Management',
        'DAY_NIGHT_CIRCUMCISION_NURSE': 'Pediatric Care',
        'PRIVATE_SECURITY_HOSPITAL': 'Hospital Security',
        'PRIVATE_SECURITY_HOME': 'Home Security',
        'PALLIATIVE_CARE': 'Palliative Care',
        'GERIATRIC_CARE': 'Geriatric Care',
        'DIABETIC_WOUND_TREATMENT': 'Diabetic Care',
        'ESCORTED_BY_NURSE': 'Patient Transport',
        'BLOOD_TESTS': 'Lab Services'
      };
      return specMap[spec] || spec;
    }).filter(s => s !== 'DEFAULT' && s);

    // Ensure at least one service
    if (services.length === 0) {
      services.push('General Nursing');
    }

    // Create expertise tags from specializations and mobility
    const expertiseTags = [
      ...specializations.filter(s => s !== 'DEFAULT').map(s => s.toLowerCase().replace(/_/g, ' ')),
      ...(Array.isArray(productionNurse.mobility) ? productionNurse.mobility : []).map(m => m.toLowerCase().replace(/_/g, ' '))
    ].slice(0, 5); // Limit to 5 tags

    // Generate synthetic coordinates for major cities (rough approximations)
    const cityCoords = {
      'Tel Aviv': { lat: 32.0853, lng: 34.7818 },
      'תל אביב-יפו': { lat: 32.0853, lng: 34.7818 },
      'Jerusalem': { lat: 31.7683, lng: 35.2137 },
      'ירושלים': { lat: 31.7683, lng: 35.2137 },
      'Haifa': { lat: 32.7940, lng: 34.9896 },
      'חיפה': { lat: 32.7940, lng: 34.9896 },
      'Hefa': { lat: 32.7940, lng: 34.9896 },
      'Ramat-Gan': { lat: 32.0719, lng: 34.8242 },
      'רמת גן': { lat: 32.0719, lng: 34.8242 },
      'Petach Tikva': { lat: 32.0922, lng: 34.8878 },
      'פתח תקווה': { lat: 32.0922, lng: 34.8878 }
    };

    const coords = cityCoords[primaryCity] || 
      Object.values(cityCoords).find((_, i) => i === index % Object.keys(cityCoords).length) ||
      { lat: 32.0853, lng: 34.7818 }; // Default to Tel Aviv

    // Generate synthetic rating and reviews based on experience and approvals
    const isApproved = productionNurse.isApproved;
    const isProfileUpdated = productionNurse.isProfileUpdated;
    const hasMultipleSpecializations = specializations.length > 3;
    
    let rating = 4.2 + Math.random() * 0.6; // Base 4.2-4.8
    if (isApproved) rating += 0.2;
    if (isProfileUpdated) rating += 0.1;
    if (hasMultipleSpecializations) rating += 0.1;
    rating = Math.min(5.0, rating);

    const reviewsCount = Math.floor(20 + Math.random() * 200 + (specializations.length * 10));

    return {
      nurse_id: productionNurse.nurseId || `nurse-${index}`,
      name: `Nurse ${index + 1}`, // Generate synthetic names for privacy
      city: primaryCity.replace(/תל אביב-יפו|תל אביב/g, 'Tel Aviv')
                      .replace(/ירושלים/g, 'Jerusalem')
                      .replace(/חיפה/g, 'Haifa')
                      .replace(/רמת גן/g, 'Ramat-Gan')
                      .replace(/פתח תקווה/g, 'Petach Tikva'),
      lat: coords.lat,
      lng: coords.lng,
      rating: Math.round(rating * 10) / 10,
      reviews_count: reviewsCount,
      is_active: productionNurse.isActive || false,
      is_approved: productionNurse.isApproved || false,
      is_profile_updated: productionNurse.isProfileUpdated || false,
      gender: productionNurse.gender || null,
      
      // Related data
      services: services,
      raw_specializations: specializations,
      expertise_tags: expertiseTags,
      municipalities: municipalities
    };
  }

  async insertNurse(nurseData) {
    const query = `
      INSERT INTO nurses (
        nurse_id, name, city, lat, lng, rating, reviews_count,
        is_active, is_approved, is_profile_updated, gender
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (nurse_id) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        rating = EXCLUDED.rating,
        reviews_count = EXCLUDED.reviews_count,
        is_active = EXCLUDED.is_active,
        is_approved = EXCLUDED.is_approved,
        is_profile_updated = EXCLUDED.is_profile_updated,
        gender = EXCLUDED.gender,
        updated_at = NOW()
      RETURNING id;
    `;

    const values = [
      nurseData.nurse_id,
      nurseData.name,
      nurseData.city,
      nurseData.lat,
      nurseData.lng,
      nurseData.rating,
      nurseData.reviews_count,
      nurseData.is_active,
      nurseData.is_approved,
      nurseData.is_profile_updated,
      nurseData.gender
    ];

    if (this.isDryRun) {
      console.log('🔍 [DRY RUN] Would insert nurse:', nurseData.nurse_id);
      return { rows: [{ id: 'dry-run-uuid' }] };
    }

    const result = await this.client.query(query, values);
    return result;
  }

  async insertNurseServices(nurseId, services, rawSpecializations) {
    if (!services || services.length === 0) return;

    const deleteQuery = 'DELETE FROM nurse_services WHERE nurse_id = $1';
    if (!this.isDryRun) {
      await this.client.query(deleteQuery, [nurseId]);
    }

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const rawSpec = rawSpecializations[i] || service;
      
      const insertQuery = `
        INSERT INTO nurse_services (nurse_id, service, service_type, service_category, is_primary)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (nurse_id, service) DO NOTHING;
      `;

      const values = [
        nurseId,
        service,
        rawSpec,
        service,
        i === 0 // First service is primary
      ];

      if (this.isDryRun) {
        console.log('🔍 [DRY RUN] Would insert service:', service);
      } else {
        await this.client.query(insertQuery, values);
      }
    }
  }

  async insertNurseExpertise(nurseId, expertiseTags) {
    if (!expertiseTags || expertiseTags.length === 0) return;

    const deleteQuery = 'DELETE FROM nurse_expertise WHERE nurse_id = $1';
    if (!this.isDryRun) {
      await this.client.query(deleteQuery, [nurseId]);
    }

    for (const tag of expertiseTags) {
      const insertQuery = `
        INSERT INTO nurse_expertise (nurse_id, expertise_tag, expertise_type)
        VALUES ($1, $2, $3)
        ON CONFLICT (nurse_id, expertise_tag) DO NOTHING;
      `;

      const values = [nurseId, tag, 'specialization'];

      if (this.isDryRun) {
        console.log('🔍 [DRY RUN] Would insert expertise:', tag);
      } else {
        await this.client.query(insertQuery, values);
      }
    }
  }

  async insertNurseLocations(nurseId, municipalities) {
    if (!municipalities || municipalities.length === 0) return;

    const deleteQuery = 'DELETE FROM nurse_locations WHERE nurse_id = $1';
    if (!this.isDryRun) {
      await this.client.query(deleteQuery, [nurseId]);
    }

    for (let i = 0; i < municipalities.length; i++) {
      const municipality = municipalities[i];
      if (!municipality || municipality === 'undefined') continue;

      const insertQuery = `
        INSERT INTO nurse_locations (nurse_id, municipality, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT (nurse_id, municipality) DO NOTHING;
      `;

      const values = [nurseId, municipality, i === 0]; // First location is primary

      if (this.isDryRun) {
        console.log('🔍 [DRY RUN] Would insert location:', municipality);
      } else {
        await this.client.query(insertQuery, values);
      }
    }
  }

  async processBatch(batch) {
    if (!this.isDryRun) {
      await this.client.query('BEGIN');
    }

    try {
      for (let i = 0; i < batch.length; i++) {
        const transformed = this.transformNurseData(batch[i], this.stats.processed + i);
        
        try {
          // Insert nurse record
          const result = await this.insertNurse(transformed);
          const nurseId = result.rows[0].id;

          // Insert related data
          await this.insertNurseServices(nurseId, transformed.services, transformed.raw_specializations);
          await this.insertNurseExpertise(nurseId, transformed.expertise_tags);
          await this.insertNurseLocations(nurseId, transformed.municipalities);

          this.stats.processed++;

          if (this.stats.processed % 500 === 0) {
            console.log(`📈 Progress: ${this.stats.processed}/${this.stats.totalRecords} (${Math.round(this.stats.processed/this.stats.totalRecords*100)}%)`);
          }

        } catch (error) {
          console.error(`❌ Error processing nurse ${transformed.nurse_id}:`, error.message);
          this.stats.errors++;
          
          // Continue processing other records in batch
          continue;
        }
      }

      if (!this.isDryRun) {
        await this.client.query('COMMIT');
      }

    } catch (error) {
      if (!this.isDryRun) {
        await this.client.query('ROLLBACK');
      }
      throw error;
    }
  }

  async migrate() {
    console.log('🚀 Starting database migration...');
    console.log(`📝 Mode: ${this.isDryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);

    try {
      await this.connect();

      // Load nurse data
      const nurses = await this.loadNurseData();
      
      // Filter active and approved nurses (matching production logic)
      const activeNurses = nurses.filter(nurse => 
        nurse.isActive && nurse.isApproved
      );
      
      console.log(`🔍 Filtered to ${activeNurses.length} active approved nurses`);
      this.stats.totalRecords = activeNurses.length;

      // Process in batches
      const totalBatches = Math.ceil(activeNurses.length / config.batchSize);
      
      for (let i = 0; i < totalBatches; i++) {
        const start = i * config.batchSize;
        const end = Math.min(start + config.batchSize, activeNurses.length);
        const batch = activeNurses.slice(start, end);

        console.log(`🔄 Processing batch ${i + 1}/${totalBatches} (records ${start + 1}-${end})`);
        
        await this.processBatch(batch);
      }

      // Final statistics
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Total records: ${this.stats.totalRecords}`);
      console.log(`✅ Successfully processed: ${this.stats.processed}`);
      console.log(`❌ Errors: ${this.stats.errors}`);
      console.log(`⏭️  Skipped: ${this.stats.skipped}`);

      if (!this.isDryRun) {
        // Verify migration
        const countResult = await this.client.query('SELECT COUNT(*) FROM nurses WHERE is_active = true AND is_approved = true');
        console.log(`🔍 Database verification: ${countResult.rows[0].count} active nurses in database`);
      }

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const env = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development';

  console.log('🏥 Wonder Healthcare Platform - Database Migration');
  console.log(`🔧 Environment: ${env}`);
  console.log(`🔍 Dry Run: ${isDryRun ? 'Yes' : 'No'}\n`);

  // Get database connection string
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    const migrator = new DatabaseMigrator(connectionString, isDryRun);
    await migrator.migrate();
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DatabaseMigrator };