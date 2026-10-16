// Playing on the decorations: idle camp residents go (through the pen gates, not the fence) to a free swing,
// fountain or carousel, ride or splash there for a while (up on the seat), one per decoration, then go home.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
const residents = ['chmurnik', 'smok', 'feniks', 'gryf', 'grzybolak', 'kraken'].map((name) => ({ name, hearts: 0 }));
await p.addInitScript((r) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 150, residents: r })), residents);
await p.goto(BASE + '?dtmax=0.4'); await p.waitForTimeout(12000);
await p.evaluate(() => { const G = window.__G(); G.playChance = 1; });
await p.evaluate(() => window.__walk(7.0, 8.6));

const kinds = new Set(), heights = {}, fence = [], states = new Set();
let shot = false, twoOnOne = 0;
for (let t = 0; t < 140; t++) {
  const s = await p.evaluate(() => {
    const G = window.__G();
    for (const r of G.residents) r.needT = 999; // keep needs away so they are free to play
    return G.residents.map((r) => [r.state, r.toy?.userData.decor ?? null, +r.c.root.position.x.toFixed(2), +r.c.root.position.y.toFixed(2), +r.c.root.position.z.toFixed(2)]);
  });
  const riding = {};
  for (const [st, kind, x, y, z] of s) {
    states.add(st);
    if (st === 'play') { kinds.add(kind); heights[kind] = Math.max(heights[kind] ?? 0, y); riding[kind] = (riding[kind] ?? 0) + 1; }
    const rr = Math.hypot(x, z);
    if ((st === 'playGo' || st === 'playBack') && rr > 3.4 && rr < 4.1 && Math.abs(x) > 1.0) fence.push(`${st}@${x},${z}`);
  }
  if (Object.values(riding).some((n) => n > 1)) twoOnOne++;
  if (!shot && riding.swing) { shot = true; await p.screenshot({ path: 'out/play_swing.png', timeout: 150000 }); }
  await p.waitForTimeout(300);
}
check(['swing', 'fountain', 'carousel'].every((k) => kinds.has(k)), `residents played on every decoration (${[...kinds]})`);
check((heights.swing ?? 0) > 0.3 && (heights.carousel ?? 0) > 0.6, `up on the swing and the carousel seat (${JSON.stringify(heights)})`);
check(twoOnOne === 0, `one resident per decoration (${twoOnOne} samples with two)`);
check(fence.length === 0, `to and from the decorations through the gates, not the fence (${fence.slice(0, 4)})`);
check(states.has('playBack') && states.has('idle'), `they go home afterwards (${[...states]})`);
const kept = await p.evaluate(() => window.__G().props.filter((o) => o.userData.decor).map((o) => [o.userData.decor, !!o.parent]));
check(kept.length === 4 && kept.every((d) => d[1]), `decorations stay in the scene (${JSON.stringify(kept)})`);
console.log('draw calls', await p.evaluate(() => window.__calls()));
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
