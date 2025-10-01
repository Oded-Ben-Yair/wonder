# Wonder Healthcare Platform - Nurse Data & Localization Integration Plan

## Overview
Integration of 3,184 nurse records with Hebrew localization into the Wonder Healthcare LLM engine.

## Files to Integrate
1. **nurse_data.xlsx**: 3,184 nurses with UUID, first_name, last_name (Hebrew/Russian/English names)
2. **he.json**: Hebrew translations for all UI elements
3. **en.json**: English translations for fallback

## Integration Tasks

### Phase 1: Data Preparation (Immediate)

#### 1.1 Convert Excel to Enhanced JSON
```javascript
// Target structure for each nurse:
{
  "id": "UUID",
  "displayName": "firstName lastName",  // Full name for display
  "firstName": "firstName",
  "lastName": "lastName",
  "searchableText": "firstName lastName",  // For Hebrew search
  "language": "detected_language"  // HE, RU, EN based on characters
}
```

#### 1.2 Create Nurse Name Index
- Build searchable index for Hebrew names
- Support partial matching (חלקי)
- Handle transliteration (English to Hebrew mapping)

### Phase 2: LLM Engine Updates

#### 2.1 Query Processing Enhancement
```javascript
// packages/gateway/queryProcessor.js
class HebrewQueryProcessor {
  // Convert queries to Hebrew
  // Map nurse IDs to names
  // Support bilingual queries
}
```

#### 2.2 NLP Enhancements for Hebrew
```javascript
// packages/ui/src/components/ChatBot/nlpUtils.js
const hebrewPatterns = {
  nurseByName: /אחות\s+בשם\s+(.+)/,
  findNurse: /מצא\s+אחות\s+(.+)/,
  needNurse: /צריך\s+אחות\s+(.+)/
}
```

### Phase 3: Database Schema Updates

#### 3.1 Nurses Table Enhancement
```sql
ALTER TABLE nurses ADD COLUMN display_name VARCHAR(255);
ALTER TABLE nurses ADD COLUMN name_language VARCHAR(10);
ALTER TABLE nurses ADD INDEX idx_display_name (display_name);
ALTER TABLE nurses ADD FULLTEXT idx_hebrew_search (first_name, last_name, display_name);
```

### Phase 4: API Modifications

#### 4.1 Search Endpoint Updates
```javascript
// packages/gateway/routes/nurses.js
router.get('/search', async (req, res) => {
  const { query, language = 'he' } = req.query;
  // Search by name instead of ID
  // Return localized results
});
```

#### 4.2 Matching Engine Updates
```javascript
// packages/engine-fuzzy/index.js
const matchNursesByName = (query, nurses) => {
  // Fuzzy match on Hebrew names
  // Weight Hebrew matches higher
  // Support name variations
};
```

### Phase 5: Frontend Integration

#### 5.1 Localization Setup
```javascript
// packages/ui/src/i18n/index.js
import heTranslations from './locales/he.json';
import enTranslations from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: heTranslations },
    en: { translation: enTranslations }
  },
  lng: 'he',
  fallbackLng: 'en'
});
```

#### 5.2 ChatBot Hebrew Support
```javascript
// packages/ui/src/components/ChatBot/ChatBot.jsx
const HEBREW_EXAMPLES = [
  "מצא אחות בשם שרה",
  "אני צריך אחות לטיפול בפצע",
  "איזו אחות זמינה בתל אביב?"
];
```

## Implementation Commands

### Step 1: Copy files to project
```bash
cp /mnt/user-data/uploads/*.xlsx ~/wonder/data/nurse_data.xlsx
cp /mnt/user-data/uploads/*.json ~/wonder/packages/ui/src/i18n/locales/
```

### Step 2: Install dependencies
```bash
cd ~/wonder
npm install xlsx i18next react-i18next
npm install --save-dev @types/i18next
```

### Step 3: Create data processor
```bash
touch ~/wonder/scripts/processNurseData.js
touch ~/wonder/packages/shared-utils/hebrewUtils.js
```

### Step 4: Update environment
```bash
echo "DEFAULT_LANGUAGE=he" >> .env.local
echo "ENABLE_HEBREW_SEARCH=true" >> .env.local
```

## Database Seeding Script

```javascript
// scripts/seedNurseData.js
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

async function processNurseData() {
  // Read Excel
  const workbook = xlsx.readFile('./data/nurse_data.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const nurses = xlsx.utils.sheet_to_json(sheet);
  
  // Process each nurse
  const processedNurses = nurses.map(nurse => ({
    ...nurse,
    displayName: `${nurse.first_name} ${nurse.last_name}`,
    searchableText: `${nurse.first_name} ${nurse.last_name}`.toLowerCase(),
    language: detectLanguage(nurse.first_name)
  }));
  
  // Save to JSON
  fs.writeFileSync(
    './data/nurses_processed.json',
    JSON.stringify(processedNurses, null, 2)
  );
  
  return processedNurses;
}

function detectLanguage(text) {
  if (/[\u0590-\u05FF]/.test(text)) return 'HE';
  if (/[\u0400-\u04FF]/.test(text)) return 'RU';
  return 'EN';
}
```

## Testing Strategy

### Unit Tests
```javascript
// tests/hebrew-search.test.js
describe('Hebrew Nurse Search', () => {
  test('finds nurse by Hebrew name', async () => {
    const result = await searchNurse('אסתר');
    expect(result[0].firstName).toBe('אסתר');
  });
  
  test('handles partial Hebrew names', async () => {
    const result = await searchNurse('אלג');
    expect(result).toContainEqual(
      expect.objectContaining({ lastName: 'אלגרבלי' })
    );
  });
});
```

### Integration Tests
```javascript
// tests/e2e/hebrew-chat.test.js
describe('Hebrew ChatBot Integration', () => {
  test('processes Hebrew nurse request', async () => {
    const response = await chatBot.process('מצא אחות בשם אסתר אלגרבלי');
    expect(response).toContain('אסתר אלגרבלי');
  });
});
```

## Performance Considerations

1. **Indexing**: Create Hebrew-optimized indexes
2. **Caching**: Cache nurse name mappings in Redis
3. **Search**: Use Elasticsearch for Hebrew full-text search
4. **Loading**: Lazy-load translations

## Security Notes

- Sanitize Hebrew input to prevent XSS
- Validate nurse IDs remain UUIDs internally
- Audit log name-based searches for HIPAA compliance

## Rollback Plan

1. Keep original ID-based search as fallback
2. Feature flag: `ENABLE_NAME_SEARCH`
3. Database backup before migration
4. Parallel run both systems for 1 week

## Success Metrics

- Hebrew query success rate > 95%
- Name search latency < 100ms
- Zero nurse misidentification errors
- User satisfaction increase by 30%

## Timeline

- **Day 1**: Data processing & database update
- **Day 2**: API modifications
- **Day 3**: Frontend integration
- **Day 4**: Testing & debugging
- **Day 5**: Production deployment

## Next Steps

1. Run data processor script
2. Update database schema
3. Deploy API changes
4. Test with Hebrew queries
5. Monitor performance
