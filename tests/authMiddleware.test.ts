import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Response } from 'express';

// An invalid URL makes the Supabase client throw while verifying the token.
process.env.VITE_SUPABASE_URL = 'not-a-valid-url';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'key';
process.env.VITE_DEMO_MODE = 'false';

function mockResponse() {
  const res = { statusCode: 200, body: undefined as unknown };
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json(body: unknown) {
      res.body = body;
      return api;
    },
  };
  return { res, api: api as unknown as Response };
}

// Phase 1: a throw from getUser became an unhandled rejection and the request hung forever.
test('token verification errors are answered with 503 instead of hanging', async () => {
  const { requireAuth } = await import('../server/middleware/auth.js');
  const { res, api } = mockResponse();
  let nextCalled = false;
  await requireAuth({ headers: { authorization: 'Bearer abc' } } as any, api, () => {
    nextCalled = true;
  });
  assert.equal(res.statusCode, 503);
  assert.equal(nextCalled, false);
});

test('requests without a token are rejected when demo mode is off', async () => {
  const { requireAuth } = await import('../server/middleware/auth.js');
  const { res, api } = mockResponse();
  await requireAuth({ headers: {} } as any, api, () => {});
  assert.equal(res.statusCode, 401);
});
