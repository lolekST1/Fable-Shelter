// Sent from inside the pen to the cauldron (a tap or __go), the keeper must leave by the front gate, not walk
// straight west into the fence corner by the gate (it got stuck at about (-2.95, 1.23) or (-3.1, 0.6)).
// Slow steps (?dtmax=0.4) made it worse, so several fresh games run with them. Screenshot out/gate.png.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const RUNS = +(process.env.RUNS ?? 4);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
for (let run = 1; run <= RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(BASE + '?reset=1&nostory&dtmax=0.4');
  await p.waitForFunction(() => window.__G?.()?.stations?.length && window.__keeper?.(), null, { timeout: 60000 });
  await p.waitForTimeout(1500 + run * 700); // a different moment each run (patients walking in)
  const start = await p.evaluate(() => window.__keeper());
  // every frame's position, recorded in the page (once a second would miss the gate: it takes under a second)
  await p.evaluate(() => {
    window.__track = [];
    const rec = () => { window.__track.push(window.__keeper()); requestAnimationFrame(rec); };
    rec();
    window.__go(-5.5, 2.3);
  });
  await p.waitForFunction(() => { const [x, z] = window.__keeper(); return Math.hypot(x + 5.5, z - 2.3) < 1.2; }, null, { timeout: 20000 }).catch(() => {});
  const track = await p.evaluate(() => window.__track);
  const [x, z] = track[track.length - 1];
  const there = Math.hypot(x + 5.5, z - 2.3) < 1.2;
  // where the keeper crossed the fence circle (r 3.6): the front gate is the opening at |x| < 0.9
  const cross = [];
  for (let i = 1; i < track.length; i++) {
    const [x0, z0] = track[i - 1], [x1, z1] = track[i], r0 = Math.hypot(x0, z0), r1 = Math.hypot(x1, z1);
    if ((r0 - 3.6) * (r1 - 3.6) < 0) { const t = (3.6 - r0) / (r1 - r0); cross.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]); }
  }
  const gate = cross.length > 0 && cross.every(([cx, cz]) => Math.abs(cx) < 0.9 && cz > 0);
  if (run === 1) await p.screenshot({ path: 'out/gate.png', timeout: 150000 });
  const f = (v) => `(${v.map((n) => n.toFixed(2))})`;
  check(gate && there, `run ${run}: from ${f(start)} out by the gate ${cross.map(f).join(' ')} and to the cauldron ${f([x, z])} (${track.length} frames)`);
  await p.close();
}
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
