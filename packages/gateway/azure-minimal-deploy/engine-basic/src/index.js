import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { basicMatch } from './lib/basic.js';
import { initDb, dbHealth, loadNurses } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB if configured
await initDb().catch(err => console.warn('DB init error:', err.message));

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5001;

// Serve static files from docs directory
app.use('/docs', express.static(path.join(__dirname, '..', 'docs')));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/db/health', async (_req, res) => res.json(await dbHealth()));

app.post('/match', async (req, res) => {
  const q = req.body || {};
  const nurses = await loadNurses();
  const results = basicMatch(q, nurses);
  res.json({ count: results.length, results });
});

app.listen(PORT, () => {
  console.log('Basic Filter listening on :' + PORT);
  console.log(`Docs at http://localhost:${PORT}/docs/demo.html`);
});
