// Background music: nothing loads before the first tap; the tap starts it (music/oboz1.mp3, then oboz2.mp3 in a
// crossfading loop), and the mute button silences it with the sounds.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
const got = [];
p.on('response', (r) => { if (r.url().includes('/music/')) got.push([r.url().split('/').pop(), r.status()]); });
await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 5, hearts: 5 })));
await p.goto(BASE + '?dtmax=0.4'); await p.waitForTimeout(10000);
check(got.length === 0, 'no music downloaded before the first tap');
await p.mouse.click(200, 600);
await p.waitForTimeout(6000);
const s = await p.evaluate(() => { const x = window.__G().d.sfx; return { on: x.musicOn, gain: x.master?.gain.value, state: x.ctx?.state }; });
check(s.on && got.some(([f, st]) => f === 'oboz1.mp3' && st === 200), `the tap starts the music (${JSON.stringify(s)}, ${JSON.stringify(got)})`);
check(got.some(([f, st]) => f === 'oboz2.mp3' && st === 200), 'the next track is loaded ahead');
await p.click('#mute');
check((await p.evaluate(() => window.__G().d.sfx.master.gain.value)) === 0, 'mute silences the music too');
await p.click('#mute');
check((await p.evaluate(() => window.__G().d.sfx.master.gain.value)) === 1, 'and back on');
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
