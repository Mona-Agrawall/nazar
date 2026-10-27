import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventIdsToAcknowledge, isStockAcknowledged } from '../src/lib/pulseAck.js';
import type { MarketEvent } from '../src/types.js';

const event = (id: string, stockSymbol: string, extra: Partial<MarketEvent> = {}): MarketEvent => ({
  id,
  stockSymbol,
  timestamp: 0,
  timeFormatted: '',
  stockName: stockSymbol,
  title: '',
  change: '+1%',
  changeType: 'price_up',
  importance: 'high',
  explanation: '',
  miniChart: [],
  dismissed: false,
  acknowledged: false,
  ...extra,
});

// Phase 1: pulse cards sent the stock symbol ("RELIANCE") instead of the event ID to the server.
test('acknowledging a card sends event IDs, never the symbol', () => {
  const events = [event('evt_rel_1', 'RELIANCE'), event('evt_tcs_1', 'TCS'), event('evt_rel_2', 'RELIANCE')];
  const ids = eventIdsToAcknowledge(events, 'RELIANCE');
  assert.deepEqual(ids, ['evt_rel_1', 'evt_rel_2']);
  assert.ok(!ids.includes('RELIANCE'));
});

test('acknowledged and dismissed events are skipped', () => {
  const events = [
    event('a', 'RELIANCE', { acknowledged: true }),
    event('b', 'RELIANCE', { dismissed: true }),
    event('c', 'RELIANCE'),
  ];
  assert.deepEqual(eventIdsToAcknowledge(events, 'RELIANCE'), ['c']);
});

test('a card is acknowledged only when all of its events are', () => {
  assert.equal(isStockAcknowledged([event('a', 'X', { acknowledged: true }), event('b', 'X')], 'X'), false);
  assert.equal(isStockAcknowledged([event('a', 'X', { acknowledged: true })], 'X'), true);
  assert.equal(isStockAcknowledged([], 'X'), false);
});
