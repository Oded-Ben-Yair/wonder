# Wonder Testing Suite

## Overview
Production-grade testing infrastructure for the Wonder healthcare matching platform with two-agent orchestration and screenshot-based validation.

## Two-Agent Testing System

### Architecture
- **TestRunnerAgent**: Executes tests sequentially, captures screenshots for validation
- **FixerValidatorAgent**: Analyzes failures, applies fixes, validates solutions

### Workflow
1. TestRunner executes test with Playwright/Edge
2. On error: stops immediately, passes to Fixer
3. Fixer analyzes error and screenshot, applies fix
4. Fixer validates fix works
5. TestRunner continues from next test

## Running Tests

### Two-Agent Orchestrated Tests
```bash
cd tests
node two-agent-orchestrated-tests.js
```

### Playwright-Based Tests
```bash
node playwright-orchestrated-tests.js
```

### Simple Integration Tests
```bash
node orchestrated-testing-system.js
```

## Test Coverage

### ✅ Passing Tests
- Basic availability queries (Tel Aviv)
- Hebrew language queries ("מי זמין היום בתל אביב?")
- Time-based queries ("today at 3pm")
- Service-specific queries ("wound care")
- Multiple city queries (Haifa, Beer Sheba)

### ❌ Known Failures
- Jerusalem queries (no nurses with Jerusalem in CSV data)

## Test Scenarios

### Chatbot Natural Language Tests
1. **English Queries**
   - "Who's available today at 3pm in Tel Aviv?"
   - "Find nurses for wound care in Haifa"
   - "Show me available nurses in Beer Sheba"

2. **Hebrew Queries**
   - "מי זמין היום בתל אביב?"
   - "חפש אחיות לטיפול בפצעים בחיפה"

3. **Time-Based Queries**
   - "Who's available now?"
   - "Find someone for tomorrow morning"
   - "Need a nurse this evening"

### Direct API Tests
- City filtering
- Service matching
- Availability windows
- Distance calculations
- Result ranking

## Prerequisites

### Required Services
1. Gateway running on port 5050
2. UI dev server on port 3000
3. Basic engine on port 5001

### Start Services
```bash
# Terminal 1 - Gateway
cd packages/gateway && PORT=5050 npm start

# Terminal 2 - UI
cd packages/ui && npm run dev

# Terminal 3 - Basic Engine
cd packages/engine-basic && npm start
```

## File Structure
```
tests/
├── two-agent-orchestrated-tests.js    # Main two-agent system
├── playwright-orchestrated-tests.js   # Playwright integration
├── orchestrated-testing-system.js     # Simple test runner
├── screenshots/                       # Test screenshots (gitignored)
├── reports/                          # Test reports (gitignored)
└── .gitignore                        # Excludes artifacts
```

## Debugging Failed Tests

### Common Issues
1. **500 Errors**: Check field mapping in api.ts
2. **No Results**: Verify city names match data
3. **Port Issues**: Ensure gateway runs on 5050
4. **Proxy Errors**: Check vite.config.ts proxy settings

### Debug Commands
```bash
# Check services are running
curl http://localhost:5050/health
curl http://localhost:3000

# Test basic engine directly
curl -X POST http://localhost:5001/match \
  -H "Content-Type: application/json" \
  -d '{"city": "Tel Aviv", "topK": 5}'

# Check gateway logs
cd packages/gateway && npm start
```

## Adding New Tests

### Test Structure
```javascript
{
  name: "Test name",
  query: "Natural language query",
  validate: async (page) => {
    // Check for expected results
    const hasResults = await page.locator('.result').count() > 0;
    if (!hasResults) throw new Error("No results found");
  }
}
```

### Best Practices
1. Always capture screenshots on failure
2. Use specific error messages
3. Test both positive and negative cases
4. Include edge cases and error scenarios
5. Validate UI state, not just API responses

## Future Improvements
- Add Jerusalem test data to CSV
- Implement fuzzy matching for services
- Add performance benchmarks
- Create visual regression tests
- Add load testing scenarios
- Implement CI/CD integration