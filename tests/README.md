# Wonder Care - Playwright Test Suite

## Overview
Comprehensive end-to-end testing for the Wonder Care nurse matching engine using Playwright with Microsoft Edge browser.

## Test Suites

### 1. Core Matching (e2e/nurse-matching.spec.ts)
Tests the fundamental nurse matching functionality.

### 2. Score Transparency (e2e/scoring-display.spec.ts)
Validates transparent scoring system with all 5 factors.

### 3. Mobile Responsive (e2e/mobile-responsive.spec.ts)
Tests mobile device compatibility.

## Running Tests

```bash
# Install Edge browser
npx playwright install msedge

# Run all tests
npx playwright test --project="Microsoft Edge"

# Generate report
npx playwright show-report
```

## Screenshots
All test screenshots saved to: test-results/edge-screenshots/
