// Care loop: heal, move in, feed, sleep, adopt. Prints state every 5 rounds.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE '+m.text())});
await p.goto(BASE+'?dtmax=0.4&reset=1&debug'); await p.waitForTimeout(12000);
const S = () => p.evaluate(()=>window.__game());
const G = async (l) => console.log(l, JSON.stringify(await S()));
const walk = async (x,z,ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
await G('start'); await p.screenshot({path:'out/c0.png', timeout:150000});
let shots = 1;
for (let round = 0; round < 55; round++) {
  const st = await S();
  const needy = st.residents.find(r => r[2]);
  const sick = st.patients.find(x => x[0]==='waiting' || x[0]==='arriving');
  if (needy && needy[2]==='sleep') { await walk(needy[6], needy[7], 2500); }
  else if (needy && needy[2]==='food') { if (!st.carryKinds.includes('berry')) await walk(-3.0, 3.8, 2500); else await walk(needy[4], needy[5]+0.3, 2500); }
  else if (sick) { if (!st.carryKinds.includes('pink')) await walk(-5.5, 2.3, 2500); else await walk(sick[1], sick[2], 2500); }
  else await p.waitForTimeout(1500);
  if (round % 5 === 4) { await G('r'+round); if (shots < 4 && round > 25) await p.screenshot({path:`out/c${shots++}.png`, timeout:150000}); }
}
await G('end');
await b.close();
