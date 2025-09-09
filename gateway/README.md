# Gateway Service

Multi-engine adapter gateway for nurse matching services.

## Quick Start

```bash
# Install dependencies (from root)
npm install

# Start gateway
cd gateway
npm start

# Or use the dev script (from root)
./scripts/dev.sh
```

## Access Points

- **Gateway API**: http://localhost:5050
- **CEO Playground**: http://localhost:5050/ceo-playground.html

## API Endpoints

### GET /health
Health check endpoint showing gateway and engine status.

### GET /engines
List all available engines with their health status.

### POST /match
Match nurses based on query criteria.

**Request Body:**
```json
{
  "city": "Tel Aviv",
  "servicesQuery": ["General Care"],
  "expertiseQuery": ["emergency"],
  "urgent": false,
  "topK": 5,
  "engine": "engine-azure-gpt5"
}
```

## Environment Variables

Create `.env` file:
```
PORT=5050
```

Engine-specific variables should be in each engine's `.env` file.

## Testing

```bash
# Quick probe
./scripts/probe.sh

# Full smoke test
./scripts/csv-smoke.sh
```