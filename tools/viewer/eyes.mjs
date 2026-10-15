// Find the painted eyes on each model and build the eyelid shells; merges them into ../src/lids.json.
//   npm run serve   (other terminal)
//   node viewer/eyes.mjs smok gryf:60 kraken:70:480:0.45:1.3
// Arg = name[:threshold:ymax:fill:lidScale], defaults 70:512:0.45:1.22. Model read from tools/work/<name>_game.glb.
// Check out/eyes_<name>.png: two magenta rings on the eyes. If it picked nostrils/spots, lower ymax or change threshold.
import { chromium } from 'playwright'; import fs from 'fs';
fs.mkdirSync('out', { recursive: true });
const LIDS = new URL('../../src/lids.json', import.meta.url);
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:1024,height:512} });
p.on('pageerror', e => console.log('ERR', e.message));
const lids = JSON.parse(fs.readFileSync(LIDS));
for (const a of process.argv.slice(2)) { const [n, t, y, f, s] = a.split(':');
  await p.goto(`http://localhost:4180/tools/viewer/eyes.html?m=tools/work/${n}_game.glb&t=${t||70}&y=${y||512}&f=${f||0.45}&s=${s||1.22}`);
  await p.waitForFunction(()=>document.title==='done',null,{timeout:180000});
  const res = await p.evaluate(()=>window.RESULT);
  await p.screenshot({path:`out/eyes_${n}.png`, clip:{x:512,y:0,width:512,height:512}});
  console.log(n, JSON.stringify(res.eyes.map(e=>[e.px.map(Math.round), e.r, e.skin])));
  lids[n] = res.eyes.map(e => ({ r: e.r, skin: e.skin, ...e.lid })); }
fs.writeFileSync(LIDS, JSON.stringify(lids)); await b.close();
