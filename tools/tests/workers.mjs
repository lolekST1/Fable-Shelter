// Hired area helpers: with the camp helper bought and the keeper standing idle, the camp runs on its own:
// patients get cured (coins), residents get fed and tucked in (hearts), nothing goes astray.
// Also checks that an old save (no `ver`) is shifted past the inserted helper spots.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const open = async (save) => {
  const p = await b.newPage({ viewport:{width:390,height:844} });
  p.on('pageerror',e=>console.log('ERR '+e.message));
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  return p;
};

// an old save with the bridge bought (10 purchases before the helpers existed) becomes 11 with the camp helper
let p = await open({ coins: 0, bought: 10, hearts: 3 });
let sp = await p.evaluate(() => window.__spots());
let st = await p.evaluate(() => window.__game());
check(sp.bought === 11 && st.workers.length === 1, `old save migrated (bought ${sp.bought}, workers ${JSON.stringify(st.workers)})`);
await p.close();

// the camp with its helper; the keeper never moves
p = await open({ ver: 2, coins: 0, bought: 10, hearts: 3, residents: [{ name: 'chmurnik', hearts: 0 }, { name: 'smok', hearts: 0 }, { name: 'feniks', hearts: 0 }] });
const start = await p.evaluate(() => window.__game());
const states = new Set();
let shot = 0;
for (let t = 0; t < 120; t++) {
  st = await p.evaluate(() => window.__game());
  for (const w of st.workers) states.add(w[1]);
  if (st.workers[0]?.[1] === 'bring' && shot < 2) await p.screenshot({ path: `out/w${shot++}.png`, timeout: 150000 });
  await p.waitForTimeout(1000);
}
const hearts = (s) => s.residents.reduce((a, r) => a + r[3], 0);
console.log('end', JSON.stringify({ coins: st.coins, residents: st.residents.map((r) => r.slice(0, 4)), workers: st.workers }));
check(st.coins > start.coins, `patients cured without the keeper (coins ${start.coins} -> ${st.coins})`);
check(hearts(st) > hearts(start) || st.residents.length !== start.residents.length, `residents cared for without the keeper (hearts ${hearts(start)} -> ${hearts(st)})`);
check(['go', 'bring', 'tuck'].every((s) => states.has(s)), `helper went through its jobs (${[...states]})`);
const strays = await p.evaluate(() => window.__strays());
check(strays.length === 0, `nothing astray (${JSON.stringify(strays)})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
