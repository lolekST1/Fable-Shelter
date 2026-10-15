// Adoption album: the book button opens a sticker page per area; adopted species show a colour portrait and a
// count, met ones a silhouette, the rest a question mark. Adopting the last missing camp species completes the
// page and its reward coins fly to the keeper; the counts are saved.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
// the whole camp page but the basilisk, one basilisk resident about to be adopted, the pond open
const album = { chmurnik: 4, smok: 2, feniks: 3, gryf: 1, grzybolak: 2, kraken: 1, jednorozec: 1, zabiksiaze: 2 };
await p.addInitScript((a) => { if (!sessionStorage.getItem('loaded')) { sessionStorage.setItem('loaded', '1'); localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 12, hearts: 20, residents: [{ name: 'bazyliszek', hearts: 3 }], album: a })); } }, album);
await p.goto(BASE + '?dtmax=0.4&debug'); await p.waitForTimeout(12000);
await p.click('#albumBtn');
await p.waitForTimeout(6000);
await p.screenshot({ path: 'out/album_open.png', timeout: 150000 });
const cards = await p.evaluate(() => [...document.querySelectorAll('#album .card')].map((c) => c.className));
check(cards.length === 16, `16 cards (${cards.length})`);
check(cards.filter((c) => c === 'card').length === 8, `8 adopted (${cards.filter((c) => c === 'card').length})`);
check(cards.filter((c) => c.includes('met')).length === 2, `2 met silhouettes: basilisk, nessie (${cards.filter((c) => c.includes('met')).length})`);
check(cards.filter((c) => c.includes('unknown')).length === 6, `6 unknown (${cards.filter((c) => c.includes('unknown')).length})`);
const imgs = await p.evaluate(() => [...document.querySelectorAll('#album .card img')].filter((i) => i.src.startsWith('data:image/png')).length);
check(imgs === 10, `portraits drawn (${imgs})`);
await p.click('#album .close');
// the camp helper looks after it too, but the keeper tucks it in when it is sleepy
const coins0 = await p.evaluate(() => window.__game().coins);
let done = false;
for (let t = 0; t < 90 && !done; t++) {
  const st = await p.evaluate(() => window.__game());
  const r = st.residents.find((r) => r[0] === 'bazyliszek');
  if (st.hearts > 20) done = true;
  else if (r?.[2] === 'sleep') await p.evaluate(([x, z]) => window.__walk(x, z), [r[6], r[7]]);
  await p.waitForTimeout(1000);
}
await p.waitForTimeout(15000);
const coins1 = await p.evaluate(() => window.__game().coins);
check(done, 'basilisk adopted');
check(coins1 - coins0 >= 150, `camp page reward paid (${coins0} -> ${coins1})`);
const dot = await p.evaluate(() => document.querySelector('#albumBtn .dot').classList.contains('on'));
check(dot, 'new sticker dot on the album button');
await p.click('#albumBtn');
await p.waitForTimeout(3000);
await p.screenshot({ path: 'out/album_full.png', timeout: 150000 });
const full = await p.evaluate(() => document.querySelectorAll('#album .page.full').length);
check(full === 1, `camp page shown complete (${full})`);
await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('fable-shelter-save-v3')));
check(saved.album?.bazyliszek === 1 && saved.albumPaid?.includes(0), `album saved (${JSON.stringify(saved.album)}, ${JSON.stringify(saved.albumPaid)})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
