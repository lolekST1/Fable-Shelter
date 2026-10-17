// New player: walks only where the guide arrow points. Must finish the tutorial, then get pointed at
// a new station, the offline chest and the wardrobe door, each once.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message));
await p.goto(BASE+'?dtmax=0.4&reset=1'); await p.waitForTimeout(12000);
const guide = () => p.evaluate(() => { const G = window.__G(), g = G.guide; return { step: G.step, on: g.visible, x: g.position.x, z: g.position.z }; });
const follow = async (rounds, done) => {
  for (let i = 0; i < rounds; i++) {
    if (await p.evaluate(done)) return true;
    const g = await guide();
    if (i % 10 === 9) console.log('  ', JSON.stringify(g));
    if (g.on) await p.evaluate(([x, z]) => window.__go(x, z), [g.x, g.z]);
    await p.waitForTimeout(2000);
  }
  return p.evaluate(done);
};
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };

check(await follow(90, () => window.__G().step >= 4), 'tutorial finished by following the arrow only');
await p.screenshot({ path: 'out/newplayer1.png', timeout: 150000 });

// a station of a new kind (as if a new area had just opened)
await p.evaluate(() => window.__G().addStation('purple', 2, 4, false));
await p.waitForTimeout(6000);
let g = await guide();
check(g.on && Math.hypot(g.x - 2, g.z - 4) < 0.1, 'arrow points at the new station');
check(await follow(15, () => window.__G().seen.has('purple')), 'keeper took from the new station');

// coins from the offline chest
await p.evaluate(() => window.__G().setChest(40));
g = await guide();
await p.waitForTimeout(500);
g = await guide();
const c = await p.evaluate(() => window.__G().chest.position);
check(g.on && Math.hypot(g.x - c.x, g.z - c.z) < 0.1, 'arrow points at the chest');
check(await follow(15, () => !window.__G().chest), 'arrow led to the chest');

// the wardrobe once there are coins for it
await p.evaluate(() => window.__coins(300));
check(await follow(20, () => window.__G().seen.has('wardrobe')), 'arrow led to the wardrobe');
await p.screenshot({ path: 'out/newplayer2.png', timeout: 150000 });
g = await guide();
check(!g.on || (await p.evaluate(() => window.__G().stations.some((s) => s.tray.length && !window.__G().seen.has(s.kind)))), 'nothing more to point at');

await b.close();
process.exit(fail ? 1 : 0);
