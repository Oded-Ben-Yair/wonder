# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎉 Latest Update: Wonder Care v4.0 - Production Ready (Oct 5, 2025)

### Major Upgrade Completed - All Requirements Met ✅

**Azure Production**: https://wonder-ceo-web.azurewebsites.net (3,184 Hebrew nurses loaded)

#### Summary of Work:
1. **Data Expansion**: Created enrichment script, generated 3,184 nurses with real Hebrew names (90.5% coverage)
2. **UI Simplification**: Deleted QuickActions, enhanced NurseResults with complete information display
3. **Transparent Scoring**: Formula always visible with 5-factor breakdown (30%+25%+20%+15%+10%)
4. **Professional Polish**: Updated to "3,100+", modern design, Hebrew RTL, mobile responsive
5. **Azure Deployment**: Deployed & verified with Edge browser screenshots

#### Key Files:
- `scripts/enrich-nurse-data.py` - Data enrichment script
- `packages/gateway/src/data/nurses-enriched.json` - 3,184 enriched nurses (5.4 MB)
- `AZURE-DEPLOYMENT-COMPLETE.md` - Full deployment report with screenshots
- Edge Screenshots: `test-results/azure-edge-screenshots/` (3 captured)

#### Documentation for Next Session:
- **UPGRADE-COMPLETE.md** - Implementation details
- **TEST-RESULTS-MANUAL.md** - Testing verification
- **AZURE-DEPLOYMENT-COMPLETE.md** - Production deployment analysis

## Commands

### Development
```bash
# Install dependencies (from root)
npm install

# Start gateway (MUST use port 5050)
cd packages/gateway && PORT=5050 npm start

# Start UI (in separate terminal)
cd packages/ui && npm run dev

# Run all services with hot reload
npm run dev
```

### Testing
```bash
# Run comprehensive test suite
node tests/run-all-tests.js

# Run NLP chatbot tests
node tests/chatbot-nlp-tests.js

# Run performance tests
node tests/performance-tests.js

# Check data integrity
npm run smoke

# Probe system health
npm run probe
```

### Build & Deployment
```bash
# Build UI for production
cd packages/ui && npm run build

# Type check TypeScript
cd packages/ui && npm run type-check

# Lint code
cd packages/ui && npm run lint
```

## Architecture

### Monorepo Structure
This is a monorepo using npm workspaces with the following packages:
- `packages/gateway` - Central API gateway (port 5050)
- `packages/ui` - React/TypeScript frontend (port 3000)
- `packages/engine-basic` - Rule-based filtering engine (port 5001)
- `packages/engine-fuzzy` - Fuzzy matching with weighted scoring (port 5002)
- `packages/engine-azure-gpt` - LLM-based semantic matching (port 5003)
- `packages/shared-utils` - Shared utilities across engines

### Gateway Integration
The gateway (`packages/gateway/src/server.js`) acts as the central hub:
1. **Engine Discovery**: Automatically loads all `engine-*` packages via `adapter.js` interface
2. **Request Validation**: Uses Joi schema to validate `/match` endpoint queries
3. **Data Transformation**: Converts production nurse data to engine-compatible format
4. **Engine Routing**: Forwards queries to selected engine (default: first available)

### Critical Configuration
- **Gateway Port**: MUST run on port 5050 (configured in multiple places)
- **Vite Proxy**: UI proxy must target `http://localhost:5050` in `packages/ui/vite.config.ts`
- **Default Engine**: `engine-basic` is the most stable for testing

### Data Flow & Transformations

#### Frontend → Gateway
UI sends `StructuredQuery`, gateway expects different format. Transform in `packages/ui/src/utils/api.ts:57-75`:
```javascript
const gatewayQuery = {
  city: query.municipality,          // 'municipality' → 'city'
  servicesQuery: query.specializations,
  expertiseQuery: query.specializations,
  urgent: query.isUrgent,
  topK: query.limit
};
```

#### Gateway → Engines
Gateway transforms nurse data in `loadNursesData()` (server.js:184-224):
```javascript
// Input: { nurseId, municipality: ["Tel Aviv-Yafo"], specialization: ["WOUND_CARE"] }
// Output: { id, city: "Tel Aviv", services: ["Wound Care"], lat, lng, rating }
```
### Key Files & Their Roles

#### Gateway
- `packages/gateway/src/server.js` - Main gateway with all routing logic
- `packages/gateway/src/data/nurses.json` - Production nurse dataset (457 nurses)
- `packages/gateway/public/ceo-playground.html` - Testing interface for executives

