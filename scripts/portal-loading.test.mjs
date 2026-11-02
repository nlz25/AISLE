import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { loadHandRig } from '../src/scripts/portal-hand.js';

const source = (await readFile(new URL('../src/scripts/main.js', import.meta.url), 'utf8'))
  .replace(/^import .*;$/m, '')
  .replace(/\bimport\(/g, 'importModule(');
const pending = () => new Promise(() => {});

async function setup(reduced = false) {
  const idle = [], imports = [];
  const globe = { dataset: {} };
  const entrance = { hidden: false, querySelector: () => globe };
  await runInNewContext(`(async () => { ${source} })()`, {
    document: { getElementById: () => entrance, addEventListener() {} },
    navigator: {}, window: { requestIdleCallback: true },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    requestIdleCallback: callback => idle.push(callback),
    console,
    importModule: async path => {
      imports.push(path);
      return path.includes('portal-hand.js') ? { loadHandRig: pending } : {};
    }
  });
  idle.forEach(callback => callback());
  await Promise.resolve();
  return { imports, globe };
}

test('pending hand decoding cannot delay the Earth module', async () => {
  const ui = await setup();
  assert.ok(ui.imports.some(path => path.includes('/globe.js')));
});

test('reduced motion selects static Earth without waiting for hand decoding', async () => {
  const ui = await setup(true);
  assert.equal(ui.globe.dataset.globeState, 'static');
  assert.ok(!ui.imports.some(path => path.includes('/globe.js')));
});

function handFixture(image) {
  const attributes = {}, classes = new Set();
  const rig = { querySelector: () => ({ setAttribute: (key, value) => { attributes[key] = value; } }) };
  return {
    attributes, classes,
    portal: {
      querySelector: selector => selector === '.portal-hand-rig' ? rig : image,
      classList: { add: name => classes.add(name) }
    }
  };
}

test('articulation reuses the visible image and waits for its pixels', async () => {
  let decoded;
  const image = { currentSrc: 'https://example.test/hand-v4.webp', decode: () => new Promise(resolve => { decoded = resolve; }) };
  const ui = handFixture(image);
  const loading = loadHandRig(ui.portal);
  assert.equal(ui.classes.size, 0);
  decoded();
  assert.equal(await loading, true);
  assert.equal(ui.attributes.href, image.currentSrc);
  assert.ok(ui.classes.has('has-hand-rig'));
});

test('a failed shared image requests the original and leaves articulation disabled', async () => {
  const image = { naturalWidth: 0, dataset: { fallback: '/robot-hand.webp' }, decode: async () => { throw new Error('Offline'); } };
  const ui = handFixture(image);
  assert.equal(await loadHandRig(ui.portal), false);
  assert.equal(image.src, image.dataset.fallback);
  assert.equal(ui.classes.size, 0);
});
