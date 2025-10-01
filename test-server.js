// Test server to verify deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: "ENHANCED BACKEND IS WORKING!",
    timestamp: new Date().toISOString(),
    nursesLoaded: 457,
    engineStatuses: [
      {
        name: "engine-enhanced",
        ok: true,
        message: "Enhanced backend deployed successfully"
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`TEST Enhanced Wonder Gateway running on port ${PORT}`);
});