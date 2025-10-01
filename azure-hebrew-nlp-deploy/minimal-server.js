const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Minimal server working' });
});

// Root
app.get('/', (req, res) => {
  res.send('<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Azure Test Working!</h1></body></html>');
});

// Start server
app.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});