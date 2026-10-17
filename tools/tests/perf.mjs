// Draw calls at a few places with everything built (all decorations, every area open): the camp, the decorations,
// the pond, the glade, the snowy hill and the bay. Prints a table; fails if the camp goes over BUDGET calls.
//   BUDGET=110 node tests/perf.mjs      (GAME_URL picks another build)
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const BUDGET = +(process.env.BUDGET ?? 110);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 200 })));
// full quality, locked: the saving mode would turn shadows off in this slow browser
await p.goto(BASE + '?dtmax=0.4&quality=0&nostory'); await p.waitForTimeout(12000);
const places = [['obóz', 0, 3], ['ozdoby', 4, 8], ['staw', 0, -13], ['polana', 15, 1.5], ['śnieg', -12.5, 6], ['zatoczka', -12.5, -5.5], ['obóz', 0, 3]];
const out = {};
for (const [name, x, z] of places) {
  await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]); await p.waitForTimeout(9000);
  const calls = [];
  for (let i = 0; i < 5; i++) { calls.push(await p.evaluate(() => window.__calls())); await p.waitForTimeout(200); }
  out[name] = Math.max(...calls);
}
console.log(JSON.stringify(out));
// steadier than draw calls (those change with patients and particles): visible meshes in the whole scene
const meshes = await p.evaluate(() => { let n = 0; window.__G().d.scene.traverseVisible((o) => { if (o.isMesh) n++; }); return n; });
console.log('visible meshes in the scene', meshes);
await b.close();
console.log(out['obóz'] <= BUDGET ? 'all OK' : `1 FAILED camp ${out['obóz']} > ${BUDGET}`);
