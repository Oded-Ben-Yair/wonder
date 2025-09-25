const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Proxy API requests to gateway
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://wonder-engine-web.azurewebsites.net';

app.use('/api', createProxyMiddleware({
  target: GATEWAY_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  }
}));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`UI server running on port ${PORT}`);
  console.log(`Proxying API requests to ${GATEWAY_URL}`);
});