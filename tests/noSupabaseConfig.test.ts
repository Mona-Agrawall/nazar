import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';

// Phase 1: without Supabase env vars the server threw "supabaseUrl is required" at import time.
// Empty values (rather than unset) also stop dotenv from filling them in from a local .env file.
process.env.VITE_SUPABASE_URL = '';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = '';
process.env.SUPABASE_SECRET_KEY = '';
process.env.VITE_DEMO_MODE = 'false';

test('the server starts and serves demo data when Supabase is not configured', async () => {
  const { default: app } = await import('../server/app.js');
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/watchlists`, { headers: { 'X-Session-Id': 'no-config' } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data) && body.data.length > 0);
  } finally {
    server.close();
  }
});

test('the frontend Supabase client is optional', async () => {
  const { supabase, isSupabaseConfigured } = await import('../src/lib/supabase.js');
  assert.equal(isSupabaseConfigured, false);
  assert.equal(supabase, null);
});
