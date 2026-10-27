import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

// A signed-in user's "last seen" baseline is read from and written to Supabase (user_visit_state).
process.env.VITE_SUPABASE_URL = 'http://supabase.test';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'key';
process.env.SUPABASE_SECRET_KEY = '';
process.env.VITE_DEMO_MODE = 'false';

type Row = { user_id: string; last_visit_at: string; snapshot_prices: Record<string, unknown> };
let visitRow: Row | null = null;
const writes: { body: Row; prefer: string }[] = [];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith('http://supabase.test')) return realFetch(input, init);
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  const path = new URL(url).pathname;
  const method = init.method ?? 'GET';

  if (path === '/auth/v1/user') {
    return json({ id: 'user-1', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' });
  }
  if (path === '/rest/v1/user_visit_state') {
    if (method === 'GET') return json(visitRow ? [visitRow] : []);
    const body = JSON.parse(String(init.body));
    const prefer = new Headers(init.headers).get('prefer') ?? '';
    writes.push({ body, prefer });
    if (!(visitRow && prefer.includes('ignore-duplicates'))) visitRow = body;
    return json(null);
  }
  if (path === '/rest/v1/watchlists') {
    return json([
      {
        id: 'wl-1',
        name: 'Mine',
        is_default: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        watchlist_items: [{ stocks: { symbol: 'RELIANCE' } }, { stocks: { symbol: 'TCS' } }],
      },
    ]);
  }
  if (path === '/rest/v1/profiles') return json({ active_watchlist_id: 'wl-1' });
  return json(null);
}) as typeof fetch;

async function withServer(run: (call: (path: string, init?: RequestInit) => Promise<any>) => Promise<void>) {
  const { default: app } = await import('../server/app.js');
  const server = app.listen(0);
  const { port } = server.address() as AddressInfo;
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await realFetch(`http://127.0.0.1:${port}${path}`, {
      ...init,
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json', 'X-Session-Id': 'visit-test' },
    });
    assert.equal(res.status, 200, `${path} returned ${res.status}`);
    return res.json();
  };
  try {
    await run(call);
  } finally {
    server.close();
  }
}

test('a first-time user starts from the demo scenario, stored in Supabase', async () => {
  visitRow = null;
  writes.length = 0;
  await withServer(async (call) => {
    const pulse = await call('/api/market/pulse?watchlistId=wl-1');
    assert.equal(pulse.data.awayDurationFormatted, '7h 42m');
    assert.ok(writes.length >= 1 && writes[0].prefer.includes('ignore-duplicates'), 'initial row inserted once');
    assert.ok(visitRow, 'baseline row created');
  });
});

test('the away time and price changes come from the stored baseline', async () => {
  visitRow = {
    user_id: 'user-1',
    last_visit_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    snapshot_prices: { RELIANCE: 2000, TCS: 4128.5 },
  };
  await withServer(async (call) => {
    const pulse = await call('/api/market/pulse?watchlistId=wl-1');
    assert.equal(pulse.data.awayDurationFormatted, '2h');
    const stocks = await call('/api/market/stocks?watchlistId=wl-1');
    const reliance = stocks.data.find((s: any) => s.symbol === 'RELIANCE');
    assert.equal(reliance.userDelta.previousPrice, 2000);
  });
});

test('"Mark as read" and simulated absences are saved to Supabase', async () => {
  writes.length = 0;
  await withServer(async (call) => {
    await call('/api/session/sync', { method: 'POST' });
    const synced = writes.at(-1)!.body;
    assert.ok(Date.now() - new Date(synced.last_visit_at).getTime() < 60_000, 'baseline moved to now');
    assert.equal(synced.snapshot_prices.RELIANCE, 2431.2);

    const travel = await call('/api/session/time-travel', { method: 'POST', body: JSON.stringify({ preset: '24h' }) });
    assert.equal(travel.awayFormatted, '1d');
    const rewound = writes.at(-1)!.body;
    const awayMs = Date.now() - new Date(rewound.last_visit_at).getTime();
    assert.ok(Math.abs(awayMs - 24 * 3600 * 1000) < 60_000, 'baseline moved 24h back');
  });
});
