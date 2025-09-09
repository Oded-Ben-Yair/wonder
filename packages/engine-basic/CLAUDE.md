# CLAUDE.md - Basic Filter Engine

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL FIXES APPLIED

### City Filtering Fix (basic.js:152-171)
**Problem**: Nurses have `city: "Tel Aviv-Yafo"` but queries search for `"Tel Aviv"`
**Solution**: Flexible substring matching that checks:
1. Direct city field match with includes()
2. Municipality array (backwards compatibility)
3. _originalMunicipalities field if present

### Service Filtering Fix (basic.js:173-185)
**Problem**: Gateway sends `servicesQuery` array but some data has `specialization` field
**Solution**: Check both `services` array and `specialization` field for matches

### Enhanced Service Mappings (basic.js:49-67)
**Added**: Support for Pediatrics, Day Night, Home Care services:
- Maps "Day Night" to "circumcision_nurse" specializations
- Maps "Pediatrics" to pediatric-related services
- Maps "Home Care" to home-based nursing services

## Commands

- **Run server**: `npm start` - Starts the Express server on port 5001 (or PORT env variable)
- **Install dependencies**: `npm install`
- **Setup environment**: `cp .env.example .env`

## Architecture

This is a Node.js/Express API service that filters and matches nurses based on query criteria. Key components:

- **Entry point**: `src/index.js` - Express server with `/match` POST endpoint and `/health` GET endpoint
- **Matching logic**: `src/lib/basic.js` - Core filtering algorithm that:
  - Filters nurses by city, service type, availability, and distance
  - Sorts results by rating, review count, and distance
  - Returns top K matches with metadata
- **Geo calculations**: `src/lib/geo.js` - Haversine formula distance calculation between coordinates
- **Time utilities**: `src/lib/time.js` - Calculates availability overlap ratio for scheduling
- **Sample data**: `sample_data/nurses.json` - JSON array of nurse objects with services, availability, location, and ratings

## 🚀 Azure Deployment

This engine is designed to run within the Azure Container Apps environment as part of the main gateway service. It operates as a library imported by the gateway, not as a standalone service in production.

### Production Integration
- Imported by gateway through `adapter.js` interface
- Uses live PostgreSQL data instead of JSON files
- Inherits Azure monitoring and logging from gateway
- Scales automatically with gateway container

## API Usage

The main endpoint `POST /match` accepts:
- `city`: Filter by city name
- `service`: Filter by service type
- `start`/`end`: ISO datetime strings for availability window
- `lat`/`lng`: Coordinates for distance filtering
- `radiusKm`: Maximum distance (default: 25km)
- `topK`: Number of results to return (default: 3)

Returns filtered and sorted nurse matches with reason and metadata.