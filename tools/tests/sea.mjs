// The bay (terrain 5): the sand dune keeps the keeper out until the boardwalk is built; then the keeper walks in,
// bay patients sit on the beach, the shell makes pearls and pearls cure them; the way back leads through the gap.
// The dune must not cut into the shelter house, and nothing of the bay may stand beyond the brook.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const run = async (save, fn) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ' + m.text()); });
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const walk = async (p, x, z, ms) => { await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]); await p.waitForTimeout(ms); };
const K = (p) => p.evaluate(() => window.__keeper());
const S = (p) => p.evaluate(() => window.__game());
const A = -2.6, SX = Math.cos(A) * 15, SZ = Math.sin(A) * 15;
const onBeach = (x, z) => Math.hypot(x - SX, z - SZ) < 6.5 && Math.hypot(x, z) > 10.6 && z > -9;
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

// 1. everything up to the decorations bought: the dune stops the keeper; the next spot is the boardwalk
await run({ ver: 2, coins: 0, bought: 29, hearts: 140 }, async (p) => {
  const sp = await p.evaluate(() => window.__spots());
  check(sp.total === 34 && sp.spots[0]?.[0] === 29 && sp.spots[0][4] === 150, `boardwalk spot next, 150 hearts (${JSON.stringify(sp.spots[0])})`);
  await walk(p, SX + 1, SZ + 2, 9000);
  const k = await K(p);
  check(Math.hypot(k[0], k[1]) < 11.2, `the dune blocks the keeper (at ${k.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/sea0.png', timeout: 150000 });
});

// 2. the whole bay bought
await run({ ver: 2, coins: 0, bought: 99, hearts: 200, residents: [{ name: 'krabik', hearts: 1 }, { name: 'foczka', hearts: 0 }, { name: 'syrenka', hearts: 2 }] }, async (p) => {
  const layout = await p.evaluate(() => {
    const G = window.__G();
    return { beds: G.beds.filter((x) => x.zone === 'sea').map((x) => [x.pos.x, x.pos.z]), station: G.stations.find((s) => s.kind === 'pearl')?.pos, house: [-9.2, -1.4],
      dune: G.dune.map((h) => [h.position.x, h.position.z, !!h.parent]) };
  });
  check(layout.beds.length === 3 && layout.station, `three shell beds and the pearl shell (${JSON.stringify(layout.beds)})`);
  check([...layout.beds, [layout.station.x, layout.station.z]].every(([x, z]) => z > -8 && onBeach(x, z)), 'all of the bay stands on the beach south of the brook');
  check(layout.dune.every(([x, z]) => Math.hypot(x + 9.2, z + 1.4) > 1.6), 'the dune keeps clear of the shelter house');
  await walk(p, SX + 1, SZ + 2.5, 10000);
  const k = await K(p);
  check(onBeach(k[0], k[1]), `keeper walks onto the beach (at ${k.map((v) => v.toFixed(1))})`);
  await p.waitForTimeout(8000);
  let st = await S(p);
  check(st.tray.some((t) => t.startsWith('pearl') && +t.slice(5) > 0) || st.carryKinds.includes('pearl'), `the shell makes pearls (${st.tray}, carried ${st.carryKinds})`);
  check(st.residents.filter((r) => ['krabik', 'foczka', 'syrenka'].includes(r[0]) && onBeach(r[6], r[7])).length === 3, `bay residents have shell beds on the beach (${JSON.stringify(st.residents.map((r) => [r[0], r[6], r[7]]))})`);
  let sick = [];
  for (let t = 0; t < 12 && !sick.length; t++) {
    st = await S(p);
    sick = st.patients.filter((x) => onBeach(x[1], x[2]) && x[0] !== 'cured' && x[0] !== 'leaving');
    if (!sick.length) await p.waitForTimeout(2000);
  }
  check(sick.length > 0 && sick.every((x) => x[2] > -8), `a patient sits on the beach, south of the brook (${JSON.stringify(st.patients)})`);
  await p.screenshot({ path: 'out/sea1.png', timeout: 150000 });
  // take pearls and hand them out
  const shell = await p.evaluate(() => window.__G().stations.find((s) => s.kind === 'pearl').pos);
  await walk(p, shell.x - 0.2, shell.z + 0.9, 5000);
  st = await S(p);
  check(st.carryKinds.includes('pearl'), `keeper picks up pearls (${st.carryKinds})`);
  const before = st.coins;
  const pearlPatient = () => p.evaluate(() => window.__G().patients.filter((x) => x.sp.cure === 'pearl' && (x.state === 'waiting' || x.state === 'arriving')).map((x) => [x.c.root.position.x, x.c.root.position.z])[0]);
  for (let i = 0; i < 8; i++) {
    const s = await pearlPatient();
    if (!s) { await p.waitForTimeout(3000); continue; }
    await walk(p, s[0], s[1], 3500);
  }
  await p.waitForTimeout(4000);
  st = await S(p);
  check(st.coins > before, `pearls cure bay patients (coins ${before} -> ${st.coins})`);
  await p.screenshot({ path: 'out/sea2.png', timeout: 150000 });
  await walk(p, 0, 6, 12000);
  const k2 = await K(p);
  check(Math.hypot(k2[0], k2[1] - 6) < 1.5, `keeper walks back to the camp (at ${k2.map((v) => v.toFixed(1))})`);
  console.log('strays', JSON.stringify(await p.evaluate(() => window.__strays())), 'draw calls', await p.evaluate(() => window.__calls()));
});
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
