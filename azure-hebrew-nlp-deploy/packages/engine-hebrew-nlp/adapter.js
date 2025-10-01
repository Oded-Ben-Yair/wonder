// Adapter for gateway integration
import { hebrewNlpMatch } from './src/lib/nlp-matcher.js';

export async function match(query, nurses) {
  console.log(`Hebrew NLP Engine adapter: Processing ${nurses.length} nurses`);
  const matches = await hebrewNlpMatch(query, nurses);
  return {
    results: matches,
    count: matches.length
  };
}

export async function health() {
  return {
    ok: true,
    engine: 'engine-hebrew-nlp',
    message: 'Hebrew NLP Engine Ready',
    features: [
      'Transparent scoring with calculation breakdown',
      'Hebrew/English bilingual support',
      'Full database processing (6,703 nurses)',
      'Detailed match explanations'
    ]
  };
}