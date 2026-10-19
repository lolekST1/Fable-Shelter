// The crystal cave (terrain 6): the rock wall keeps the keeper out until the pickaxe is bought; then the keeper walks in,
// cave patients sit on the stone floor, the crystals grow shards and the shards cure them; the way back leads through the gap.
// Nothing of the cave may stand on the camp's herb bed, fountain or statue, nor overlap the snowy hill.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const run = async (save, fn, extra = '') => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ' + m.text()); });
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4&debug&quality=0' + extra); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const walk = async (p, x, z, ms) => { await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]); await p.waitForTimeout(ms); };
const K = (p) => p.evaluate(() => window.__keeper());
const S = (p) => p.evaluate(() => window.__game());
const A = 1.385, CX = Math.cos(A) * 15, CZ = Math.sin(A) * 15;
const inCave = (x, z) => Math.hypot(x - CX, z - CZ) < 5.3 && Math.hypot(x, z) > 10.6;
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

// 1. everything up to the bay helper bought: the rocks stop the keeper; the next spot is the pickaxe
await run({ ver: 2, coins: 0, bought: 34, hearts: 185 }, async (p) => {
  const sp = await p.evaluate(() => window.__spots());
  check(sp.total === 39 && sp.spots[0]?.[0] === 34 && sp.spots[0][4] === 190 && sp.spots[0][3] === 3800, `pickaxe spot next, 190 hearts (${JSON.stringify(sp.spots[0])})`);
  await walk(p, CX, CZ, 9000);
  const k = await K(p);
  check(Math.hypot(k[0], k[1]) < 11.2, `the rocks block the keeper (at ${k.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/cave0.png', timeout: 150000 });
  // buy it: hearts are there, coins come in
  await p.evaluate(() => { window.__hearts(10); window.__coins(4000); });
  const at = sp.spots[0];
  await walk(p, at[1], at[2], 9000);
  check(await p.evaluate(() => window.__G().caveOpen), 'standing on the spot opens the cave');
  await walk(p, CX - 0.5, CZ - 1, 9000);
  const k2 = await K(p);
  check(inCave(k2[0], k2[1]), `keeper walks into the cave (at ${k2.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/cave1.png', timeout: 150000 });
});

// 2. the whole cave bought
await run({ ver: 2, coins: 0, bought: 99, hearts: 260, residents: [{ name: 'nietoperek', hearts: 1 }, { name: 'kret', hearts: 0 }, { name: 'golemik', hearts: 2 }] }, async (p) => {
  const layout = await p.evaluate(() => {
    const G = window.__G();
    return { beds: G.beds.filter((x) => x.zone === 'cave').map((x) => [x.pos.x, x.pos.z]), station: G.stations.find((s) => s.kind === 'crystal')?.pos,
      camp: [...G.stations.filter((s) => s.kind === 'green').map((s) => [s.pos.x, s.pos.z]), ...G.props.filter((o) => o.userData.decor).map((o) => [o.position.x, o.position.z])] };
  });
  check(layout.beds.length === 3 && layout.station, `three stone beds and the crystals (${JSON.stringify(layout.beds)})`);
  check([...layout.beds, [layout.station.x, layout.station.z]].every(([x, z]) => inCave(x, z)), 'all of the cave stands on its floor');
  const gap = [Math.cos(A) * 10.45, Math.sin(A) * 10.45];
  check(layout.camp.every(([x, z]) => Math.hypot(x - gap[0], z - gap[1]) > 1.6), `the way in keeps clear of the herbs and decorations (${JSON.stringify(layout.camp)})`);
  const snow = [Math.cos(2.7) * 15, Math.sin(2.7) * 15], glade = [15, 1.5];
  check(Math.hypot(CX - snow[0], CZ - snow[1]) > 10.5 && Math.hypot(CX - glade[0], CZ - glade[1]) > 10.5, 'the cave does not overlap the snowy hill or the glade');
  await walk(p, CX - 0.5, CZ - 1.5, 10000);
  const k = await K(p);
  check(inCave(k[0], k[1]), `keeper walks into the cave (at ${k.map((v) => v.toFixed(1))})`);
  await p.waitForTimeout(8000);
  let st = await S(p);
  check(st.tray.some((t) => t.startsWith('crystal') && +t.slice(7) > 0) || st.carryKinds.includes('crystal'), `the crystals grow shards (${st.tray}, carried ${st.carryKinds})`);
  check(st.residents.filter((r) => ['nietoperek', 'kret', 'golemik'].includes(r[0]) && inCave(r[6], r[7])).length === 3, `cave residents have stone beds in the cave (${JSON.stringify(st.residents.map((r) => [r[0], r[6], r[7]]))})`);
  // the cave is the last area to get its own patient (pond, glade, snow and bay come first), so the check waits for the cure round
  const crystals = await p.evaluate(() => window.__G().stations.find((s) => s.kind === 'crystal').pos);
  await walk(p, crystals.x - 0.2, crystals.z + 0.9, 5000);
  st = await S(p);
  check(st.carryKinds.includes('crystal'), `keeper picks up crystal shards (${st.carryKinds})`);
  const before = st.coins;
  const crystalPatient = () => p.evaluate(() => window.__G().patients.filter((x) => x.sp.cure === 'crystal' && (x.state === 'waiting' || x.state === 'arriving')).map((x) => [x.c.root.position.x, x.c.root.position.z])[0]);
  const seen = [];
  for (let i = 0; i < 14; i++) {
    const s = await crystalPatient();
    if (!s) { await p.waitForTimeout(3000); continue; }
    if (!seen.length) await p.screenshot({ path: 'out/cave2.png', timeout: 150000 });
    seen.push(s);
    await walk(p, s[0], s[1], 3500);
  }
  await p.waitForTimeout(4000);
  st = await S(p);
  check(seen.length > 0 && seen.every(([x, z]) => inCave(x, z)), `cave patients sit in the cave (${JSON.stringify(seen)})`);
  check(st.coins > before, `shards cure cave patients (coins ${before} -> ${st.coins})`);
  await p.screenshot({ path: 'out/cave3.png', timeout: 150000 });
  await p.evaluate(() => window.__go(0, 6)); await p.waitForTimeout(12000); // like a tap: out through the gap in the rocks
  const k2 = await K(p);
  check(Math.hypot(k2[0], k2[1] - 6) < 1.5, `keeper walks back to the camp (at ${k2.map((v) => v.toFixed(1))})`);
  console.log('strays', JSON.stringify(await p.evaluate(() => window.__strays())), 'draw calls', await p.evaluate(() => window.__calls()));
});

// 3. at night the cave glows
await run({ ver: 2, coins: 0, bought: 99, hearts: 260 }, async (p) => {
  await walk(p, CX - 0.5, CZ - 2.5, 10000);
  await p.screenshot({ path: 'out/cave4.png', timeout: 150000 });
}, '&night');
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
