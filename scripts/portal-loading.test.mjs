import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = (await readFile(new URL('../src/scripts/main.js', import.meta.url), 'utf8'))
  .replace(/^import .*;$/m, '')
  .replace(/\bimport\(/g, 'importModule(');
const pending = () => new Promise(() => {});

async function setup({ complete = true, decode = async () => {}, reduced = false } = {}) {
  const idle = [], classes = new Set(), imports = [];
  const globe = { dataset: {} };
  const artwork = { complete, decode, addEventListener() {} };
  const entrance = {
    hidden: false,
    classList: { add: name => classes.add(name) },
    querySelector: selector => selector === '.portal-globe' ? globe : artwork
  };
  await runInNewContext(`(async () => { ${source} })()`, {
    document: { getElementById: () => entrance, addEventListener() {} },
    navigator: {}, window: { requestIdleCallback: true },
    matchMedia: () => ({ matches: reduced, addEventListener() {} }),
    requestIdleCallback: callback => idle.push(callback),
    requestAnimationFrame: callback => callback(),
    console,
    importModule: async path => {
      imports.push(path);
      return path.includes('portal-hand.js') ? { loadHandRig: pending } : {};
    }
  });
  await Promise.resolve();
  idle.forEach(callback => callback());
  await Promise.resolve();
  return { classes, imports, globe };
}

test('a pending optional hand atlas cannot hide the decoded fallback or delay Earth', async () => {
  const ui = await setup();
  assert.ok(ui.classes.has('has-artwork'));
  assert.ok(ui.imports.some(path => path.includes('/globe.js')));
});

test('Earth starts even while the fallback hand is still downloading or decoding', async () => {
  for (const options of [{ complete: false }, { decode: pending }]) {
    const ui = await setup(options);
    assert.ok(ui.imports.some(path => path.includes('/globe.js')));
  }
});

test('reduced motion selects the static Earth without waiting for hand assets', async () => {
  const ui = await setup({ complete: false, reduced: true });
  assert.equal(ui.globe.dataset.globeState, 'static');
  assert.ok(!ui.imports.some(path => path.includes('/globe.js')));
});
