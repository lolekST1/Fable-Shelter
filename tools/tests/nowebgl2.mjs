// A device without WebGL 2 (e.g. Huawei MediaPad T3 10: Android 8, Adreno 308, Chrome 138 has WebGL 1 only).
// three.js r162 falls back to WebGL 1, so the game must start and play there: a patient cured, no error card.
// Screenshots out/webgl1_*.png. If a start ever fails, the error card (index.html) must say why.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
const errors = [];
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.addInitScript(() => {
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) { return type === 'webgl2' ? null : get.call(this, type, ...rest); };
});
await p.goto(BASE + '?reset=1&nostory&quality=0&dtmax=0.4');
await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(8000);
const st = await p.evaluate(() => ({ started: !!window.__G?.(), webgl2: window.__renderer?.capabilities?.isWebGL2, card: /nie może się uruchomić/.test(document.body.innerText) }));
check(st.started && !st.card, `the game starts on WebGL 1 (${JSON.stringify(st)})`);
check(st.webgl2 === false, 'and really runs on WebGL 1');
await p.screenshot({ path: 'out/webgl1_start.png', timeout: 150000 });
// play a little: medicine to the first patient
await p.evaluate(() => window.__walk(-5.5, 2.3)); await p.waitForTimeout(6000);
await p.waitForFunction(() => window.__G().patients.some((x) => x.state === 'waiting'), null, { timeout: 60000 }).catch(() => {});
const sick = await p.evaluate(() => { const x = window.__G().patients.find((x) => x.state === 'waiting'); return x && [x.c.root.position.x, x.c.root.position.z]; });
if (sick) { await p.evaluate(([x, z]) => window.__go(x, z), sick); await p.waitForTimeout(9000); }
check(await p.evaluate(() => window.__G().coins > 0 || window.__G().patients.some((x) => x.state === 'cured' || x.state === 'leaving')), 'a patient cured on WebGL 1');
await p.evaluate(() => window.__walk(0, 4)); await p.waitForTimeout(4000);
await p.screenshot({ path: 'out/webgl1_play.png', timeout: 150000 });
check(!errors.some((e) => /WebGL|shader|program/i.test(e)), `no WebGL or shader errors (${errors.slice(0, 3).join(' | ')})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
