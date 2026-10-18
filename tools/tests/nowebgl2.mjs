// A device without WebGL 2 (e.g. Huawei MediaPad T3 10, Android 8): the game says why it cannot start instead of
// leaving a blank sky; a normal start shows no such message. Screenshot out/nowebgl2.png.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
let p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : get.call(this, type, ...rest); };
});
await p.goto(BASE + '?reset=1');
await p.waitForTimeout(6000);
const text = await p.evaluate(() => document.body.innerText);
check(/nie może się uruchomić/.test(text) && /WebGL 2: nie/.test(text), 'without WebGL 2 the player is told why');
await p.screenshot({ path: 'out/nowebgl2.png' });
await p.close();
p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(BASE + '?reset=1&nostory');
await p.waitForTimeout(25000);
check(await p.evaluate(() => !/nie może się uruchomić/.test(document.body.innerText) && !!document.querySelector('canvas')), 'a normal start shows no message');
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
