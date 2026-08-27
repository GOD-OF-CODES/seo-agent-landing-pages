/**
 * Dev server for the two landing pages. No dependencies — `node server.js`.
 *
 *   http://localhost:3000/v1   the current landing page
 *   http://localhost:3000/v2   the funky one
 *   http://localhost:3000/     a chooser linking to both
 *
 * `/v1` and `/v1.html` both resolve, so the URL you type is the short one.
 * On Vercel the same shape comes from `cleanUrls` in vercel.json.
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
      res.end('Not found. Try /v1 or /v2.');
      return;
    }

    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`  v1  http://localhost:${PORT}/v1`);
    console.log(`  v2  http://localhost:${PORT}/v2`);
  });
