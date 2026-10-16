// Rare colour variants: a patient in an unusual colour (?rare makes every patient one), it keeps the colour as a
// resident and in the save, and its adoption fills its own album sticker, which a page does not need to be complete.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const run = async (save, query, fn) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4' + query); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};

// 1. with ?rare every patient is a variant, tinted differently from the plain sick colour, and sparkles
await run({ ver: 2, coins: 0, bought: 25, hearts: 140 }, '&rare', async (p) => {
  await p.waitForTimeout(6000);
  const ps = await p.evaluate(() => window.__G().patients.map((x) => [x.name, x.variant, x.tint, x.sp.tint]));
  check(ps.length > 0 && ps.every((x) => x[1] && x[2] !== x[3]), `patients are rare variants with their own colour (${JSON.stringify(ps)})`);
  const at = await p.evaluate(() => { const q = window.__G().patients[0].c.root.position; return [q.x, q.z]; });
  await p.evaluate(([x, z]) => window.__walk(x, z + 1.6), at); await p.waitForTimeout(9000);
  await p.screenshot({ path: 'out/variant0.png', timeout: 150000 });
});

// 2. a rare resident from the save keeps its colour; a plain one (old save, no v) stays plain
await run({ ver: 2, coins: 0, bought: 25, hearts: 140, residents: [{ name: 'yeti', hearts: 1, v: 1 }, { name: 'renifer', hearts: 1 }] }, '', async (p) => {
  const rs = await p.evaluate(() => window.__G().residents.map((r) => [r.name, !!r.variant, r.c.skin.color.getHex()]));
  const yeti = rs.find((r) => r[0] === 'yeti'), ren = rs.find((r) => r[0] === 'renifer');
  check(yeti?.[1] && yeti[2] === 0xff9ed2, `rare yeti from the save is pink (${JSON.stringify(rs)})`);
  check(ren && !ren[1] && ren[2] === 0xffffff, 'plain reindeer stays plain');
  const saved = await p.evaluate(() => { window.dispatchEvent(new Event('pagehide')); return JSON.parse(localStorage.getItem('fable-shelter-save-v3')).residents; });
  check(saved.some((r) => r.name === 'yeti' && r.v === 1) && saved.some((r) => r.name === 'renifer' && !r.v), `variant kept in the save (${JSON.stringify(saved)})`);

  // 3. album: the rare sticker shows once adopted, with its own card, and is not needed for the page reward
  const res = await p.evaluate(() => {
    const a = window.__G().album;
    const rare = a.add('yeti*');
    const plain = ['yeti', 'renifer', 'balwanek'].map((n) => a.add(n)).flat();
    const last = a.add('pingwinek');
    return { rare, plain, last, counts: a.counts };
  });
  check(res.rare.length === 0 && res.plain.length === 0 && res.last.includes(3), `snow page completes with the four plain species, the rare one is extra (${JSON.stringify(res)})`);
  await p.click('#albumBtn');
  await p.waitForTimeout(1500);
  const cards = await p.evaluate(() => { document.querySelector('#album .card.rare')?.scrollIntoView(); return document.querySelectorAll('#album .card.rare').length; });
  await p.waitForTimeout(4000);
  check(cards === 1, `one rare sticker in the album (${cards})`);
  await p.screenshot({ path: 'out/variant1.png', timeout: 150000 });
});

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
