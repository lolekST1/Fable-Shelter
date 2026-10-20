// Polish and English (?lang=pl|en): every card with words, on a narrow phone (320 px, text at 120%), in both
// languages. Nothing may stick out sideways (scrollWidth <= clientWidth on the page and on each card), and the
// English game shows no Polish words. Screenshots out/lang_<pl|en>_<card>.png.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
const save = { ver: 2, coins: 3000, bought: 8, hearts: 40, residents: [] };

const open = async (lang, q, seed) => {
  const p = await b.newPage({ viewport: { width: 320, height: 640 } });
  p.on('pageerror', (e) => { console.log('ERR ' + e.message); fail++; });
  await p.addInitScript(() => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '120%'; }));
  if (seed) await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), seed);
  await p.goto(`${BASE}?lang=${lang}&dtmax=0.4&quality=0&${q}`);
  await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  return p;
};

// no sideways scroll on the page or inside any open card; the English game has no Polish letters in its cards
const shot = async (p, lang, name, sel) => {
  await p.waitForSelector(sel, { timeout: 60000 });
  await p.waitForTimeout(1600); // the pictures fade in one after another
  const r = await p.evaluate((sel) => {
    const el = document.querySelector(sel);
    const page = document.scrollingElement;
    const wide = [...el.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible').map((e) => e.className || e.tagName);
    const box = el.getBoundingClientRect();
    return { page: page.scrollWidth <= page.clientWidth, inside: box.left >= -1 && box.right <= innerWidth + 1, wide, text: el.innerText, lang: document.documentElement.lang };
  }, sel);
  check(r.page && r.inside && !r.wide.length, `${lang} ${name}: fits 320 px${r.wide.length ? ' (too wide: ' + r.wide.join(', ') + ')' : ''}`);
  if (lang === 'en') check(!/[ąćęłńóśźż]/i.test(r.text), `en ${name}: no Polish (${r.text.replace(/\s+/g, ' ').slice(0, 70)})`);
  check(r.lang === lang, `${lang} ${name}: <html lang=${r.lang}>`);
  await p.screenshot({ path: `out/lang_${lang}_${name}.png` });
};

// every species name, illness and medicine has an English one (names without Polish letters would slip past the
// check on the cards)
{
  const src = (f) => fs.readFileSync(new URL('../../src/' + f, import.meta.url), 'utf8');
  const block = (text, name) => text.slice(text.indexOf(name), text.indexOf('};', text.indexOf(name)));
  const pl = [block(src('album.ts'), 'NAMES'), block(src('story.ts'), 'AILMENT_TEXT'), block(src('story.ts'), 'CURE_TEXT')]
    .flatMap((t) => [...t.matchAll(/: '([^']+)'/g)].map((m) => m[1]));
  const dict = src('i18n.ts');
  const missing = pl.filter((w) => !dict.includes(`'${w}':`));
  check(pl.length > 60 && !missing.length, `${pl.length} names, illnesses and medicines have English${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`);
}

for (const lang of ['pl', 'en']) {
  // a new game: the goal card, then the first patient's card
  let p = await open(lang, 'reset=1');
  await shot(p, lang, 'goal', '#story .box');
  await p.click('#story button', { force: true });
  await shot(p, lang, 'patient', '#story.low .box');
  await p.close();

  // later in the game, in Halloween: the Halloween card, hearts, today's task, album with the backup, boosters, chest
  p = await open(lang, 'halloween&ads', save);
  await shot(p, lang, 'halloween', '#story .box');
  await p.click('#story button', { force: true });
  await p.evaluate(() => window.__G().heartHud.click());
  await shot(p, lang, 'hearts', '#story .box');
  await p.click('#story button', { force: true });
  await shot(p, lang, 'daily', '#daily');
  await p.evaluate(() => window.__G().album.open());
  await p.evaluate(() => document.querySelector('#backup')?.scrollIntoView());
  await shot(p, lang, 'backup', '#backup');
  await p.evaluate(() => window.__G().album.close?.());
  // a patient's card may have queued up meanwhile; it would cover the boosters in the screenshot
  await p.evaluate(() => { document.querySelectorAll('#story').forEach((e) => e.remove()); window.__G().boosters.open(); });
  await shot(p, lang, 'boosters', '#boost.on .card');
  await p.evaluate(() => document.querySelector('#boost .plain').click());
  await p.evaluate(() => { void window.__G().boosters.chest(240); });
  await shot(p, lang, 'chest', '#boost.on .card');
  await p.close();
}

// with no ?lang the browser's language decides
for (const [locale, want] of [['pl-PL', 'pl'], ['en-US', 'en'], ['de-DE', 'en']]) {
  const c = await b.newContext({ locale });
  const p = await c.newPage();
  await p.goto(BASE + '?dtmax=0.4&quality=0');
  await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });
  check(await p.evaluate(() => document.documentElement.lang) === want, `browser ${locale} -> ${want}`);
  await c.close();
}

await b.close();
console.log(fail ? `${fail} FAILED` : 'ALL OK');
process.exit(fail ? 1 : 0);
