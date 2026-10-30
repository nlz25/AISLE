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
