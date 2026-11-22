// Rules from CLAUDE.md that a script can check, so they don't depend on anyone remembering them.
// Runs before every build (`npm run build`, `npm run build:poki`) and on its own: `node tools/zasady.mjs`.
// Other rules live in types: t() in src/i18n.ts takes only texts that have a row of translations.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const errors = [];
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []);

// 1. A renderer made by hand can miss `precision: 'mediump'`, and on WebGL 1 tablets (Adreno 308) it draws black.
//    The only `new WebGLRenderer` is inside makeRenderer() in src/main.ts.
for (const f of files(join(root, 'src'))) {
  readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/new\s+(THREE\.)?WebGLRenderer\s*\(/.test(line) && !line.includes('const makeRenderer')) {
      errors.push(`${relative(root, f)}:${i + 1}: renderer bez makeRenderer() (main.ts), więc bez mediump na starych tabletach`);
    }
  });
}

// 2. three.js stays at 0.162.0, the last version with WebGL 1 (check tests/nowebgl2.mjs before any change).
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
for (const [where, v] of [
  ['package.json dependencies.three', pkg.dependencies?.three],
  ['package.json devDependencies.@types/three', pkg.devDependencies?.['@types/three']],
  ['package-lock.json node_modules/three', lock.packages?.['node_modules/three']?.version],
]) {
  if (v !== '0.162.0') errors.push(`${where} = ${v}, a ma być dokładnie 0.162.0 (ostatnia wersja z WebGL 1)`);
}

if (errors.length) {
  console.error('Zasady z CLAUDE.md nie są spełnione:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('zasady: OK');
