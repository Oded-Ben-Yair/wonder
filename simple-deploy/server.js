const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Hebrew API is starting up...',
    timestamp: new Date().toISOString()
  });
});

// Test Hebrew endpoint
app.post('/match', (req, res) => {
  const { nurseName, topK = 3 } = req.body;

  // Mock Hebrew response for testing
  const mockResults = [
    { id: '1', name: 'אורטל צוקרל', score: 1 },
    { id: '2', name: 'בתיה אביב', score: 0.9 },
    { id: '3', name: 'מירי כהן', score: 0.8 }
  ];

  res.json({
    query: { nurseName, topK },
    results: mockResults.slice(0, topK),
    count: topK,
    hebrew: true
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Hebrew support enabled`);
});
