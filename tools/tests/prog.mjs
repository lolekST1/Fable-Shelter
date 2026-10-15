// Progression: buying spots, resident helpers, save/reload.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE '+m.text())});
await p.goto(BASE+'?dtmax=0.4&reset=1'); await p.waitForTimeout(12000);
const G = async (l) => console.log(l, JSON.stringify(await p.evaluate(()=>window.__game())));
const walk = async (x,z,ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
await G('start');
// buy everything in order with granted coins
const spots = [[-4.6,1.4],[0,4.8],[2.9,3.0],[4.6,1.4],[-1.8,5.5],[-6.0,3.6],[1.8,5.5]];
const prices = [50,80,120,180,220,280,400];
for (let i=0;i<spots.length;i++){ await p.evaluate((n)=>window.__coins(n), prices[i]); await walk(spots[i][0], spots[i][1], 4000); await walk(spots[i][0], spots[i][1], 12000); await G('bought '+i); }
await p.screenshot({path:'out/p1.png', timeout:150000});
await walk(0, 3.4, 5000);
await p.waitForTimeout(15000); await G('helper working'); await p.screenshot({path:'out/p2.png', timeout:150000});
// reload: progress should survive
await p.goto(BASE+'?dtmax=0.4'); await p.waitForTimeout(14000); await G('after reload'); await p.screenshot({path:'out/p3.png', timeout:150000});
await b.close();
