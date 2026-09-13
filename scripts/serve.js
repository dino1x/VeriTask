const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIR = path.join(__dirname, '../frontend');

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(DIR, file);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const msg = 'VeriTask server running at http://localhost:' + PORT;
  console.log(msg);
});