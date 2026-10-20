// A tiny stand-in for the Supabase REST API, for e2e tests and local previews without
// real keys. It serves the `threads` and `messages` tables from a JSON fixture.
//
//   node scripts/testing/mock-supabase.mjs [fixture.json]
//   Then run Next with NEXT_PUBLIC_SUPABASE_URL=http://localhost:54329 SUPABASE_SERVICE_ROLE_KEY=mock
//
// Test controls: POST /__fixture (body: { threads, messages }) replaces the data,
// POST /__fail makes every table request fail, POST /__reset restores the start fixture.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const port = Number(process.env.MOCK_SUPABASE_PORT ?? 54329);
const fixturePath = process.argv[2] ?? new URL('../../tests/fixtures/threads.json', import.meta.url).pathname;
const initial = () => JSON.parse(readFileSync(fixturePath, 'utf8'));

let data = initial();
let failing = false;

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => resolve(raw ? JSON.parse(raw) : {}));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === 'POST' && url.pathname === '/__fixture') {
    data = await readBody(req);
    failing = false;
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/__fail') {
    failing = true;
    return send(res, 200, { ok: true });
  }
  if (req.method === 'POST' && url.pathname === '/__reset') {
    data = initial();
    failing = false;
    return send(res, 200, { ok: true });
  }
  const table = url.pathname.match(/^\/rest\/v1\/(threads|messages)$/)?.[1];
  if (req.method === 'GET' && table) {
    if (failing) return send(res, 500, { message: 'mock supabase is failing on purpose', code: 'MOCK' });
    const rows = [...data[table]];
    if (table === 'threads') rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return send(res, 200, rows);
  }
  send(res, 404, { message: `mock supabase: no route for ${req.method} ${url.pathname}` });
}).listen(port, () => console.log(`mock supabase on http://localhost:${port} (fixture: ${fixturePath})`));
