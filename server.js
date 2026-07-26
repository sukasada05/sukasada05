// ============================================================
// server.js - Static server with CORS support
// ============================================================
const http = require('http');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8080;
const root = process.env.STATIC_ROOT || process.argv[2] || '.';

// ===== MIME TYPES =====
function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.txt': 'text/plain',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return types[ext] || 'application/octet-stream';
}

// ===== CORS HEADERS =====
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ===== SERVER =====
const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // Set CORS headers for all responses
  setCorsHeaders(res);

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  // Security: prevent directory traversal
  const safePath = path.normalize(reqPath).replace(/^\.\.\//, '');
  const filePath = path.join(process.cwd(), root, safePath);

  fs.stat(filePath, (err, stat) => {
    if (err) {
      console.log(`❌ 404: ${reqPath}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - File not found');
      return;
    }

    if (stat.isDirectory()) {
      // Try to serve index.html from directory
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (err2) => {
        if (!err2) {
          const stream = fs.createReadStream(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          stream.pipe(res);
        } else {
          res.writeHead(302, { 'Location': '/index.html' });
          res.end();
        }
      });
      return;
    }

    // Serve file
    const stream = fs.createReadStream(filePath);
    const mimeType = contentType(filePath);
    
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    });
    
    stream.pipe(res);

    // Log request
    console.log(`✅ 200: ${reqPath} (${mimeType})`);
  });
});

// ===== ERROR HANDLING =====
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} already in use!`);
    console.log(`   Try: PORT=8081 node server.js`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
  }
});

// ===== START SERVER =====
server.listen(port, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 DUKOPS SERVER RUNNING`);
  console.log('='.repeat(50));
  console.log(`   📁 Root: ${path.resolve(root)}`);
  console.log(`   🌐 Local: http://localhost:${port}`);
  console.log(`   📱 Network: http://${getLocalIP()}:${port}`);
  console.log('='.repeat(50));
  console.log('\n   Press Ctrl+C to stop\n');
});

// ===== GET LOCAL IP =====
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
