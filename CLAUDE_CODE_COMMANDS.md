# Claude Code Commands for Nurse Data & Hebrew Integration
# Execute these commands in Claude Code with MCP servers active

## 🚀 Quick Start Commands for Claude Code

### 1. Initial Setup (Copy & Paste to Claude Code)
```bash
# Navigate to project
cd ~/wonder

# Create necessary directories
mkdir -p data scripts packages/ui/src/i18n/locales packages/shared-utils

# Copy uploaded files to project
cp /mnt/user-data/uploads/data-17588841641121111.xlsx ./data/nurse_data.xlsx
cp /mnt/user-data/uploads/he.json ./packages/ui/src/i18n/locales/he.json
cp /mnt/user-data/uploads/en.json ./packages/ui/src/i18n/locales/en.json

# Install required packages
npm install xlsx i18next react-i18next --save
npm install @types/i18next --save-dev
```

### 2. Copy Integration Script (Tell Claude Code)
Say: "Copy the integrate_nurse_data.js from /mnt/user-data/outputs/ to ~/wonder/scripts/ and make it executable"

### 3. Process Nurse Data (Tell Claude Code)
Say: "Run the nurse data integration script with node scripts/integrate_nurse_data.js and show me the results"

### 4. Create Hebrew Utils Module (Ask Claude Code)
Say: "Create a Hebrew utilities module at packages/shared-utils/hebrewUtils.js with these functions: detectHebrewText, normalizeHebrewSearch, removeNikud, and hebrewFuzzyMatch"

### 5. Update Gateway for Hebrew Support (Ask Claude Code)
Say: "Update packages/gateway/server.js to support Hebrew queries by:
1. Adding Hebrew detection middleware
2. Converting nurse IDs to names in responses
3. Supporting Hebrew in search parameters
Use the nurse data from data/nurses_enhanced.json"

### 6. Create Hebrew Query Processor (Ask Claude Code)
Say: "Create packages/gateway/hebrewQueryProcessor.js that:
1. Detects Hebrew in queries
2. Maps nurse names to IDs using data/nurse_search_index.json
3. Handles partial Hebrew name matching
4. Returns results with full Hebrew names"

### 7. Update ChatBot Component (Ask Claude Code)
Say: "Update packages/ui/src/components/ChatBot.jsx to:
1. Import Hebrew translations from i18n/locales/he.json
2. Add Hebrew example queries
3. Display nurse names instead of IDs
4. Set default language to Hebrew"

### 8. Create Database Migration (Ask Claude Code)
Say: "Execute the SQL script at scripts/updateDatabase.sql against the PostgreSQL database to add Hebrew search columns and indexes"

### 9. Update Environment Variables (Ask Claude Code)
Say: "Add these environment variables to .env and .env.local:
DEFAULT_LANGUAGE=he
ENABLE_HEBREW_SEARCH=true
NURSE_DISPLAY_MODE=name
FUZZY_MATCH_THRESHOLD=0.7"

### 10. Test Hebrew Integration (Ask Claude Code)
Say: "Create and run a test file tests/hebrewIntegration.test.js that:
1. Tests searching for 'אסתר אלגרבלי'
2. Tests partial name search 'אסת'
3. Tests Russian name search
4. Verifies all 3,184 nurses are searchable"

## 📝 Advanced Commands for Specific Tasks

### Load and Analyze Nurse Data
```javascript
// Ask Claude Code to execute this
const xlsx = require('xlsx');
const wb = xlsx.readFile('./data/nurse_data.xlsx');
const nurses = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

// Analyze language distribution
const stats = nurses.reduce((acc, nurse) => {
  const lang = /[\u0590-\u05FF]/.test(nurse.first_name) ? 'Hebrew' :
                /[\u0400-\u04FF]/.test(nurse.first_name) ? 'Russian' : 'Other';
  acc[lang] = (acc[lang] || 0) + 1;
  return acc;
}, {});

console.log('Nurse Language Distribution:', stats);
console.log('Sample Hebrew nurses:', 
  nurses.filter(n => /[\u0590-\u05FF]/.test(n.first_name)).slice(0, 5)
);
```

### Update Matching Engines
```bash
# Ask Claude Code:
"Update all three matching engines to support Hebrew nurse names:
1. packages/engine-basic - exact Hebrew matching
2. packages/engine-fuzzy - Hebrew fuzzy matching with nikud removal
3. packages/engine-azure-gpt - add Hebrew context to GPT prompts"
```

### Create Hebrew Search API
```bash
# Ask Claude Code:
"Create a new API endpoint POST /api/nurses/search/hebrew that:
- Accepts Hebrew text queries
- Returns nurses with Hebrew names
- Supports partial matching
- Returns results sorted by relevance"
```

### Generate Test Data
```bash
# Ask Claude Code:
"Generate test queries in Hebrew for the 10 most common nurse names and create a test suite that validates each query returns the correct nurse"
```

## 🔧 Troubleshooting Commands

### If Hebrew text appears as ???
```bash
# Ask Claude Code:
"Fix Hebrew encoding issues by:
1. Setting all files to UTF-8
2. Adding charset=utf-8 to all HTTP responses
3. Updating database connection to use UTF8MB4"
```

### If search is slow
```bash
# Ask Claude Code:
"Optimize Hebrew search by:
1. Creating a Redis cache for nurse names
2. Adding PostgreSQL GIN indexes
3. Implementing Elasticsearch for Hebrew full-text search"
```

### If names don't match
```bash
# Ask Claude Code:
"Debug name matching by:
1. Logging all search queries and results
2. Creating a name variation mapping table
3. Adding fuzzy matching with Levenshtein distance"
```

## 🎯 Validation Checklist

After running all commands, ask Claude Code to verify:

1. ✅ All 3,184 nurses are in the database with display_name
2. ✅ Hebrew queries return Hebrew-named nurses
3. ✅ UI shows nurse names not IDs
4. ✅ ChatBot accepts Hebrew input
5. ✅ Search works for partial Hebrew names
6. ✅ API returns UTF-8 encoded Hebrew properly
7. ✅ Database has Hebrew search indexes
8. ✅ No performance degradation (<100ms searches)

## 💡 Pro Tips for Claude Code

1. Use context7 MCP: Say "use context7" when asking about i18next or Hebrew text handling
2. Use sequential-thinking MCP: For complex integration decisions
3. Use filesystem MCP: To verify all files are in place
4. Use postgres MCP: To check database updates directly

## 🚨 Important Notes

- Always backup database before running SQL scripts
- Test with a subset of nurses first (e.g., first 100)
- Monitor memory usage when processing all 3,184 records
- Keep original nurse IDs for internal references
- Display names are for UI only, not for database keys

## 📋 Sample Hebrew Queries to Test

After integration, test these in the ChatBot:
1. "מצא אחות בשם אסתר"
2. "אני צריך אחות לטיפול בפצע בתל אביב"
3. "אילו אחיות מדברות רוסית?"
4. "האם יש אחות בשם שרה כהן?"
5. "אחיות עם התמחות בסוכרת"
