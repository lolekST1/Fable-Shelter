// Szybki zrzut ekranu po zmianie, którą widzi gracz. Jeden widok, bez pisania osobnego testu.
//   NAME=latarnia node tests/shot.mjs
//   NAME=noc SAVE=pelny Q="night&quality=0" AT=-3.5,5 node tests/shot.mjs
//   NAME=karta SAVE=nowy Q="lang=en" W=640 H=360 node tests/shot.mjs
// SAVE: nowy (czysty start, z kartą celu gry), pelny (wszystko kupione, kilku mieszkańców) albo brak (zostaje ?reset=1).
// Q: dodatkowe przełączniki z adresu (bez ?), AT: punkt x,z, do którego opiekun idzie przed zrzutem.
// WAIT: sekundy czekania po wczytaniu (domyślnie 12). Zapisuje out/shot_<NAME>.png i wypisuje błędy ze strony.
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const NAME = process.env.NAME ?? 'zrzut';
const SAVE = process.env.SAVE ?? '';
const Q = process.env.Q ?? '';
const AT = process.env.AT ? process.env.AT.split(',').map(Number) : null;
const WAIT = +(process.env.WAIT ?? 12) * 1000;
const W = +(process.env.W ?? 390), H = +(process.env.H ?? 844);
fs.mkdirSync('out', { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
if (SAVE === 'pelny') {
  await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 500, bought: 99, hearts: 200, residents: [{ name: 'chmurnik', hearts: 1 }, { name: 'smok', hearts: 2 }, { name: 'yeti', hearts: 1 }, { name: 'syrenka', hearts: 1 }] })));
}
const params = [SAVE === 'pelny' ? '' : 'reset=1', 'dtmax=0.4', Q].filter(Boolean).join('&');
await p.goto(BASE + '?' + params);
await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 }).catch(() => errors.push('gra nie wystartowała w 120 s'));
await p.waitForTimeout(WAIT);
if (AT) {
  await p.evaluate(([x, z]) => window.__walk(x, z), AT);
  await p.waitForTimeout(9000);
}
const file = `out/shot_${NAME}.png`;
await p.screenshot({ path: file, timeout: 150000 });
console.log(`zrzut: tools/${file}`);
console.log(errors.length ? 'błędy ze strony:\n  ' + errors.join('\n  ') : 'bez błędów na stronie');
await b.close();
