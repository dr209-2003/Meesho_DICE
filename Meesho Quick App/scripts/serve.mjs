// Local test server: serves the production build and the /api/state function, like Vercel does.
// Usage: npm run build && MEESHO_QUICK_MEMORY_STORE=1 node scripts/serve.mjs   (in-memory shared store)
//        or set KV_REST_API_URL / KV_REST_API_TOKEN to use a real Upstash database.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import handler from '../api/state.js';

const root = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };
const port = Number(process.env.PORT) || 4173;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/state') {
    let body = '';
    for await (const c of req) body += c;
    req.body = body ? JSON.parse(body) : undefined;
    res.status = (c) => { res.statusCode = c; return res; };
    res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    return handler(req, res);
  }
  if (url.pathname === '/api/off') { res.statusCode = 404; return res.end('not found'); }
  const file = normalize(join(root, url.pathname));
  try {
    if (!file.startsWith(root) || !extname(file)) throw new Error();
    const data = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.setHeader('Content-Type', 'text/html');
    res.end(await readFile(join(root, 'index.html')));
  }
}).listen(port, () => console.log(`Serving dist + /api/state on http://localhost:${port}`));
