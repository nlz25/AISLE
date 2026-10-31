import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = 'https://aisle.science';
const post = id => ({ method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });

test('counter persists, serializes concurrent clicks, and deduplicates retries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aisle-counter-test-'));
  const options = {
    modules: true, scriptPath: new URL('./worker.js', import.meta.url).pathname,
    compatibilityDate: '2026-08-01', cf: false,
    bindings: { ALLOWED_ORIGINS: origin },
    durableObjects: { COUNTER: { className: 'PortalCounter', useSQLite: true } },
    durableObjectsPersist: dir
  };
  let mf = new Miniflare(options);
  const request = options => mf.dispatchFetch('http://counter/count', options);
  const total = async () => (await (await request()).json()).total;
  try {
    assert.equal(await total(), 0);
    const preflight = await request({ method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
    const ids = Array.from({ length: 25 }, () => crypto.randomUUID());
    const results = await Promise.all(ids.map(id => request(post(id))));
    assert.ok(results.every(response => response.status === 200));
    assert.equal(await total(), 25);
    await Promise.all(Array.from({ length: 10 }, () => request(post(ids[0]))));
    assert.equal(await total(), 25);
    assert.equal((await request({ ...post(crypto.randomUUID()), headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } })).status, 403);
    assert.equal((await request({ ...post(crypto.randomUUID()), headers: { 'Content-Type': 'application/json' } })).status, 403);
    assert.equal((await request(post('invalid'))).status, 400);
    assert.equal((await request({ method: 'DELETE' })).status, 405);
    assert.equal(await total(), 25);
    await mf.dispose();
    mf = new Miniflare(options);
    assert.equal(await total(), 25);
    await request(post(crypto.randomUUID()));
    assert.equal(await total(), 26);
  } finally {
    await mf.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});
