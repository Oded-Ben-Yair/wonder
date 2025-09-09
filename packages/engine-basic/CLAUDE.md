# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## API Usage

The main endpoint `POST /match` accepts:
- `city`: Filter by city name
- `service`: Filter by service type
- `start`/`end`: ISO datetime strings for availability window
- `lat`/`lng`: Coordinates for distance filtering
- `radiusKm`: Maximum distance (default: 25km)
- `topK`: Number of results to return (default: 3)

Returns filtered and sorted nurse matches with reason and metadata.