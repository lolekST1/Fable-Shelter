// The wardrobe in the shelter house: standing at the door opens it; things are bought once with coins, then put on
// and taken off; the keeper wears them (hat and neck meshes, a trail of particles), and it all survives a reload.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 2000, bought: 25, hearts: 140 })); sessionStorage.setItem('seeded', '1'); } });
await p.goto(BASE + '?dtmax=0.4'); await p.waitForTimeout(12000);
const W = () => p.evaluate(() => { const G = window.__G(); return { open: G.wardrobe.isOpen, coins: G.coins, owned: G.wardrobe.state.owned, worn: G.wardrobe.state.worn, wearing: G.wearing.length }; });

check(!(await W()).open, 'wardrobe closed away from the house');
// walk to the house door (south-east of the house)
await p.evaluate(() => window.__walk(-7.86, -0.06)); await p.waitForTimeout(9000);
check((await W()).open, 'standing at the house door opens the wardrobe');
await p.screenshot({ path: 'out/wardrobe0.png', timeout: 150000 });

// a click and what it cost (coins keep coming in from cures meanwhile, so compare just around the click)
const tap = async (id) => p.evaluate((id) => { const G = window.__G(); const c0 = G.coins; G.wardrobe.tap(id); return c0 - G.coins; }, id);
let cost = await tap('feather') + await tap('scarf');
let w = await W();
check(cost === 350 + 200 && w.worn.head === 'feather' && w.worn.neck === 'scarf' && w.wearing === 2, `bought and put on the feather and the scarf for ${cost} (${JSON.stringify(w)})`);
await p.evaluate(() => { window.__G().coins = 600; });
cost = await tap('stars');
w = await W();
check(cost === 0 && !w.owned.includes('stars'), `stars trail too dear: not bought (${JSON.stringify(w)})`);
cost = await tap('hearts');
const off = await tap('feather');
w = await W();
check(cost === 0 || (cost === 900), 'hearts priced 900');
await p.evaluate(() => { window.__G().coins = 2000; });
cost = await tap('hearts');
w = await W();
check(cost === 900 && w.worn.trail === 'hearts', `heart trail bought and on (${cost}, ${JSON.stringify(w)})`);
check(off === 0 && !w.worn.head && w.wearing === 1, `feather taken off for free (${JSON.stringify(w)})`);
check((await tap('feather')) === 0 && (await W()).worn.head === 'feather', 'putting an owned thing back on is free');
await tap('feather');
await p.click('#wardrobe .card[data-id="feather"]'); await p.waitForTimeout(300);
check((await W()).worn.head === 'feather', 'tapping a card in the wardrobe works too');
await p.screenshot({ path: 'out/wardrobe1.png', timeout: 150000 });
await p.click('#wardrobe .close');

// walking leaves hearts behind
await p.evaluate(() => window.__walk(-3, 4));
await p.waitForTimeout(1500);
const hearts = await p.evaluate(() => window.__G().fx.list.length);
check(hearts > 0, `a trail of hearts while walking (${hearts} particles)`);
await p.waitForTimeout(5000);
await p.screenshot({ path: 'out/wardrobe2.png', timeout: 150000 });

// a reload keeps what was bought and what is worn
await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
await p.reload(); await p.waitForTimeout(12000);
w = await W();
check(w.owned.length === 3 && w.worn.head === 'feather' && w.worn.neck === 'scarf' && w.worn.trail === 'hearts' && w.wearing === 2, `kept after a reload (${JSON.stringify(w)})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
