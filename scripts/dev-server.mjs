import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../frontend/', import.meta.url)));
const port = Number(process.env.GURIA_FRONTEND_PORT || 4173);
const apiBaseUrl = (process.env.GURIA_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '');
const mime = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.webp', 'image/webp']
]);

createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/app-config.json') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ apiBaseUrl }));
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { response.writeHead(400); response.end('Invalid path'); return; }
  const requested = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (requested !== root && !requested.startsWith(root + sep)) { response.writeHead(403); response.end('Forbidden'); return; }
  let file = requested;
  try { if (!statSync(file).isFile()) throw new Error(); }
  catch { file = resolve(root, 'index.html'); }
  const type = mime.get(extname(file).toLowerCase()) || 'application/octet-stream';
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Guria Nails frontend: http://127.0.0.1:${port}\nAPI: ${apiBaseUrl}\n`);
});
