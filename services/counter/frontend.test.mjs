import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = (await readFile(new URL('../../src/scripts/counter.js', import.meta.url), 'utf8')).replace('export function', 'function');
function setup(fetch) {
  let idle;
  const output = {
    hidden: false, textContent: '···', dataset: { endpoint: 'https://counter.example/count' },
    attributes: {}, setAttribute(name, value) { this.attributes[name] = value; }, animate() {}
  };
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

test('failed reads stay visible; retry reuses ID, next click gets a new ID', async () => {
  const ids = [];
  const ui = setup(async (url, options) => {
    if (!options.method) throw new Error('Offline');
    ids.push(JSON.parse(options.body).id);
    if (ids.length === 1) throw new Error('Response lost');
    return response(ids.length);
  });
  await ui.read();
  assert.equal(ui.output.hidden, false);
  assert.equal(ui.output.textContent, '—');
  assert.equal(ui.output.attributes['aria-label'], 'Total portal clicks currently unavailable');
  await ui.record();
  assert.equal(ids[0], ids[1]);
  await ui.record();
  assert.notEqual(ids[1], ids[2]);
  assert.equal(ui.output.hidden, false);
  assert.equal(ui.output.attributes.title, 'Total portal clicks');
});

test('pending reads keep a placeholder; rejected and invalid totals show unavailable', async () => {
  let resolveRead;
  const ui = setup(() => new Promise(resolve => { resolveRead = resolve; }));
  const reading = ui.read();
  assert.equal(ui.output.hidden, false);
  assert.equal(ui.output.textContent, '···');
  resolveRead({ ok: false, status: 403 });
  await reading;
  assert.equal(ui.output.textContent, '—');
  for (const total of [-1, null, '7']) {
    const invalid = setup(async () => response(total));
    await invalid.read();
    assert.equal(invalid.output.hidden, false);
    assert.equal(invalid.output.textContent, '—');
  }
});

test('a failed late read preserves a successful click total', async () => {
  let rejectRead;
  const ui = setup((url, options) => options.method === 'POST'
    ? Promise.resolve(response(11))
    : new Promise((resolve, reject) => { rejectRead = reject; }));
  const reading = ui.read();
  await ui.record();
  rejectRead(new Error('Offline'));
  await reading;
  assert.equal(ui.output.textContent, '000,011');
  assert.equal(ui.output.attributes.title, 'Total portal clicks');
});
