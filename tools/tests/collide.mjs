// Creatures, helpers and adopters walk round the shelter house and round the keeper instead of through them,
// and the keeper bumps into helpers and adopters too. The keeper stands in the pen's front gate, where everyone passes.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const HOUSE = [-9.2, -1.4];
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
const residents = ['chmurnik', 'smok', 'feniks', 'gryf', 'grzybolak', 'kraken'].map((name) => ({ name, hearts: 3 }));
await p.addInitScript((r) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 150, residents: r })), residents);
await p.goto(BASE + '?dtmax=0.4&debug'); await p.waitForTimeout(12000);
await p.evaluate(() => window.__walk(0, 3.6)); await p.waitForTimeout(5000);
let inHouse = [], onKeeper = [], adopted = 0, workerNear = 0;
for (let t = 0; t < 160; t++) {
  const st = await p.evaluate(() => window.__game());
  const k = await p.evaluate(() => window.__keeper());
  const who = [
    ...st.patients.map((x) => ['patient ' + x[0], x[1], x[2]]),
    ...st.residents.filter((r) => r[1] !== 'sleeping' && r[1] !== 'toSleep').map((r) => [r[0] + ' ' + r[1], r[4], r[5]]),
    ...st.workers.map((w) => ['worker ' + w[1], w[2], w[3]]),
    ...st.adopters.map((a) => ['adopter ' + a[0], a[2], a[3]]),
  ];
  for (const [n, x, z] of who) {
    if (Math.hypot(x - HOUSE[0], z - HOUSE[1]) < 1.6) inHouse.push(`${n}@${x},${z}`);
    const dk = Math.hypot(x - k[0], z - k[1]);
    if (dk < 0.45) onKeeper.push(`${n}@${x},${z} keeper ${k.map((v) => v.toFixed(1))}`);
    if (n.startsWith('worker') && dk < 1.2) workerNear++;
  }
  if (st.adopters.length) adopted++;
  await p.waitForTimeout(400);
}
check(adopted > 0, `adopters came out of the house (${adopted} samples)`);
check(workerNear > 0, `the camp helper passed close by the keeper (${workerNear} samples)`);
check(inHouse.length === 0, `nobody inside the shelter house (${inHouse.slice(0, 5)})`);
check(onKeeper.length === 0, `nobody walks through the keeper (${onKeeper.slice(0, 5)})`);
await p.screenshot({ path: 'out/collide.png', timeout: 150000 });

// a resident sent straight through the shelter house goes round it (walk() is what every creature uses)
const closest = await p.evaluate(() => {
  const G = window.__G(), c = G.residents[0].c;
  c.root.position.set(-12.5, 0, -1.4);
  const to = c.root.position.clone().set(-5.5, 0, -1.4);
  let min = 99;
  for (let i = 0; i < 400 && !G.walk(c, to, 2, 0.05); i++) min = Math.min(min, Math.hypot(c.root.position.x + 9.2, c.root.position.z + 1.4));
  return [min, c.root.position.x];
});
check(closest[0] > 1.6 && closest[1] > -5.6, `walking straight at the house goes round it (closest ${closest[0].toFixed(2)} m, ended at x ${closest[1].toFixed(2)})`);

// the keeper and everyone else walk over the arched footbridge, on top of the planks
await p.evaluate(() => window.__walk(0, -6)); await p.waitForTimeout(6000);
await p.evaluate(() => window.__walk(0, -13));
let top = 0, kz = [];
for (let t = 0; t < 120; t++) {
  const [y, z] = await p.evaluate(() => { const k = window.__G().d.keeper.root.position; return [Math.abs(k.z + 9) < 0.3 ? k.y : -1, k.z]; });
  top = Math.max(top, y);
  kz.push(z.toFixed(1));
  if (z < -10.5) break;
  await p.waitForTimeout(100);
}
check(top > 0.3, `keeper is up on the middle of the bridge (y ${top.toFixed(2)}, z ${kz.filter((_, i) => i % 6 === 0)})`);
const sunk = await p.evaluate(() => {
  const G = window.__G();
  return [...G.patients, ...G.residents, ...G.workers].map((o) => o.c.root.position)
    .filter((q) => Math.abs(q.x) < 0.6 && Math.abs(q.z + 9) < 1.0 && q.y < 0.15).length;
});
check(sunk === 0, `no creature sunk into the bridge (${sunk})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
