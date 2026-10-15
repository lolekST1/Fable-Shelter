// Nobody walks on the pond water: with the whole world built (pond helper, pond residents, patients coming and
// going) every creature stays out of the water circle (centre 0.6,-14.6, radius 2.6) for 90 s.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message));
await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 15,
  residents: ['zabiksiaze', 'nessie', 'wodnik'].map((name) => ({ name, hearts: 0 })) })));
await p.goto(BASE+'?dtmax=0.4'); await p.waitForTimeout(12000);
await p.evaluate(() => window.__walk(0, -11.5)); // the keeper watches from the shore
const wet = (x, z) => Math.hypot(x - 0.6, z + 14.6) < 2.6;
let worst = null, samples = 0;
for (let t = 0; t < 180; t++) {
  const st = await p.evaluate(() => window.__game());
  const all = [...st.patients.map((x) => ['patient', x[1], x[2]]), ...st.residents.map((r) => [r[0], r[4], r[5]]), ...st.workers.map((w) => ['worker ' + w[0], w[2], w[3]])];
  for (const [who, x, z] of all) { samples++; if (wet(x, z) && !worst) worst = `${who} at ${x},${z}`; }
  await p.waitForTimeout(500);
}
console.log(worst ? `FAIL someone on the water: ${worst}` : `OK   nobody on the water (${samples} positions checked)`);
await b.close();
