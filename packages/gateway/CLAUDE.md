# CLAUDE.md - Gateway Package

This file provides guidance to Claude Code when working with the Gateway package.

## ⚠️ CRITICAL CONFIGURATION

### Port Configuration
**MUST** run on port 5050:
```bash
PORT=5050 npm start
```

### topK Validation (server.js:233)
**Fixed**: Increased max limit from 10 to 100:
```javascript
topK: Joi.number().min(1).max(100).default(5)
```

## 🚀 Azure Deployment

This gateway is configured for Azure deployment using:
- **Azure Container Apps** for serverless container hosting
- **Azure Database for PostgreSQL** for live data storage
- **Key Vault** for secure credential management
- **Application Insights** for monitoring and logging

### Environment Variables
For Azure production:
```bash
NODE_ENV=production
PORT=5050
DATABASE_URL=<from-key-vault>
AZURE_OPENAI_KEY=<from-key-vault>
AZURE_OPENAI_URI=<azure-openai-endpoint>
APPLICATIONINSIGHTS_CONNECTION_STRING=<from-key-vault>
```

### Database Integration
When `USE_DB=true`, the gateway will:
1. Connect to PostgreSQL instead of JSON files
2. Query nurses table with real-time data
3. Support live availability and booking system
4. Enable audit logging for all operations

See `database/schema.sql` for complete database structure.

## Commands

- **Start server**: `PORT=5050 npm start` - Runs on port 5050
- **Install dependencies**: `npm install`
- **Setup environment**: Copy `.env.example` to `.env`

## Architecture

The Gateway acts as a central hub that:
1. **Loads Engines**: Discovers and imports all `engine-*` packages with `adapter.js`
2. **Validates Requests**: Uses Joi schema validation for `/match` endpoint
3. **Routes Queries**: Forwards validated queries to appropriate engine
4. **Transforms Data**: Loads and transforms nurse data from `data/nurses.json`
5. **Returns Results**: Standardizes engine responses

### Core Components

**Server** (`src/server.js`)
- Express server on port 5050
- CORS configuration for development origins
- Request logging with masking for sensitive data
- Engine discovery and loading system

**Data Loading** (`loadNursesData()` lines 184-224)
- Transforms production nurse data to engine-compatible format
- Maps specializations to user-friendly service names
- Generates synthetic ratings and availability for demo

**Engine Discovery** (`loadEngines()` lines 153-182)
- Scans `packages/` for `engine-*` directories
- Imports `adapter.js` with `match()` and `health()` functions
- Stores engines in Map for routing

### API Endpoints

- `GET /health` - Returns system status and engine health checks
- `GET /engines` - Lists all discovered engines with health status  
- `POST /match` - Main matching endpoint that:
  - Validates query parameters
  - Selects appropriate engine (default: first available)
  - Calls engine.match() with nurses data
  - Returns standardized response format

### Data Transformation

The gateway transforms production data format to standardized engine format:

**Input** (from nurses.json):
```javascript
{
  nurseId: "abc123",
  municipality: ["Tel Aviv-Yafo", "תל אביב"],
  specialization: ["WOUND_CARE", "MEDICATION"],
  isActive: true,
  isApproved: true
}
```

**Output** (to engines):
```javascript
{
  id: "abc123",
  city: "Tel Aviv",
  services: ["Wound Care", "Medication Management"],
  lat: 32.0853, lng: 34.7818,
  rating: 4.6, reviewsCount: 89,
  availability: { "2024-01-15": [...] }
}
```

## Query Format

The gateway expects queries in this format:
```javascript
{
  city: "Tel Aviv",           // Required: city name
  servicesQuery: ["Wound Care"], // Array of service types
  expertiseQuery: ["pediatrics"], // Array of expertise tags
  urgent: false,              // Boolean urgency flag
  topK: 5,                   // Number of results (1-100)
  start: "2024-01-15T15:00:00Z", // ISO datetime
  end: "2024-01-15T18:00:00Z",   // ISO datetime
  lat: 32.0853, lng: 34.7818,    // Coordinates
  radiusKm: 25               // Search radius
}
```

## Testing

1. **Health Check**: `curl http://localhost:5050/health`
2. **Engine List**: `curl http://localhost:5050/engines`
3. **Match Query**: 
   ```bash
   curl -X POST http://localhost:5050/match \
     -H "Content-Type: application/json" \
     -d '{"city":"Tel Aviv","topK":3}'
   ```

## Known Issues

- **Jerusalem Queries**: Return no results (no data in production dataset)
- **Engine Failures**: Azure GPT engine often fails due to API issues
- **Hebrew Support**: Partial support for Hebrew city names

## Files

- `src/server.js`: Main gateway server with all logic
- `src/util/mask.js`: Utility for masking sensitive data in logs
- `src/util/timing.js`: Performance timing utilities
- `src/data/nurses.json`: Production nurse dataset
- `public/ceo-playground.html`: CEO testing interface