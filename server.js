/**
 * Dev server for the landing page. No dependencies — `node server.js`.
 *
 *   http://localhost:3000/     the landing page
 *
 * `/` falls through to index.html, and a path resolves with or without its
 * `.html`. On Vercel the same shape comes from `cleanUrls` in vercel.json.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/** Map a request path to a file in public/, or null if it escapes the root. */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/index';
  const file = path.join(ROOT, path.extname(clean) ? clean : `${clean}.html`);
  return file.startsWith(ROOT) ? file : null;
}

http
  .createServer((req, res) => {
    const file = resolve(req.url);

    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found. The landing page is at /.');
      return;
    }

    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`  http://localhost:${PORT}/`);
  });
