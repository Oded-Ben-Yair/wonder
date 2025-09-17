# Wonder Healthcare Platform

A modern healthcare platform for connecting patients with nurses, featuring natural language processing and intelligent matching.

## Live Demo
- **Application**: https://delightful-water-0728cae03.1.azurestaticapps.net
- **API Endpoint**: https://wonder-engine-web.azurewebsites.net
- **Data**: 371 active nurses from QuickList (7,914 records)

## Features
- 🔍 Natural language search (e.g., "Find wound care nurses in Tel Aviv")
- 🏥 Real nurse specializations from QuickList database
- 🗺️ City-based filtering with intelligent mapping
- ⚡ Fast response times (< 500ms)
- 🌐 Fully deployed on Azure

## Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Start backend (MUST use port 5050)
cd packages/gateway && PORT=5050 npm start

# Start frontend (separate terminal)
cd packages/ui && npm run dev
```

### Testing
```bash
# Test natural language queries
curl -X POST http://localhost:5050/match \
  -H "Content-Type: application/json" \
  -d '{"city":"Tel Aviv","servicesQuery":["WOUND_CARE"],"topK":5}'
```

## Supported Specializations
- Wound Care & Treatment
- Catheter Treatment & Insertion
- Medication Management
- Blood Tests
- Stoma Treatment
- Circumcision Care
- Home/Hospital Security
- Breastfeeding Consultation
- Post-Surgery Care
- And many more...

## Natural Language Examples
- "Find nurses for wound care in Tel Aviv"
- "I need a catheter specialist"
- "Show me nurses who do blood tests"
- "Find medication nurses in Jerusalem"
- "Who can help with circumcision?"
- "I need urgent wound care"

## QuickList Integration
See [QUICKLIST_INTEGRATION.md](./QUICKLIST_INTEGRATION.md) for connecting directly to QuickList database/API.

## Project Structure
```
wonder/
├── packages/
│   ├── gateway/         # Central API gateway (port 5050)
│   ├── ui/              # React frontend
│   └── engine-basic/    # Matching engine
├── gateway-simple/      # Simplified Azure deployment
├── CLAUDE.md           # AI assistant instructions
└── QUICKLIST_INTEGRATION.md  # Database integration guide
```

## Azure Deployment
- Frontend: Azure Static Web Apps
- Backend: Azure App Service
- Region: Sweden Central / West Europe

## Development Notes
- Backend MUST run on port 5050
- CSV data in `packages/gateway/src/data/nurses.csv`
- City names mapped (e.g., "Haifa" → "Hefa")
- All nurses filtered for `is_active=1` and `is_approved=1`

## Support
For issues or questions about QuickList integration, refer to the documentation or deployment logs.