// Carrier helpers (gryf, kraken: cures; bazyliszek: berries). Seeds a save with them; the keeper only tends
// their needs (helpers work only while they need nothing) and never heals, so cures reach patients via helpers.
// Logs each helper's state changes and checks that every one of them completes a delivery.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE '+m.text())});
// seed before the game boots (a pagehide save would overwrite a save written from a loaded page)
await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ coins: 0, bought: 99, hearts: 3,
  residents: [{ name: 'gryf', hearts: 1 }, { name: 'kraken', hearts: 1 }, { name: 'bazyliszek', hearts: 1 }, { name: 'chmurnik', hearts: 0 }, { name: 'smok', hearts: 0 }] })));
await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(12000);
const HELPERS = ['gryf', 'kraken', 'bazyliszek'];
const last = {}, seen = Object.fromEntries(HELPERS.map(n => [n, []]));
let shot = 0;
const walk = (x, z) => p.evaluate(([x, z]) => window.__walk(x, z), [x, z]);
for (let t = 0; t < 240; t++) {
  const st = await p.evaluate(() => window.__game());
  const needy = st.residents.find(r => r[2] && (HELPERS.includes(r[0]) || r[2] === 'sleep')); // others' food is left to bazyliszek
  if (needy?.[2] === 'sleep') await walk(needy[6], needy[7]);
  else if (needy?.[2] === 'food') await (st.carryKinds.includes('berry') ? walk(needy[4], needy[5] + 0.3) : walk(-3.0, 3.8));
  for (const r of st.residents) if (HELPERS.includes(r[0]) && last[r[0]] !== r[1]) {
    last[r[0]] = r[1]; seen[r[0]].push(r[1]);
    if (r[1] === 'helpBring' && shot < 3) await p.screenshot({ path: `out/h${shot++}.png`, timeout: 150000 });
  }
  if (t % 30 === 29) console.log('t'+t, JSON.stringify({ patients: st.patients.map(x => x[0]), tray: st.tray, res: st.residents.map(r => r.slice(0, 4)) }));
  await p.waitForTimeout(500);
}
const strays = await p.evaluate(() => window.__strays());
for (const n of HELPERS) {
  const s = seen[n].join(' > ');
  const ok = /helpGo > helpBring > helpBack/.test(s);
  console.log(ok ? 'OK  ' : 'FAIL', n, s);
}
console.log('strays', JSON.stringify(strays));
await b.close();
