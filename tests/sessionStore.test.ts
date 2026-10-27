import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateSession, getSessionCount } from '../server/services/sessionStore.js';

// Phase 1: every unique X-Session-Id created a session that was never removed.
test('the number of sessions is capped', () => {
  for (let i = 0; i < 6000; i++) getOrCreateSession(`flood-${i}`);
  assert.ok(getSessionCount() <= 5000, `expected at most 5000 sessions, got ${getSessionCount()}`);
});

test('the same ID returns the same session', () => {
  assert.equal(getOrCreateSession('stable-id'), getOrCreateSession('stable-id'));
});

test('idle sessions expire', (t) => {
  const session = getOrCreateSession('will-expire');
  const realNow = Date.now;
  t.after(() => {
    Date.now = realNow;
  });
  Date.now = () => realNow() + 7 * 3600 * 1000; // past the 6h idle TTL
  assert.notEqual(getOrCreateSession('will-expire'), session);
  assert.equal(getSessionCount(), 1);
});

test('session IDs are length-limited', () => {
  const long = 'x'.repeat(500);
  assert.equal(getOrCreateSession(long), getOrCreateSession('x'.repeat(64)));
});