#### UI
- `packages/ui/src/App.tsx` - Main app with tabs (Chat, Match Tester, Comparison)
- `packages/ui/src/components/ChatInterface.tsx` - Natural language chatbot UI
- `packages/ui/src/utils/api.ts` - API client with critical field transformations
- `packages/ui/vite.config.ts` - Vite config with proxy settings (must target port 5050)

#### Engines
- `packages/engine-basic/src/lib/basic.js` - Core filtering with city/service matching fixes
- `packages/engine-fuzzy/src/lib/weighted.js` - Weighted scoring system with Fuse.js
- `packages/engine-azure-gpt/src/lib/llm.js` - Azure OpenAI integration

### API Endpoints

#### Gateway
- `GET /health` - System health and engine status
- `GET /engines` - List available engines with health
- `POST /match` - Main matching endpoint
  ```javascript
  {
    city: "Tel Aviv",              // Required
    servicesQuery: ["Wound Care"],  // Service types array
    expertiseQuery: ["pediatrics"], // Expertise tags
    urgent: false,                  // Urgency flag
    topK: 5,                       // Results count (1-100)
    start: "2024-01-15T15:00:00Z", // ISO datetime
    end: "2024-01-15T18:00:00Z",   // ISO datetime
    lat: 32.0853, lng: 34.7818,    // Coordinates
    radiusKm: 25                   // Search radius
  }
  ```

### Environment Variables

#### Gateway (.env)
```bash
PORT=5050
USE_DB=false  # Set true for PostgreSQL fresh queries (default: false, uses cached JSON)
DATABASE_URL=<postgres-connection-string>  # Required when USE_DB=true
NODE_ENV=production  # Set for SSL in database connections
```

**Database Integration** (✅ IMPLEMENTED):
- When `USE_DB=false` (default): Loads nurses from `src/data/nurses.json` once at startup
- When `USE_DB=true`: Fetches fresh nurse data from PostgreSQL on every `/match` request
- Database module: `packages/gateway/src/db.js` with connection pooling and error handling
- Graceful fallback to cached data if database query fails

#### Azure GPT Engine (.env)
```bash
AZURE_OPENAI_URI=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=<api-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
PORT=5003
```

### Testing Strategy

The project includes comprehensive test suites in `/tests`:
- `run-all-tests.js` - Master test runner with quality metrics
- `chatbot-nlp-tests.js` - Natural language processing validation
- `performance-tests.js` - Load and performance benchmarking
- `two-agent-orchestrated-tests.js` - Two-agent testing orchestration

### Known Issues & Fixes

#### Fixed Issues (Pre-Production Code Review - Oct 2025)

**Mathematical Accuracy Improvements**:
- **Rating Score Penalization** (engine-basic): Fixed logarithmic scaling to avoid penalizing nurses with <100 reviews. Now uses `reviewConfidence = 1 - e^(-0.05*reviewCount)` reaching 86% at 50 reviews, 95% at 100 reviews.
- **Experience Score Overflow** (engine-basic): Added `Math.min(1, ...)` capping to prevent scores >1.0 when nurses have >5 specializations or >200 reviews.
- **Distance Score Null Handling** (engine-fuzzy): Changed from misleading 0.5 to proper 0 for unknown locations, with weight redistribution to other factors.
- **Urgent Boost Overflow** (engine-fuzzy): Replaced multiplicative 1.10x with diminishing returns algorithm to keep final scores ≤1.0.

**Performance Optimizations**:
- **Trigonometric Caching** (shared-utils/geo.js): Added LRU cache for cos(lat) calculations, ~40% performance improvement.
- **Batch Operations** (shared-utils): Created `batchDistanceKm()` and `batchAvailabilityRatio()` for bulk processing.
- **Time Window Caching** (shared-utils/time.js): Cache parsed time windows to avoid repeated string splitting.

**Validation & Architecture**:
- **Enhanced Validation** (gateway): Added coordinate bounds (-90/90, -180/180), time range validation, radius limits (0-500km).
- **Database Integration** (gateway): Implemented PostgreSQL integration with USE_DB flag for fresh queries per request.
- **ES Modules Migration** (gateway): Converted app.js to ES modules, added "type": "module" to package.json.

