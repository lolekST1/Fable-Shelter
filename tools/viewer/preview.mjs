// Render 4 views (0/45/90/180 deg) of each model to out/<name>_pv.png.
//   npm run serve   (other terminal)
//   node viewer/preview.mjs tools/work/smok_game.glb ...   (paths from the repo root)
import { chromium } from 'playwright'; import fs from 'fs'; import path from 'path';
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:1600,height:420} });
for (const m of process.argv.slice(2)) { await p.goto('http://localhost:4180/tools/viewer/preview.html?m='+m); await p.waitForFunction(()=>document.title==='done',null,{timeout:180000}); await p.screenshot({path:'out/'+path.basename(m,'.glb')+'_pv.png'}); }
await b.close();
