// Random play for ~70 rounds, reports any medicine item that is not where it should be (window.__strays).
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message));
await p.goto(BASE+'?dtmax=0.4&reset=1'); await p.waitForTimeout(12000);
const S = () => p.evaluate(()=>window.__game());
const walk = async (x,z,ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
// unlock the spring and herbs quickly
await p.evaluate(()=>window.__coins(600));
for (const [x,z] of [[-2.4,-0.9],[5.8,3.2],[1.1,-2.1],[-2.4,-0.9],[2.4,-0.9],[1.7,4.4],[0,8.2]]) await walk(x,z,4000);
const spots = { pink:[-5.5,2.4], blue:[5.5,2.4], green:[0,7.4], berry:[-3.0,3.8] };
let seen = 0;
for (let round = 0; round < 70; round++) {
  const st = await S();
  const r = Math.random();
  const needy = st.residents.find(x => x[2]);
  const sick = st.patients.filter(x => x[0]==='waiting' || x[0]==='arriving');
  if (r < 0.25) { const k = Object.keys(spots)[Math.floor(Math.random()*4)]; await walk(...spots[k], 1800); }
  else if (r < 0.5 && sick.length) { const s = sick[Math.floor(Math.random()*sick.length)]; await walk(s[1], s[2], 1800); }
  else if (r < 0.65 && needy) { await walk(needy[2]==='sleep'?needy[6]:needy[4], needy[2]==='sleep'?needy[7]:needy[5], 1800); }
  else if (r < 0.72) await walk(2.4, 5.6, 1500);
  else await walk((Math.random()-0.5)*14, (Math.random()-0.3)*12, 1500);
  const strays = await p.evaluate(()=>window.__strays());
  if (strays.length) { console.log('round', round, 'STRAYS', JSON.stringify(strays), JSON.stringify(await S())); if (++seen > 4) break; }
}
console.log('done', JSON.stringify(await S()));
await b.close();
