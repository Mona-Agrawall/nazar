import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEvents, getMarketPulse, getStocks } from '../server/services/marketService.js';
import { getOrCreateSession } from '../server/services/sessionStore.js';

// Phase 1: an empty watchlist used to be treated as "no filter" and showed every stock.
test('an empty watchlist returns no stocks, events or pulse changes', async () => {
  const session = getOrCreateSession('test-empty-watchlist');
  assert.deepEqual(await getStocks(session, []), []);
  assert.deepEqual(getEvents(session, []), []);
  const pulse = await getMarketPulse(session, []);
  assert.equal(pulse.totalChangesCount, 0);
  assert.equal(pulse.meaningfulChangesCount, 0);
});

test('omitting the symbol list still returns the whole universe', async () => {
  const session = getOrCreateSession('test-all-stocks');
  const all = await getStocks(session);
  assert.ok(all.length > 1);
  const [tcs] = await getStocks(session, ['TCS']);
  assert.equal(tcs.symbol, 'TCS');
});
