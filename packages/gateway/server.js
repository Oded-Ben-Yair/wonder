#!/usr/bin/env node

// Direct import of the ES module server for Azure App Service
// This file must be treated as an ES module
import('./src/server.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});