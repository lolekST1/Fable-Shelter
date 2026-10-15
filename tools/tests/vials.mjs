// Hunt for "walking" vials: random play in the full camp (pond open, helpers living there) while an in-page
// monitor checks every medicine item each frame (window.__items): a tray item that moves, an item that jumps
// far in one frame without flying, an item with no owner, or one in the keeper's arms far from the keeper.
//   ROUNDS=120 node tests/vials.mjs
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='warning')console.log('WARN '+m.text())});
await p.addInitScript(() => {
  localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ coins: 0, bought: 99, hearts: 9, residents: ['gryf', 'kraken', 'bazyliszek', 'swietlik', 'zabiksiaze', 'smok', 'chmurnik'].map((name) => ({ name, hearts: 1 })) }));
  window.__anom = []; window.__frames = 0;
  let prev = new Map();
  const tick = () => {
    if (window.__items && window.__keeper()) {
      const k = window.__keeper();
      const now = new Map(window.__items().map((i) => [i[0], i]));
      for (const [id, [, kind, x, y, z, own]] of now) {
        const o = prev.get(id);
        const bad = (why) => window.__anom.length < 50 && window.__anom.push({ t: performance.now() | 0, why, kind, own, was: o?.[5], at: [x, y, z], from: o && o.slice(2, 5) });
        if (own === 'stray') bad('stray');
        if (own === 'carry' && Math.hypot(x - k[0], z - k[1]) > 3) bad('carry far from keeper');
        if (!o) continue;
        const d = Math.hypot(x - o[2], y - o[3], z - o[4]);
        if (own === 'tray' && o[5] === 'tray' && d > 0.02) bad('tray item moved');
        if (d > 2.5 && o[5] !== 'flight' && own !== 'flight') bad('jump');
      }
      prev = now; window.__frames++;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(14000);
const S = () => p.evaluate(()=>window.__game());
const walk = async (x,z,ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
const places = [[-5.5,2.4],[5.5,2.4],[0,7.4],[-3.0,3.8],[2.4,6.3],[-3.0,-11.8],[0,-7.4],[0,-12]];
for (let round = 0; round < (+process.env.ROUNDS || 120); round++) {
  const st = await S();
  const r = Math.random();
  const sick = st.patients.filter(x => x[0]==='waiting' || x[0]==='arriving');
  const needy = st.residents.find(x => x[2]);
  if (r < 0.35) await walk(...places[Math.floor(Math.random()*places.length)], 2000);
  else if (r < 0.65 && sick.length) { const s = sick[Math.floor(Math.random()*sick.length)]; await walk(s[1], s[2], 2000); }
  else if (r < 0.85 && needy) await walk(needy[2]==='sleep'?needy[6]:needy[4], needy[2]==='sleep'?needy[7]:needy[5]+0.3, 2000);
  else await walk((Math.random()-0.5)*14, (Math.random()-0.6)*24, 1500);
  const anom = await p.evaluate(()=>window.__anom.splice(0));
  if (anom.length) { console.log('round', round, JSON.stringify(anom.slice(0, 6))); await p.screenshot({ path: `out/vials_${round}.png`, timeout: 150000 }); }
  if (round % 20 === 19) console.log('r'+round, JSON.stringify({ tray: st.tray, carry: st.carryKinds, res: st.residents.map(x => x.slice(0, 3)) }));
}
console.log('frames checked', await p.evaluate(() => window.__frames));
await b.close();
