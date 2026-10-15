// Progression: buy every build spot in order (positions and prices read from window.__spots, coins and hearts
// granted), walking through the pen gates, over the bridge and through the hedge gap like a player would.
// Then reload: every purchase should survive.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))console.log('CONSOLE '+m.text())});
await p.goto(BASE+'?dtmax=0.4&reset=1'); await p.waitForTimeout(12000);
const K = () => p.evaluate(() => window.__keeper());
const SP = () => p.evaluate(() => window.__spots());
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

/** walk to one point and wait until the keeper is there (or stuck) */
const step = async (x, z) => {
  await p.evaluate(([x, z]) => window.__walk(x, z), [x, z]);
  let last = null;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(500);
    const k = await K();
    if (Math.hypot(k[0] - x, k[1] - z) < 0.3) return;
    if (last && Math.hypot(k[0] - last[0], k[1] - last[1]) < 0.01 && i > 4) return; // not moving any more
    last = k;
  }
};
const inPen = (x, z) => Math.hypot(x, z) < 3.6;
const north = (z) => z < -9;
const glade = (x, z) => x > 10.6 && Math.hypot(x, z) > 10.6;
/** the way a player walks: out of the pen through a gate, over the bridge or through the hedge gap, into the pen */
const go = async (x, z) => {
  let [kx, kz] = await K();
  const pts = [];
  if (inPen(kx, kz) && !inPen(x, z)) pts.push(...(north(z) || z < 0 ? [[0, -2.8], [0, -4.4]] : [[0, 2.8], [0, 4.3]]));
  if (glade(kx, kz) && !glade(x, z)) pts.push([10.4, 1.0]);
  if (north(kz) !== north(z)) pts.push(...(north(z) ? [[0, -7.8], [0, -10.3]] : [[0, -10.3], [0, -7.8]]));
  if (glade(x, z) && !glade(kx, kz)) pts.push([10.4, 1.0]);
  if (inPen(x, z) && !inPen(kx, kz)) pts.push(...(z < 0 && !north(kz) && kz < 0 ? [[0, -4.4], [0, -2.8]] : [[0, 4.3], [0, 2.8]]));
  pts.push([x, z]);
  for (const [px, pz] of pts) await step(px, pz);
};

let info = await SP();
const total = info.total;
for (let n = 0; n < total; n++) {
  info = await SP();
  const s = info.spots.find((s) => s[0] === info.bought);
  if (!s) { check(false, `spot ${info.bought} is on show`); break; }
  const [i, x, z, price, hearts] = s;
  await p.evaluate(([c, h]) => { window.__coins(c); if (h) window.__hearts(h); }, [price, hearts]);
  await go(x, z);
  for (let t = 0; t < 30 && (await SP()).bought === i; t++) await p.waitForTimeout(500);
  const now = await SP();
  check(now.bought === i + 1, `spot ${i} (price ${price}${hearts ? `, ${hearts} hearts` : ''}) at ${x},${z} bought`);
  if (now.bought !== i + 1) { console.log('keeper', JSON.stringify(await K())); await p.screenshot({ path: `out/prog_fail_${i}.png`, timeout: 150000 }); break; }
}
await p.screenshot({path:'out/p1.png', timeout:150000});
// reload: progress should survive (the pagehide save writes it)
await p.goto(BASE+'?dtmax=0.4'); await p.waitForTimeout(14000);
const after = await SP();
check(after.bought === total, `purchases survive a reload (${after.bought}/${total})`);
await p.screenshot({path:'out/p3.png', timeout:150000});
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
