// A tiny stand-in for the Supabase REST API, for e2e tests and local previews without
// real keys. It serves the `threads` and `messages` tables from a JSON fixture, takes the
// admin writes (insert, update, delete with `col=eq.value` filters), and takes signed uploads.
//
//   node scripts/testing/mock-supabase.mjs [fixture.json]
//   Then run Next with NEXT_PUBLIC_SUPABASE_URL=http://localhost:54329 SUPABASE_SERVICE_ROLE_KEY=mock
//
// Test controls: POST /__fixture (body: { threads, messages }) replaces the data,
// POST /__fail makes every table request fail, POST /__reset restores the start fixture,
// GET /__state returns the tables plus the paths of uploaded files.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const port = Number(process.env.MOCK_SUPABASE_PORT ?? 54329);
const fixturePath = process.argv[2] ?? new URL('../../tests/fixtures/threads.json', import.meta.url).pathname;
const initial = () => JSON.parse(readFileSync(fixturePath, 'utf8'));

let data = initial();
let failing = false;
let uploads = [];
let nextId = 1;

// The browser uploads files straight to storage, so storage answers other origins.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...cors });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const readRaw = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => resolve(raw));
  });

const readBody = async (req) => {
  const raw = await readRaw(req);
  return raw ? JSON.parse(raw) : {};
};

// PostgREST filters look like `?id=eq.abc`. Only `eq` is needed here.
const matches = (url) => {
  const filters = [...url.searchParams].filter(([key, value]) => key !== 'select' && value.startsWith('eq.'));
  return (row) => filters.every(([key, value]) => String(row[key]) === value.slice(3));
};

const withDefaults = (table, row) => ({
  id: `${table}-new-${nextId++}`,
  ...(table === 'messages' ? { created_at: new Date().toISOString(), attachment_url: null, attachment_type: null } : {}),
  ...row,
});

// Answers as PostgREST does: nothing by default, rows when asked, one object for .single().
const reply = (req, res, status, rows) => {
  if (!String(req.headers.prefer ?? '').includes('return=representation')) return send(res, status === 200 ? 204 : status);
  if (String(req.headers.accept ?? '').includes('vnd.pgrst.object')) return send(res, status, rows[0] ?? null);
  return send(res, status, rows);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.method === 'GET' && url.pathname === '/__state') {
    return send(res, 200, { ...data, uploads });
  }
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
    uploads = [];
    return send(res, 200, { ok: true });
  }

  // Signed uploads: the server asks for a URL, then the browser sends the file to it.
  const signPath = url.pathname.match(/^\/storage\/v1\/object\/upload\/sign\/(.+)$/)?.[1];
  if (signPath && req.method === 'POST') {
    return send(res, 200, { url: `/object/upload/sign/${signPath}?token=mock-token` });
  }
  if (signPath && req.method === 'PUT') {
    if (url.searchParams.get('token') !== 'mock-token') return send(res, 400, { message: 'bad token' });
    await readRaw(req);
    uploads.push(decodeURIComponent(signPath));
    return send(res, 200, { Key: decodeURIComponent(signPath) });
  }

  const table = url.pathname.match(/^\/rest\/v1\/(threads|messages)$/)?.[1];
  if (table && failing) return send(res, 500, { message: 'mock supabase is failing on purpose', code: 'MOCK' });
  if (req.method === 'GET' && table) {
    const rows = data[table].filter(matches(url));
    if (table === 'threads') rows.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return send(res, 200, rows);
  }
  if (req.method === 'POST' && table) {
    const body = await readBody(req);
    const created = (Array.isArray(body) ? body : [body]).map((row) => withDefaults(table, row));
    data[table] = [...data[table], ...created];
    return reply(req, res, 201, created);
  }
  if (req.method === 'PATCH' && table) {
    const patch = await readBody(req);
    const hit = matches(url);
    data[table] = data[table].map((row) => (hit(row) ? { ...row, ...patch } : row));
    return reply(req, res, 200, data[table].filter(hit));
  }
  if (req.method === 'DELETE' && table) {
    const hit = matches(url);
    const removed = data[table].filter(hit);
    data[table] = data[table].filter((row) => !hit(row));
    return reply(req, res, 200, removed);
  }
  send(res, 404, { message: `mock supabase: no route for ${req.method} ${url.pathname}` });
}).listen(port, () => console.log(`mock supabase on http://localhost:${port} (fixture: ${fixturePath})`));
