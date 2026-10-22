// Vercel serverless function: the shared store behind Meesho Quick and the LMDC dashboard.
//
//   GET  /api/state            → { mode: 'shared', state, serverTime }
//   POST /api/state  { op }    → { mode: 'shared', state, result }  (409/400 with { error, code, details } on failure)
//
// Storage: Upstash Redis over its REST API. Credentials come only from server-side env vars
// (KV_REST_API_URL + KV_REST_API_TOKEN, as set by the Vercel Marketplace Upstash integration,
// or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN). Nothing secret is ever sent to the browser.
// Writes use a compare-and-set Lua script, so two buyers can never reserve the same unit.
// Without credentials the endpoint answers 503 { mode: 'unconfigured' } and the app runs in a
// clearly labelled same-device demo mode instead.
import { OPS, OpError, applyOp, normalize, seed } from '../src/shared/ops.js';

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = process.env.MEESHO_QUICK_KEY_PREFIX || 'meesho-quick-app:v1';
const K_STATE = PREFIX + ':state';
const K_REV = PREFIX + ':rev';
const MEMORY = process.env.MEESHO_QUICK_MEMORY_STORE === '1'; // local testing only

const CAS = `local r = redis.call('GET', KEYS[2])
if (r or '-1') == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  redis.call('SET', KEYS[2], ARGV[3])
  return 1
end
return 0`;

async function redis(cmd) {
  const res = await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error('Storage error: ' + (json.error || res.status));
  return json.result;
}

const mem = (globalThis.__meeshoQuickMem ||= { state: null, rev: '-1' });

const store = MEMORY
  ? {
      read: async () => (mem.state ? JSON.parse(mem.state) : null),
      cas: async (expectRev, next) => {
        if (mem.rev !== String(expectRev)) return false;
        mem.state = JSON.stringify(next);
        mem.rev = String(next.rev);
        return true;
      },
    }
  : {
      read: async () => {
        const raw = await redis(['GET', K_STATE]);
        return raw ? JSON.parse(raw) : null;
      },
      cas: async (expectRev, next) => (await redis(['EVAL', CAS, '2', K_STATE, K_REV, String(expectRev), JSON.stringify(next), String(next.rev)])) === 1,
    };

async function load() {
  const cur = await store.read();
  if (cur) return cur;
  const fresh = seed();
  await store.cas(-1, fresh);
  return (await store.read()) || fresh;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!MEMORY && (!URL || !TOKEN)) {
    return res.status(503).json({ mode: 'unconfigured', error: 'Shared store not configured (set KV_REST_API_URL and KV_REST_API_TOKEN)' });
  }
  try {
    if (req.method === 'GET') {
      const s = await load();
      return res.status(200).json({ mode: 'shared', state: normalize(s), serverTime: Date.now() });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const op = body?.op;
    if (!op || !OPS.includes(op.type) || JSON.stringify(op).length > 8000) return res.status(400).json({ error: 'Invalid operation', code: 'BAD_OP' });

    for (let attempt = 0; attempt < 6; attempt++) {
      const cur = await load();
      let out;
      try {
        out = applyOp(cur, op);
      } catch (e) {
        if (e instanceof OpError) return res.status(e.code === 'OUT_OF_STOCK' ? 409 : 400).json({ error: e.message, code: e.code, details: e.details, state: normalize(cur) });
        throw e;
      }
      const next = { ...out.state, rev: (cur.rev || 0) + 1 };
      if (await store.cas(cur.rev || 0, next)) return res.status(200).json({ mode: 'shared', state: next, result: out.result, serverTime: Date.now() });
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 80)); // lost the race: re-read and retry
    }
    return res.status(503).json({ error: 'Store is busy, please retry', code: 'BUSY' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Server error', code: 'SERVER' });
  }
}
