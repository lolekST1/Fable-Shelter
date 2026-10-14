// Pond: brook blocks the keeper, buy the chain + bridge, cross, pond patient appears.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE '+m.text())});
await p.goto(BASE+'?dtmax=0.4&reset=1&debug'); await p.waitForTimeout(12000);
const S = () => p.evaluate(()=>window.__game());
const K = () => p.evaluate(()=>window.__keeper());
const walk = async (x,z,ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
// try to reach the pond before the bridge: should be blocked at the brook
await walk(0, -2.5, 5000); await walk(0, -12, 6000); console.log('blocked at', JSON.stringify(await K()));
await p.screenshot({path:'out/pd0.png', timeout:150000});
// buy the whole camp chain plus the bridge
await p.evaluate(()=>{ window.__coins(3000); window.__hearts(3); });
const spots = [[-2.4,-0.9],[5.8,3.2],[2.4,-0.9],[1.7,4.4],[0,8.2],[-1.15,-0.35],[-1.7,5.6],[-4.2,7.2],[1.15,-0.35],[0,-7.4]];
for (const [x,z] of spots) { await walk(x, z, 9000); }
console.log('after buys', JSON.stringify(await S()));
await walk(0, -6, 3000); await walk(0, -12, 7000); console.log('crossed to', JSON.stringify(await K()));
await p.screenshot({path:'out/pd1.png', timeout:150000});
await walk(-3.0, -11.8, 5000); await p.waitForTimeout(15000);
console.log('pond state', JSON.stringify(await S()));
await p.screenshot({path:'out/pd2.png', timeout:150000});
console.log('strays', JSON.stringify(await p.evaluate(()=>window.__strays())));
await b.close();
