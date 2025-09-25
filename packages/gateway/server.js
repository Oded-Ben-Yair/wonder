#!/usr/bin/env node

// Wrapper script for Azure App Service
// This ensures the server starts from the correct directory

const path = require('path');
const { spawn } = require('child_process');

// Change to the gateway directory
process.chdir(path.join(__dirname));

// Start the actual server
const server = spawn('node', ['src/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: process.env.PORT || 5050 }
});

server.on('exit', (code) => {
  process.exit(code);
});