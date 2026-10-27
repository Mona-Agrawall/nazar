import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.VITE_SUPABASE_URL = 'http://supabase.test';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'key';

// Records every request the Supabase client makes and answers with empty data.
const calls: { method: string; path: string; body: string }[] = [];
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(String(input));
  calls.push({ method: init.method ?? 'GET', path: url.pathname, body: init.body ? String(init.body) : '' });
  const json = url.pathname.endsWith('/watchlists') && (init.method ?? 'GET') === 'GET' ? [] : null;
  return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

// Phase 1: a name-only update called replace_watchlist_items with an empty list, deleting every stock.
test('renaming a watchlist does not replace its items', async () => {
  const { supabaseRepository } = await import('../server/db/supabaseRepository.js');
  calls.length = 0;
  await supabaseRepository.updateWatchlist('token', 'wl-1', 'Renamed', undefined, undefined);
  assert.ok(!calls.some((c) => c.path.includes('replace_watchlist_items')), 'must not call the replace RPC');
  const patch = calls.find((c) => c.method === 'PATCH' && c.path.endsWith('/watchlists'));
  assert.ok(patch, 'expected a direct update of the watchlist row');
  assert.equal(JSON.parse(patch.body).name, 'Renamed');
});

test('replacing symbols still goes through the RPC with the given symbols', async () => {
  const { supabaseRepository } = await import('../server/db/supabaseRepository.js');
  calls.length = 0;
  await supabaseRepository.updateWatchlist('token', 'wl-1', 'Name', ['TCS'], undefined);
  const rpc = calls.find((c) => c.path.includes('replace_watchlist_items'));
  assert.ok(rpc);
  assert.deepEqual(JSON.parse(rpc.body).p_symbols, ['TCS']);
});
