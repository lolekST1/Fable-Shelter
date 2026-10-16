// Coins earned while the game was closed: each hired helper makes OFFLINE_RATE (6) coins a minute, for up to
// 120 minutes; they wait in a chest in front of the pen and fly to the keeper when the keeper walks up to it.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const run = async (save, fn) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  await p.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, save);
  await p.goto(BASE + '?dtmax=0.4'); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const min = (m) => Date.now() - m * 60000;
const chest = (p) => p.evaluate(() => window.__G().chestCoins);

// 1. an hour away with the four helpers up to the snowy hill: 4 x 6 x 60 = 1440 coins in the chest; walking up opens it
await run({ ver: 2, coins: 0, bought: 25, hearts: 140, savedAt: min(60) }, async (p) => {
  const c = await chest(p);
  check(Math.abs(c - 1440) <= 2, `an hour with four helpers: ${c} coins in the chest`);
  await p.evaluate(() => window.__walk(1.5, 7.5)); await p.waitForTimeout(6000); // round the chest, not over it
  await p.screenshot({ path: 'out/offline0.png', timeout: 150000 });
  const coins0 = await p.evaluate(() => window.__G().coins);
  await p.evaluate(() => window.__walk(-0.9, 5.4)); await p.waitForTimeout(9000);
  const r = await p.evaluate(() => ({ chest: window.__G().chestCoins, coins: window.__G().coins }));
  check(r.chest === 0 && r.coins - coins0 >= 1440, `chest opened, coins with the keeper (+${r.coins - coins0})`);
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('fable-shelter-save-v3')));
  check(!saved.chest && Math.abs(saved.savedAt - Date.now()) < 60000, `save: chest empty, time stamped (${JSON.stringify({ chest: saved.chest, savedAt: saved.savedAt })})`);
});

// 2. a whole day away pays only the first two hours
await run({ ver: 2, coins: 0, bought: 25, hearts: 140, savedAt: min(24 * 60) }, async (p) => {
  const c = await chest(p);
  check(Math.abs(c - 4 * 6 * 120) <= 2, `capped at two hours: ${c}`);
});

// 3. no helpers yet, or just a minute away: no chest
await run({ ver: 2, coins: 0, bought: 5, hearts: 10, savedAt: min(60) }, async (p) => check((await chest(p)) === 0, 'no helpers: no chest'));
await run({ ver: 2, coins: 0, bought: 25, hearts: 140, savedAt: min(1) }, async (p) => check((await chest(p)) === 0, 'a minute away: no chest'));

// 4. a chest left unopened stays in the save and adds up
await run({ ver: 2, coins: 0, bought: 25, hearts: 140, savedAt: min(10), chest: 300 }, async (p) => {
  const c = await chest(p);
  check(Math.abs(c - (300 + 4 * 6 * 10)) <= 2, `unopened chest kept and topped up: ${c}`);
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('fable-shelter-save-v3')).chest);
  check(saved === c, `still in the save (${saved})`);
});

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
