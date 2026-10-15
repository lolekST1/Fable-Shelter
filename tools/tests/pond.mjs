// Pond: the brook blocks the keeper before the bridge; once it is built the keeper crosses, a pond patient sits
// by the water and the keeper walks round the water, not over it. (Buying every spot is covered by prog.mjs.)
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const run = async (bought, fn) => {
  const p = await b.newPage({ viewport:{width:390,height:844} });
  p.on('pageerror',e=>console.log('ERR '+e.message));
  await p.addInitScript((n) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ coins: 0, bought: n, hearts: 3 })), bought);
  await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  await fn(p, async (x, z, ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); }, () => p.evaluate(() => window.__keeper()));
  await p.close();
};
// the whole camp, no bridge yet
await run(9, async (p, walk, K) => {
  await walk(0, -2.5, 4000); await walk(0, -12, 6000);
  const k = await K();
  check(k[1] > -8.5, `brook blocks the keeper (at ${k.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/pd0.png', timeout: 150000 });
});
// bridge built
await run(10, async (p, walk, K) => {
  await walk(0, -2.5, 4000); await walk(0, -7.8, 4000); await walk(0, -11, 5000);
  let k = await K();
  check(k[1] < -10, `keeper crosses the bridge (at ${k.map((v) => v.toFixed(1))})`);
  await p.waitForTimeout(8000);
  const st = await p.evaluate(() => window.__game());
  check(st.patients.some((x) => x[2] < -10 && x[0] !== 'cured' && x[0] !== 'leaving'), `a patient sits by the pond (${JSON.stringify(st.patients)})`);
  check(st.tray.some((t) => t.startsWith('purple')), `lily station is there (${st.tray})`);
  await walk(0.6, -14.6, 6000);
  k = await K();
  check(Math.hypot(k[0] - 0.6, k[1] + 14.6) > 2.4, `keeper stays out of the water (at ${k.map((v) => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/pd1.png', timeout: 150000 });
});
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
