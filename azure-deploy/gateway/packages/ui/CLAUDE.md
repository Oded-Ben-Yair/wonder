# CLAUDE.md - UI Package

This file provides guidance to Claude Code when working with the UI package.

## ⚠️ CRITICAL CONFIGURATION

### Vite Proxy Configuration (vite.config.ts:16)
**MUST** proxy to port 5050:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5050', // NOT 5000!
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, '')
  }
}
```

### API Query Transformation (src/utils/api.ts:57-75)
**Problem**: UI sends `StructuredQuery` but gateway expects different format
**Solution**: Transform before sending:
```javascript
const gatewayQuery = {
  city: query.municipality || 'Tel Aviv', // Gateway expects 'city'
  servicesQuery: query.specializations || [],
  expertiseQuery: query.specializations || [],
  urgent: query.isUrgent || false,
  topK: query.limit || 5,
};
const selectedEngine = engine || 'engine-basic'; // Use stable engine
```

## Commands

- **Start dev server**: `npm run dev` - Runs on http://localhost:3000
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Type check**: `npm run type-check`

## Architecture

### Core Components
- **App.tsx**: Main app with tabs (Chat, Match Tester, Comparison, Compare All)
- **ChatInterface.tsx**: Natural language chatbot UI
- **MatchTester.tsx**: Direct query testing interface
- **EngineComparison.tsx**: Compare results across engines
- **CompareAllEngines.tsx**: Batch comparison tool

### API Utils (src/utils/api.ts)
- `executeMatch()`: Main function for querying engines
- `getEngines()`: Fetch available engines
- `compareEngines()`: Compare multiple engines
- `batchExecute()`: Batch query execution

### Types (src/types/index.ts)
- `StructuredQuery`: UI query format
- `MatchResponse`: Engine response format
- `Engine`: Engine metadata

## Testing the UI

1. Start the gateway: `cd packages/gateway && PORT=5050 npm start`
2. Start the UI: `cd packages/ui && npm run dev`
3. Open http://localhost:3000
4. Test chatbot with queries like:
   - "Who's available today at 3pm in Tel Aviv?"
   - "מי זמין היום בתל אביב?" (Hebrew)
   - "Find nurses for wound care in Haifa"

## Known Issues
- Jerusalem queries return no results (no data in CSV)
- Azure GPT engine often fails (API issues)
- Fuzzy engine returns inconsistent results

## Files
- `src/App.tsx`: Main application
- `src/components/`: UI components
- `src/utils/api.ts`: API client with critical transforms
- `src/types/`: TypeScript definitions
- `vite.config.ts`: Vite configuration with proxy settings