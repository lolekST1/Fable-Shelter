// Sound on a touch phone: Chrome only lets audio start on a real gesture, and on touch that is the finger lifting, not
// pointerdown. The first tap of a new player is usually the play button of the goal card, which keeps taps from the
// game. That one tap must start the sound (it used to stay silent until the mute button was tapped).
import { chromium, devices } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
const ctx = await b.newContext({ ...devices['Pixel 5'] });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR ' + e.message));
await p.goto(BASE + '?reset=1&dtmax=0.4');
await p.waitForSelector('#story button', { timeout: 60000 });
check(await p.evaluate(() => window.__audio()) === 'none', 'no sound before the first tap');
await p.waitForTimeout(2500);
await p.tap('#story button', { force: true });
await p.waitForTimeout(2000);
const st = await p.evaluate(() => window.__audio());
check(st === 'running', `one tap on the goal card starts the sound (${st})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
