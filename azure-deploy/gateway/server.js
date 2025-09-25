#!/usr/bin/env node

/**
 * Azure App Service Gateway Startup
 */

const path = require('path');
const fs = require('fs');

// Set working directory
const gatewayPath = path.join(__dirname, 'packages', 'gateway');
if (fs.existsSync(gatewayPath)) {
  process.chdir(gatewayPath);
}

// Load environment variables
require('dotenv').config();

// Import and start the actual server
try {
  console.log('Starting Wonder Healthcare Gateway...');
  console.log('Working directory:', process.cwd());
  console.log('Port:', process.env.PORT || 5050);
  
  require('./packages/gateway/src/server.js');
} catch (error) {
  console.error('Failed to start gateway:', error);
  
  // Fallback: try direct path
  try {
    require(path.join(__dirname, 'packages', 'gateway', 'src', 'server.js'));
  } catch (fallbackError) {
    console.error('Fallback also failed:', fallbackError);
    process.exit(1);
  }
}