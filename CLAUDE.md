# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
USE_DB=false  # Set true for PostgreSQL instead of JSON
DATABASE_URL=<postgres-connection-string>
```

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

#### Fixed Issues
- **Field Mapping**: Frontend `municipality` → gateway `city` (api.ts:57)
- **Service Arrays**: `specializations` → `servicesQuery`/`expertiseQuery` (api.ts)
- **City Matching**: "Tel Aviv-Yafo" matches "Tel Aviv" (basic.js:152-171)
- **Service Filtering**: Handles both array and string formats (basic.js:173-185)
- **topK Validation**: Increased max from 10 to 100 (server.js:233)

#### Current Limitations
- Jerusalem queries return no results (no data in production dataset)
- Azure GPT engine may fail due to API rate limits
- Fuzzy engine can return inconsistent results for complex queries