import express from 'express';
import { hebrewNlpMatch } from './lib/nlp-matcher.js';

const app = express();
const PORT = process.env.PORT || 5005;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    engine: 'engine-hebrew-nlp',
    message: 'Hebrew NLP Engine with Transparent Scoring',
    features: [
      'Hebrew/English NLP processing',
      'Transparent scoring calculations',
      'Full database processing (6,703 nurses)',
      'Detailed match explanations'
    ],
    configured: true
  });
});

// Match endpoint
app.post('/match', async (req, res) => {
  try {
    const { query, nurses } = req.body;

    if (!query || !nurses || nurses.length === 0) {
      return res.status(400).json({
        error: 'Missing required parameters: query and nurses array'
      });
    }

    console.log(`Hebrew NLP Engine processing ${nurses.length} nurses for query:`, query);

    const results = await hebrewNlpMatch(query, nurses);

    res.json({
      query,
      results,
      engine: 'engine-hebrew-nlp',
      processed: nurses.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hebrew NLP match error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Hebrew NLP Engine running on port ${PORT}`);
  console.log('Features: Hebrew/English NLP, Transparent Scoring, Full Database Processing');
});

// Export adapter for gateway integration
export const adapter = {
  match: hebrewNlpMatch,
  health: async () => ({
    ok: true,
    engine: 'engine-hebrew-nlp',
    message: 'Ready',
    configured: true
  })
};