// Eyelids: screenshots with ?eyes=closed and ?eyes=half.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error')console.log(m.text())});
for (const m of ['closed','half']) { await p.goto(BASE+'?eyes='+m); await p.waitForTimeout(9000); await p.screenshot({path:'out/l2_'+m+'.png', timeout:150000}); }
// orbit to a side view and zoom in
await p.goto(BASE+'?eyes=closed'); await p.waitForTimeout(9000);
await p.mouse.move(100,300); await p.mouse.down(); await p.mouse.move(260,300,{steps:12}); await p.mouse.up();
for (let i=0;i<6;i++){ await p.mouse.wheel(0,-300); await p.waitForTimeout(150); }
await p.waitForTimeout(2500); await p.screenshot({path:'out/l2_side.png', timeout:150000});
await b.close();
