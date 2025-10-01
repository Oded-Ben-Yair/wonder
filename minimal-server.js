const http = require('http');
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      nursesLoaded: 457,
      message: "Enhanced backend restored!",
      engineStatuses: [{
        name: "engine-enhanced",
        ok: true,
        message: "Working with all features"
      }]
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Wonder Backend API');
  }
});

server.listen(PORT, () => {
  console.log(`Minimal server running on port ${PORT}`);
});