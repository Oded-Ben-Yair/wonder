# Architecture Documentation

## Overview

The Wonder gateway system provides a unified interface for multiple nurse-matching engines, allowing comparison and A/B testing of different matching algorithms.

## Components

### Gateway Service
- **Location**: `/gateway`
- **Purpose**: Central routing and orchestration
- **Port**: 5050 (default)
- **Features**:
  - Engine discovery and health monitoring
  - Request validation with Joi
  - Timing and performance metrics
  - Static file serving for CEO app

### Engines

Each engine follows the adapter contract:

#### 1. engine-azure-gpt5
- **Type**: LLM-based matching
- **Technology**: Azure OpenAI GPT-5
- **Features**: Semantic understanding, complex query handling

#### 2. engine-basic
- **Type**: Rule-based filtering
- **Technology**: Simple distance and service matching
- **Features**: Fast, deterministic results

#### 3. engine-fuzzy
- **Type**: Weighted fuzzy matching
- **Technology**: Fuse.js for string similarity
- **Features**: Configurable weights, fuzzy string matching

## Adapter Contract

All engines must export:

```javascript
// Match function
export async function match(query, allNurses, options = {}) {
  return {
    count: number,
    results: [{
      id: string,
      score: number,     // 0-1 score
      reason: string,    // Explanation
      name?: string      // Optional nurse name
    }]
  };
}

// Health check
export async function health() {
  return { 
    ok: boolean,
    engine: string,
    message?: string
  };
}

// Engine identifier
export const ENGINE_NAME = "engine-name";
```

## Request Flow

1. Client sends POST to `/match`
2. Gateway validates request with Joi schema
3. Gateway selects engine (query param > body > default)
4. Gateway calls engine adapter with timeout
5. Engine processes and returns results
6. Gateway adds metrics and returns response

## CEO Playground Features

- **Single Engine Testing**: Run individual engines
- **A/B Comparison**: Side-by-side engine comparison
- **Performance Metrics**: Latency tracking
- **State Persistence**: URL hash for sharing
- **Cost Estimation**: Token-based pricing calculator
- **Export**: JSON download of results

## Security

- API key masking in logs
- No secrets in Git (.gitignore configured)
- Environment isolation per engine
- Request size limits (10MB)

## Performance

- 95-second timeout for engine calls
- 3-second timeout for health checks
- Parallel engine execution for comparisons
- Keep-alive connections for Azure