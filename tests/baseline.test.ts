import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentBaseline,
  demoBaseline,
  getOrCreateSession,
  timeTravelBaseline,
  withBaseline,
} from '../server/services/sessionStore.js';
import { BASE_STOCKS } from '../server/data/stockUniverse.js';

const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const reliance = BASE_STOCKS.find((s) => s.symbol === 'RELIANCE')!;

test('the demo baseline is "away 7h 42m" with yesterday\'s closes', () => {
  const baseline = demoBaseline(NOW);
  assert.equal(NOW - baseline.lastVisitTimestamp, (7 * 3600 + 42 * 60) * 1000);
  assert.equal(baseline.prices.RELIANCE, reliance.yesterdayClose);
});

test('a simulated absence rewinds the last visit and the last-seen prices', () => {
  const { baseline, awaySeconds } = timeTravelBaseline('24h', undefined, NOW);
  assert.equal(awaySeconds, 24 * 3600);
  assert.equal(baseline.lastVisitTimestamp, NOW - 24 * 3600 * 1000);
  assert.ok(baseline.prices.RELIANCE < reliance.basePrice);
});

test('"mark as read" makes the current prices the baseline', () => {
  const baseline = currentBaseline(NOW);
  assert.equal(baseline.lastVisitTimestamp, NOW);
  assert.equal(baseline.prices.RELIANCE, reliance.basePrice);
});

test('a stored baseline gives the real time away and leaves the tab session untouched', () => {
  const session = getOrCreateSession('baseline-test');
  const stored = { lastVisitTimestamp: NOW - 2 * 3600 * 1000, prices: { RELIANCE: 2300 } };
  const merged = withBaseline(session, stored, NOW);
  assert.equal(merged.simulatedAwaySeconds, 2 * 3600);
  assert.equal(merged.stockSnapshots.RELIANCE.price, 2300);
  assert.notEqual(session.stockSnapshots.RELIANCE.price, 2300, 'the in-memory session must not change');
  assert.equal(merged.acknowledgedEventIds, session.acknowledgedEventIds, 'acknowledgements stay shared');
});
