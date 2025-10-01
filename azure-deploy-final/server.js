#!/usr/bin/env node

// Azure deployment entry point with direct imports
import('./src/server-azure-clean.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});