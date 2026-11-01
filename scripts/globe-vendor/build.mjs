import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '../../public/assets/vendor');
await mkdir(output, { recursive: true });
const result = await build({
  absWorkingDir: here,
  entryPoints: ['entry.js'],
  outfile: resolve(output, 'globe.gl.js'),
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  // The example addon targets opaque canvases. Its additive sprites must
  // preserve destination alpha on our transparent canvas, otherwise their
  // footprint can occlude the CSS background even at very low light energy.
  plugins: [{
    name: 'lensflare-preserve-canvas-alpha',
    setup(plugin) {
      plugin.onLoad({ filter: /[/\\]objects[/\\]Lensflare\.js$/ }, async ({ path }) => {
        const original = await readFile(path, 'utf8');
        const importMarker = '\tAdditiveBlending,';
        const blendMarker = '\t\t\tblending: AdditiveBlending,';
        if (!original.includes(importMarker) || !original.includes(blendMarker)) {
          throw new Error('Review the transparent-alpha Lensflare patch after upgrading Three.js.');
        }
        const contents = original
          .replace(importMarker, '\tCustomBlending,\n\tAddEquation,\n\tSrcAlphaFactor,\n\tOneFactor,\n\tZeroFactor,')
          .replace(blendMarker, `\t\t\tblending: CustomBlending,
            blendEquation: AddEquation,
            blendSrc: SrcAlphaFactor,
            blendDst: OneFactor,
            blendEquationAlpha: AddEquation,
            blendSrcAlpha: ZeroFactor,
            blendDstAlpha: OneFactor,`);
        return { contents, loader: 'js', resolveDir: dirname(path) };
      });
    }
  }],
  legalComments: 'eof',
  metafile: true,
  banner: { js: '/* Globe.gl local bundle. Versions and licenses: globe.LICENSES.txt. */' }
});
const packages = [...new Set(Object.keys(result.metafile.inputs)
  .filter(path => path.startsWith('node_modules/'))
  .map(path => path.split('/').slice(0, path.split('/')[1].startsWith('@') ? 3 : 2).join('/')))].sort();
const licenses = [];
for (const path of packages) {
  const pkg = JSON.parse(await readFile(resolve(here, path, 'package.json'), 'utf8'));
  let license;
  for (const name of ['LICENSE', 'LICENSE.txt', 'LICENSE.md', 'license', 'license.txt']) {
    try { license = await readFile(resolve(here, path, name), 'utf8'); break; } catch { /* Try next conventional name. */ }
  }
  if (!license) throw new Error(`Missing license for ${pkg.name}`);
  licenses.push(`${pkg.name}@${pkg.version}\n${license.trim()}`);
}
await writeFile(resolve(output, 'globe.LICENSES.txt'), licenses.join('\n\n--------------------\n\n') + '\n');
const bundle = await readFile(resolve(output, 'globe.gl.js'));
console.log(`Globe.gl bundle: ${bundle.length} bytes; ${gzipSync(bundle).length} bytes gzip.`);
