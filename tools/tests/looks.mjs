// Same views of a fully built world, for before/after comparisons of models (e.g. simpler meshes):
//   TAG=before node tests/looks.mjs   ...change models, rebuild...   TAG=after node tests/looks.mjs
// Writes out/looks_<place>_<TAG>.png. Full quality, no cards, the same save every time.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const TAG = process.env.TAG ?? 'now';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 200, residents: [{ name: 'chmurnik', hearts: 1 }, { name: 'smok', hearts: 2 }, { name: 'yeti', hearts: 1 }, { name: 'syrenka', hearts: 1 }] })));
await p.goto(BASE + '?quality=0&nostory&dtmax=0.4');
await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });
await p.waitForTimeout(15000);
const places = [['oboz', -3.5, 5], ['dom', -7, 0.5], ['staw', 0, -13], ['polana', 15, 1.5], ['snieg', -12.5, 6], ['zatoczka', -13, -4.5]];
for (const [name, x, z] of places) {
  await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]);
  await p.waitForTimeout(9000);
  await p.screenshot({ path: `out/looks_${name}_${TAG}.png`, timeout: 150000 });
}
console.log('ok', TAG);
await b.close();
