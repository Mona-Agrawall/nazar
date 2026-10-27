import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerialQueue } from '../src/lib/serialQueue.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Phase 1: two quick removals each sent a list computed from stale state, concurrently,
// so the slower request could re-add the first removed stock.
test('rapid removals reach the server in order with the latest symbols', async () => {
  let server = ['A', 'B', 'C'];
  let call = 0;
  const put = async (symbols: string[]) => {
    await delay(call++ === 0 ? 40 : 5); // first request is slower
    server = symbols;
  };
  const latest = { current: ['A', 'B', 'C'] };
  const enqueue = createSerialQueue();
  const remove = (symbol: string) => {
    latest.current = latest.current.filter((s) => s !== symbol);
    return enqueue(() => put(latest.current));
  };

  await Promise.all([remove('A'), remove('B')]);
  assert.deepEqual(server, ['C']);
});

test('a failed task rejects its caller but does not block later tasks', async () => {
  const enqueue = createSerialQueue();
  const failed = enqueue(async () => {
    throw new Error('boom');
  });
  const next = enqueue(async () => 'ran');
  await assert.rejects(failed, /boom/);
  assert.equal(await next, 'ran');
});
