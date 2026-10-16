// Snowy hill (terrain 4): the snowdrift blocks the keeper until it is dug through; then the keeper walks in,
// snow patients sit in the snow, the campfire brews cocoa and cocoa cures them; the way back leads through the gap.
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
const K = (p) => p.evaluate(() => window.__keeper());
const S = (p) => p.evaluate(() => window.__game());
// the snowy hill's middle: 15 m from the camp centre at 2.7 rad
const SX = Math.cos(2.7) * 15, SZ = Math.sin(2.7) * 15;
const inSnow = (x, z) => Math.hypot(x - SX, z - SZ) < 6.5 && Math.hypot(x, z) > 10.6;
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

// 1. everything up to the glade helper bought: the drift stops the keeper; the next spot is the shovel
await run({ ver: 2, coins: 0, bought: 20, hearts: 60 }, async (p) => {
  const sp = await p.evaluate(() => window.__spots());
  check(sp.spots[0]?.[0] === 20 && sp.spots[0][4] === 90, `shovel spot next, 90 hearts (${JSON.stringify(sp.spots[0])})`);
  await walk(p, SX, SZ, 9000);
  const k = await K(p);
  check(Math.hypot(k[0], k[1]) < 11.2, `snowdrift blocks the keeper (at ${k.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/snow0.png', timeout: 150000 });
});

// 2. the whole hill bought
await run({ ver: 2, coins: 0, bought: 99, hearts: 120, residents: [{ name: 'yeti', hearts: 1 }, { name: 'renifer', hearts: 0 }, { name: 'pingwinek', hearts: 2 }] }, async (p) => {
  await walk(p, SX, SZ, 9000);
  const k = await K(p);
  check(inSnow(k[0], k[1]), `keeper walks onto the snowy hill (at ${k.map((v) => v.toFixed(1))})`);
  await p.waitForTimeout(8000);
  let st = await S(p);
  check(st.tray.some((t) => t.startsWith('cocoa') && +t.slice(5) > 0), `the campfire brews cocoa (${st.tray})`);
  check(st.residents.filter((r) => ['yeti', 'renifer', 'pingwinek'].includes(r[0]) && inSnow(r[6], r[7])).length === 3, `snow residents have blanket beds on the hill (${JSON.stringify(st.residents.map((r) => [r[0], r[6], r[7]]))})`);
  const sick = st.patients.filter((x) => inSnow(x[1], x[2]) && x[0] !== 'cured' && x[0] !== 'leaving');
  check(sick.length > 0, `a patient sits in the snow (${JSON.stringify(st.patients)})`);
  await p.screenshot({ path: 'out/snow1.png', timeout: 150000 });
  // take cocoa (and spring water for the snowman) and hand it out
  const fire = await p.evaluate(() => window.__G().stations.find((s) => s.kind === 'cocoa').pos);
  await walk(p, fire.x - 0.2, fire.z + 0.9, 5000);
  st = await S(p);
  check(st.carryKinds.includes('cocoa'), `keeper picks up cocoa (${st.carryKinds})`);
  const before = st.coins;
  // the snowman wants spring water, the rest cocoa: go to those that want cocoa
  const cocoaPatient = () => p.evaluate(() => window.__G().patients.filter((x) => x.sp.cure === 'cocoa' && (x.state === 'waiting' || x.state === 'arriving')).map((x) => [x.c.root.position.x, x.c.root.position.z])[0]);
  for (let i = 0; i < 8; i++) {
    const s = await cocoaPatient();
    if (!s) { await p.waitForTimeout(3000); continue; }
    await walk(p, s[0], s[1], 3500);
  }
  await p.waitForTimeout(4000);
  st = await S(p);
  check(st.coins > before, `cocoa cures snow patients (coins ${before} -> ${st.coins})`);
  await p.screenshot({ path: 'out/snow2.png', timeout: 150000 });
  // back to the camp through the gap
  await p.evaluate(() => window.__go(0, 6)); await p.waitForTimeout(12000); // like a tap: back through the gap
  const k2 = await K(p);
  check(Math.hypot(k2[0], k2[1] - 6) < 1.5, `keeper walks back to the camp (at ${k2.map((v) => v.toFixed(1))})`);
  console.log('strays', JSON.stringify(await p.evaluate(() => window.__strays())));
});
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