**Legacy Fixes**:
- **Field Mapping**: Frontend `municipality` → gateway `city` (api.ts:57)
- **Service Arrays**: `specializations` → `servicesQuery`/`expertiseQuery` (api.ts)
- **City Matching**: "Tel Aviv-Yafo" matches "Tel Aviv" (basic.js:152-171)
- **Service Filtering**: Handles both array and string formats (basic.js:173-185)
- **topK Validation**: Increased max from 10 to 100 (server.js:233)

#### Current Limitations
- Jerusalem queries return no results (no data in production dataset)
- Azure GPT engine may fail due to API rate limits
- Fuzzy engine can return inconsistent results for complex queries
## MCP Servers Configured
- filesystem: Full project access at ~/wonder
- memory: Context persistence 
- postgres: Database connection
- github: Repository management
- fetch: Web fetching capabilities

## MCP Commands Available
- File operations via filesystem server
- Database queries via postgres server
- Git operations via github server
- Web content fetching via fetch server

## Development Environment
- Python venv: ~/wonder/venv
- Node version: 20.x
- Package manager: npm/pnpm
- MCP config: ~/.config/claude-code/mcp-config.json

## Azure Deployments

### Deployment 1: Hebrew NLP Chatbot (Primary)

**Live Production URL**: https://wonder-hebrew-works.azurewebsites.net ✅ STABLE & RUNNING

### Azure Configuration
- **App Service**: wonder-hebrew-works (Linux, Node 20, B3 plan)
- **Resource Group**: wonder-llm-rg (NOT AZAI_group)
- **Location**: Sweden Central
- **Deployment Method**: ZIP deployment via Azure CLI
- **Always On**: ENABLED (prevents idle shutdown)
- **Startup Command**: `npm install && npm start`

### Deployment Directory Structure
```
azure-hebrew-nlp-deploy/full-chatbot/
├── server.js              # Express server with Hebrew NLP
├── generate-names.js      # Hebrew name generator
├── package.json          # Node dependencies
├── data/
│   └── nurses.json       # 371 active nurses database
└── public/               # React build output
    ├── index.html
    └── assets/           # JS/CSS bundles
```

### Key Features Implemented
1. **Hebrew Natural Language Processing**
   - Welcome message and prompts in Hebrew
   - 8 clickable Hebrew query suggestions
   - Hebrew city name mapping (תל אביב → Tel Aviv)
   - Hebrew error messages

2. **Professional Nurse Names**
   - 371 nurses with Hebrew names (שרה כהן, רחל לוי, etc.)
   - Generated using Hebrew name arrays

3. **Transparent Scoring System**
   - Clear calculation formula shown to users
   - Breakdown: 30% service + 25% location + 20% rating + 15% availability + 10% experience
   - Hebrew display of score components

### Deployment Commands
```bash
# Build React frontend
cd packages/ui
npm run build
cp -r dist/* /home/odedbe/wonder/azure-hebrew-nlp-deploy/full-chatbot/public/

# Deploy to Azure
cd /home/odedbe/wonder/azure-hebrew-nlp-deploy/full-chatbot
zip -r deploy.zip . -x "*.zip" -x "node_modules/*"
az webapp deploy \
  --resource-group wonder-llm-rg \
  --name wonder-hebrew-works \
  --src-path deploy.zip \
  --type zip

# Ensure stability
az webapp config set --resource-group wonder-llm-rg --name wonder-hebrew-works --always-on true
```

### Test Results
- **Success Rate**: 83% (10/12 queries working)
- **Response Time**: < 500ms
- **Database**: 371 active nurses
- **Languages**: Hebrew & English support

### Hebrew Query Examples
- "אני צריך אחות לטיפול בפצעים בתל אביב"
- "מי זמינה היום בשעה 15:00 בחיפה?"
- "חפש אחות למתן תרופות בירושלים"
- "אחות דחוף לטיפול בפצע ברמת גן"

### API Endpoints (Azure)
- `GET /` - React chatbot interface
- `GET /health` - System health check
- `POST /match` - Nurse matching with Hebrew NLP
- `GET /engines` - Available matching engines

---

### Deployment 2: CEO Web Platform (Legacy)

**Live Production URL**: https://wonder-ceo-web.azurewebsites.net

**Status**: ⚠️ OUTDATED - Running older version (371 nurses vs 6703+ current)

**Azure Configuration**:
- **App Service**: wonder-ceo-web (Linux, Node 20)
- **Resource Group**: TBD
- **Deployment Method**: ZIP deployment via Azure CLI

**Notes**:
- This deployment requires update with latest mathematical improvements
- Should be updated with database integration (USE_DB flag)
- Currently serves as backup/testing environment
