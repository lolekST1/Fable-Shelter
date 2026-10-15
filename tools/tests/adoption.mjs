// Adoption: a resident that reaches four hearts waits by its bed, someone walks out of the shelter house,
// they hug, the adoption heart and coins drop, and both go back into the house. With the keeper standing next
// to them the farewell bonus makes more coins. (The camp helper fills the last need so the keeper can stand still.)
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

const run = async (keeperAt, label) => {
  const p = await b.newPage({ viewport:{width:390,height:844} });
  p.on('pageerror',e=>console.log('ERR '+e.message));
  await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 10, hearts: 3, residents: [{ name: 'chmurnik', hearts: 3 }] })));
  await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  if (keeperAt) await p.evaluate(([x, z]) => window.__walk(x, z), keeperAt);
  const start = await p.evaluate(() => window.__game());
  const states = new Set();
  let shot = false, coinsAfter = null, gone = false;
  for (let t = 0; t < 150 && !gone; t++) {
    const st = await p.evaluate(() => window.__game());
    for (const a of st.adopters) states.add(a[0]);
    if (st.adopters.some((a) => a[0] === 'hug') && !shot) { shot = true; await p.screenshot({ path: `out/adopt_${label}.png`, timeout: 150000 }); }
    if (states.has('go') && coinsAfter === null) { await p.waitForTimeout(4000); coinsAfter = (await p.evaluate(() => window.__game())).coins; }
    gone = states.has('go') && st.adopters.length === 0 && !st.residents.some((r) => r[0] === 'chmurnik' && r[3] >= 3);
    await p.waitForTimeout(500);
  }
  const end = await p.evaluate(() => window.__game());
  check(['come', 'hug', 'go'].every((s) => states.has(s)), `${label}: adopter came, hugged and left (${[...states]})`);
  check(end.hearts === start.hearts + 1, `${label}: adoption heart counted (${start.hearts} -> ${end.hearts})`);
  check(gone, `${label}: adopter and resident gone into the house`);
  await p.close();
  return coinsAfter ?? 0;
};
const far = await run(null, 'far');
const near = await run([-1.1, -1.4], 'near'); // right by the bed
console.log('coins after farewell: keeper far', far, 'keeper near', near);
check(near > far, `farewell bonus when the keeper is there (${far} vs ${near})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
