// Halloween (?halloween turns it on any day): pumpkins round the pen, bats at night, dyniak and duszek as camp
// patients with their own cards and symptoms, the pumpkin page in the album, the witch hat and ember trail in the
// wardrobe. Off the event days none of it shows. Screenshots out/hw*.png.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
const save = { ver: 2, coins: 3000, bought: 8, hearts: 40, residents: [] };
const open = async (q) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => { console.log('ERR ' + e.message); fail++; });
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4&quality=0&' + q);
  await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });
  await p.waitForTimeout(4000);
  return p;
};

// an ordinary day: nothing of it
let p = await open('day=2026-10-10');
check(await p.evaluate(() => !window.__G().spooky), 'no pumpkins on an ordinary day');
await p.evaluate(() => window.__go(-7.86, -0.06)); await p.waitForFunction(() => window.__G().wardrobe.isOpen, null, { timeout: 40000 }).catch(() => {});
check(await p.evaluate(() => window.__G().wardrobe.isOpen && !document.querySelector('#wardrobe [data-id=witch]')), 'no witch hat in the wardrobe');
await p.close();

// Halloween, at night
p = await open('halloween&night');
check(await p.evaluate(() => /Halloween/.test(document.querySelector('#story h2')?.textContent ?? '')), 'Halloween card on the first visit');
await p.waitForTimeout(2500);
await p.screenshot({ path: 'out/hw0_card.png', timeout: 150000 });
await p.click('#story button', { force: true }); await p.waitForTimeout(800);
check(await p.evaluate(() => window.__G().seen.has('halloween' + new Date().getFullYear()) && !document.getElementById('story')), 'card shown once (remembered)');
check(await p.evaluate(() => !!window.__G().spooky), 'pumpkins round the pen');
check(await p.evaluate(() => window.__G().spooky.bats.visible), 'bats out at night');
await p.evaluate(() => window.__walk(0, 5.5)); await p.waitForTimeout(5000);
await p.screenshot({ path: 'out/hw1_night.png', timeout: 150000 });

// the two Halloween species come as patients: a card each the first time, then their symptoms
await p.evaluate(() => { const G = window.__G(); G.species = ['dyniak', 'duszek']; G.patients.forEach((x) => { x.state = 'leaving'; }); });
await p.waitForFunction(() => window.__G().patients.some((x) => x.name === 'dyniak' || x.name === 'duszek'), null, { timeout: 60000 }).catch(() => {});
await p.waitForSelector('#story.low', { timeout: 30000 }).then(() => check(true, 'new patient card'), () => check(false, 'new patient card'));
await p.waitForTimeout(3000);
const card = await p.evaluate(() => document.querySelector('#story.low')?.innerText.replace(/\s+/g, ' '));
check(/Dyniak|Duszek/.test(card ?? ''), `card names it (${card})`);
await p.screenshot({ path: 'out/hw2_card.png', timeout: 150000 });
await p.click('#story.low button', { force: true });
await p.waitForTimeout(1500);
if (await p.$('#story.low')) { await p.click('#story.low button', { force: true }); await p.waitForTimeout(1500); }
await p.waitForFunction(() => ['dyniak', 'duszek'].every((n) => window.__G().patients.some((x) => x.name === n && x.state === 'waiting')), null, { timeout: 90000 })
  .then(() => check(true, 'both are waiting as patients'), () => check(false, 'both are waiting as patients'));
// the second one's card comes after the first is closed: close any left
for (let i = 0; i < 4 && (await p.$('#story')); i++) { await p.click('#story button', { force: true }); await p.waitForTimeout(1200); }
const where = await p.evaluate(() => { const x = window.__G().patients.find((x) => x.name === 'dyniak'); return [x.c.root.position.x, x.c.root.position.z]; });
await p.evaluate(([x, z]) => window.__walk(x, z + 1.2), where); await p.waitForTimeout(6000);
await p.screenshot({ path: 'out/hw3_patients.png', timeout: 150000 });

// album page and wardrobe things
await p.evaluate(() => document.getElementById('albumBtn').click()); await p.waitForTimeout(1500);
check(await p.evaluate(() => [...document.querySelectorAll('#album .nm')].some((e) => /Dyniak|Duszek/.test(e.textContent))), 'pumpkin page in the album');
await p.evaluate(() => document.querySelector('#album .book').scrollTo(0, 99999)); await p.waitForTimeout(500);
await p.screenshot({ path: 'out/hw4_album.png', timeout: 150000 });
await p.evaluate(() => document.querySelector('#album .close').click());
await p.evaluate(() => window.__go(-7.86, -0.06)); await p.waitForFunction(() => window.__G().wardrobe.isOpen, null, { timeout: 40000 }).catch(() => {});
check(await p.evaluate(() => !!document.querySelector('#wardrobe [data-id=witch]') && !!document.querySelector('#wardrobe [data-id=embers]')), 'witch hat and ember trail for sale');
await p.evaluate(() => { document.querySelector('#wardrobe [data-id=witch]').click(); document.querySelector('#wardrobe [data-id=embers]').click(); });
await p.waitForTimeout(800);
check(await p.evaluate(() => window.__G().wardrobe.state.worn.head === 'witch' && window.__G().wardrobe.state.worn.trail === 'embers'), 'both bought and worn');
await p.screenshot({ path: 'out/hw5_wardrobe.png', timeout: 150000 });
await p.evaluate(() => window.__G().wardrobe.close());
await p.evaluate(() => window.__walk(-4, 2)); await p.waitForTimeout(1200);
await p.screenshot({ path: 'out/hw6_witch.png', timeout: 150000 });
await p.close();

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
