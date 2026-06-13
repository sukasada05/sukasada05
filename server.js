// Simple static server for local testing
const http = require('http');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8080;
const root = process.env.STATIC_ROOT || process.argv[2] || '.';

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    case '.webmanifest': return 'application/manifest+json';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), root, reqPath);

  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not found');
      return;
    }

    if (stat.isDirectory()) {
      res.writeHead(302, { 'Location': '/index.html' });
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    stream.pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Static server serving ${root} on http://localhost:${port}`);
});
