const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Hebrew nurse data
const hebrewNurses = [
  { id: '1', name: 'אורטל צוקרל', city: 'Tel Aviv', services: ['Wound Care'], rating: 4.8 },
  { id: '2', name: 'בתיה אביב', city: 'Tel Aviv', services: ['Medication'], rating: 4.7 },
  { id: '3', name: 'ליאת סבתי', city: 'Tel Aviv', services: ['Wound Care'], rating: 4.6 },
  { id: '4', name: 'מירי כהן', city: 'Haifa', services: ['Elder Care'], rating: 4.9 },
  { id: '5', name: 'יעל לוי', city: 'Jerusalem', services: ['Wound Care'], rating: 4.5 },
  { id: '6', name: 'דניאל אבראהים', city: 'Tel Aviv', services: ['Medication'], rating: 4.7 },
  { id: '7', name: 'אסתר גולן', city: 'Haifa', services: ['Elder Care'], rating: 4.8 },
  { id: '8', name: 'טלי רצקר', city: 'Tel Aviv', services: ['Wound Care'], rating: 4.6 },
  { id: '9', name: 'חווה סינדלובסקי', city: 'Jerusalem', services: ['Medication'], rating: 4.7 },
  { id: '10', name: 'דליה נקש', city: 'Tel Aviv', services: ['Elder Care'], rating: 4.9 }
];

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Hebrew API is running',
    nursesLoaded: hebrewNurses.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/match', (req, res) => {
  const { nurseName, city, topK = 5 } = req.body;
  let results = [...hebrewNurses];

  if (nurseName) {
    results = results.filter(n => n.name.includes(nurseName));
  }

  if (city) {
    results = results.filter(n => n.city === city);
  }

  res.json({
    query: req.body,
    results: results.slice(0, topK),
    count: Math.min(results.length, topK),
    hebrew: true
  });
});

app.get('/', (req, res) => {
  res.send('Hebrew API is running! Use POST /match to search nurses.');
});

app.listen(PORT, () => {
  console.log(`Hebrew API running on port ${PORT}`);
});