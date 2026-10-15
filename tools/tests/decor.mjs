// Camp decorations after the last area: swing, fountain, carousel and the keeper's golden statue.
// They come after the snow helper as build spots, each one makes every cure pay a little more.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const run = async (save, fn) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('CONSOLE ' + m.text()); });
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const walk = async (p, x, z, ms) => { await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]); await p.waitForTimeout(ms); };
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

// 1. everything up to the snow helper bought: the swing is the next spot
await run({ ver: 2, coins: 0, bought: 25, hearts: 120 }, async (p) => {
  const sp = await p.evaluate(() => window.__spots());
  check(sp.total === 29 && sp.spots[0]?.[0] === 25 && sp.spots[0][3] === 2900, `swing spot next (${JSON.stringify(sp)})`);
  check(await p.evaluate(() => window.__G().cheer) === 0, 'no decorations yet');
  await walk(p, 6.2, 7.6, 6000);
  await p.screenshot({ path: 'out/decor0.png', timeout: 150000 });
});

// 2. all of them bought: four decorations, cures pay 8 coins more; the keeper walks round them
await run({ ver: 2, coins: 0, bought: 99, hearts: 140 }, async (p) => {
  check(await p.evaluate(() => window.__G().cheer) === 4, 'four decorations');
  const n = await p.evaluate(() => window.__G().circles().filter((c) => c[2] >= 0.6 && c[2] <= 1.1).length);
  check(n >= 4, `decorations block the way (${n} wide circles)`);
  for (const [i, x, z] of [[1, 7.0, 6.2], [2, 3.6, 9.2], [3, -7.4, -5.2], [4, -2.2, 9.6]]) {
    await walk(p, x, z, 8000);
    const k = await p.evaluate(() => window.__keeper());
    check(Math.hypot(k[0] - x, k[1] - z) > 0.5, `keeper stays off decoration ${i} (at ${k.map((v) => v.toFixed(1))})`);
    await walk(p, x, z + 2.4, 3000);
    await p.screenshot({ path: `out/decor${i}.png`, timeout: 150000 });
  }
  console.log('draw calls', await p.evaluate(() => window.__calls()));
});

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
