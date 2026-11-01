import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = (await readFile(new URL('../../src/scripts/counter.js', import.meta.url), 'utf8')).replace('export function', 'function');
function setup(fetch) {
  let idle;
  const output = { hidden: true, dataset: { endpoint: 'https://counter.example/count' }, setAttribute() {}, animate() {} };
  const portal = { hidden: false, querySelector: () => output };
  const record = runInNewContext(`${source}\nportalCounter(portal)`, {
    portal, fetch, crypto, Intl, Date, Number, JSON, AbortSignal,
    matchMedia: () => ({ matches: true }),
    document: { hidden: false, addEventListener() {} },
    window: { requestIdleCallback: true, addEventListener() {} },
    requestIdleCallback: callback => { idle = callback; },
    setTimeout: callback => callback()
  });
  return { output, record, read: () => idle() };
}
const response = total => ({ ok: true, json: async () => ({ total }) });

test('late initial read cannot replace a newer click total', async () => {
  let resolveRead;
  const ui = setup((url, options) => options.method === 'POST' ? Promise.resolve(response(11)) : new Promise(resolve => { resolveRead = resolve; }));
  const reading = ui.read();
  await ui.record();
  resolveRead(response(10));
  await reading;
  assert.equal(ui.output.textContent, '000,011');
});

test('failed reads stay hidden; retry reuses ID, next click gets a new ID', async () => {
  const ids = [];
  const ui = setup(async (url, options) => {
    if (!options.method) throw new Error('Offline');
    ids.push(JSON.parse(options.body).id);
    if (ids.length === 1) throw new Error('Response lost');
    return response(ids.length);
  });
  await ui.read();
  assert.equal(ui.output.hidden, true);
  await ui.record();
  assert.equal(ids[0], ids[1]);
  await ui.record();
  assert.notEqual(ids[1], ids[2]);
  assert.equal(ui.output.hidden, false);
});
