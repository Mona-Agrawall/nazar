import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Phase 1: the server bundle was written into dist/, which express.static serves publicly.
test('the server bundle is built outside the public dist/ folder', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  const outfile = /--outfile=(\S+)/.exec(pkg.scripts.build)?.[1];
  assert.ok(outfile, 'build script should set --outfile');
  assert.ok(!outfile.startsWith('dist/'), `server bundle must not be in dist/: ${outfile}`);
  assert.ok(pkg.scripts.start.includes(outfile), 'start script should run the same bundle');
});
