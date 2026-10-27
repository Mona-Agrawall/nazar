import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal browser globals used by the API client
const storage = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
};

const respondWith = (status: number, body: unknown) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as typeof fetch;
};

// Phase 1: getWatchlists/getStocks ignored res.ok, so a 401 body became `watchlists: undefined` and crashed the UI.
test('API calls throw on a non-2xx response instead of returning the error body', async () => {
  const { api } = await import('../src/services/api.js');
  respondWith(401, { error: 'Unauthorized: Missing or invalid token' });
  await assert.rejects(api.getWatchlists(), /Unauthorized/);
  await assert.rejects(api.getStocks('wl_default'), /Unauthorized/);
  await assert.rejects(api.acknowledgeEvent('evt_1'), /Unauthorized/);
});

test('successful responses are unwrapped as before', async () => {
  const { api } = await import('../src/services/api.js');
  respondWith(200, { success: true, data: [{ id: 'wl_1', name: 'A', symbols: [] }], activeId: 'wl_1' });
  const { watchlists, activeId } = await api.getWatchlists();
  assert.equal(watchlists.length, 1);
  assert.equal(activeId, 'wl_1');
});
