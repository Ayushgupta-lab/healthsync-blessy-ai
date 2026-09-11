// High-performance local development server for HealthSync AI
import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

import { handleApiRequest } from './server/apiRouter.js';
import { connectToMongoDB } from './server/dbConnect.js';

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const parsedUrl = new URL(req.url, `http://${host}`);

  // Route API requests
  if (parsedUrl.pathname.startsWith('/api/')) {
    await handleApiRequest(req, res, parsedUrl);
    return;
  }

  let pathname = parsedUrl.pathname;
  if (pathname === '/') pathname = '/index.html';

  // Check dist/ first, fallback to root
  let filePath = path.join(__dirname, 'dist', pathname);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(__dirname, pathname);
  }
  if ((!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) && !path.extname(pathname)) {
    filePath = path.join(__dirname, 'dist', 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found: ${parsedUrl}`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`HealthSync AI dev server running at http://localhost:${PORT}/`);
  await connectToMongoDB();
});
