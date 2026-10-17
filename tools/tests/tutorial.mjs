// Tester feedback (17.10.2026): the goal card at the first start, the bed's progress ring and the ghost keeper,
// the basket waiting before it takes things, the wardrobe from the start, the request card going away when done,
// and the first adoption: camera on the hug, then the album (with names), then the hearts card. Screenshots to out/tut*.png.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport:{width:390,height:844} });
p.on('pageerror',e=>console.log('ERR '+e.message));
let fail = 0;
const check = (ok, what) => { console.log((ok ? 'OK   ' : 'FAIL ') + what); if (!ok) fail++; };
const shot = (n) => p.screenshot({ path: `out/tut${n}.png`, timeout: 150000 });
const G = (f, a) => p.evaluate(f, a);

await p.goto(BASE + '?dtmax=0.4&reset=1&quality=0');
await p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });
await p.waitForTimeout(3000);
check(await G(() => !!document.getElementById('story')), 'goal card at the first start');
await shot(1);
await p.click('#story button', { force: true });
check(await G(() => !document.querySelector('#story:not(.low)')), 'goal card closes');
// the first patient of a species: a card at the bottom (name, illness, cure) and the camera on it
await p.waitForSelector('#story.low', { timeout: 30000 }).then(() => check(true, 'new patient card'), () => check(false, 'new patient card'));
await p.waitForTimeout(2500);
check(await G(() => !!window.__G().focus), 'camera on the new patient');
check(await G(() => document.querySelector('#story.low h2').textContent.length > 2 && document.querySelectorAll('#story.low .p').length === 3), 'card names it, its illness and its cure');
await shot('1b');
await p.click('#story.low button', { force: true });
await p.waitForTimeout(1500);
check(await G(() => !window.__G().focus && !document.getElementById('story')), 'camera back on the keeper after the card');

// the wardrobe opens during the tutorial too
const door = await G(() => { const t = window.__G().tapTarget({ intersectObject: () => [] }, { x: -9.2, y: 0, z: -1.4 }); return { x: t.x, z: t.z }; });
check(Math.hypot(door.x + 9.2, door.z + 1.4) > 1, `a tap on the house walks to the door (${door.x.toFixed(1)}, ${door.z.toFixed(1)})`);
// walking past the door must not open it
await G(() => window.__walk(-6.6, -2.6)); await p.waitForTimeout(6000);
await G(() => window.__walk(-7.6, 2.4));
let opened = false;
for (let i = 0; i < 20; i++) { await p.waitForTimeout(150); opened ||= await G(() => window.__G().wardrobe.isOpen); }
check(!opened, 'walking past the house door does not open the wardrobe');
await G(([x, z]) => window.__go(x, z), [door.x, door.z]);
await p.waitForFunction(() => document.querySelector('#wardrobe.on, .wardrobe.on, [id*=ward].on'), null, { timeout: 30000 }).then(() => check(true, 'wardrobe opens during the tutorial'), async () => { check(false, 'wardrobe opens during the tutorial'); console.log('   state', await G(() => { const g = window.__G(), k = window.__keeper(); return JSON.stringify({ k, doorT: g.doorT, atDoor: g.atDoor, step: g.step, story: !!document.getElementById('story') }); })); });
await shot(2);
await p.mouse.click(10, 420); await p.keyboard.press('Escape');
await G(() => { const el = document.querySelector('#wardrobe.on, .wardrobe.on, [id*=ward].on'); el?.classList.remove('on'); });

// a resident that wants to sleep: the ghost shows how, a green ring fills while the keeper stands on the bed
await G(() => { const g = window.__G(); return g.spawnResident(g.species[0], 0, false); });
await p.waitForTimeout(4000);
await G(() => { const r = window.__G().residents[0]; r.need = 'sleep'; r.state = 'idle'; window.__G().drawNeed(r); });
await p.waitForTimeout(1500);
check(await G(() => window.__G().ghost?.visible === true), 'ghost keeper shows how to plump the bed');
await shot(3);
const bed = await G(() => { const b = window.__G().residents[0].bed.pos; return [b.x, b.z]; });
await G(([x, z]) => window.__go(x, z), bed); // through the pen gate: straight from the house door it stops at the fence
let fillSeen = false;
for (let i = 0; i < 120 && !fillSeen; i++) { await p.waitForTimeout(150); fillSeen = await G(() => { const b = window.__G().residents[0]?.bed; return b && b.fill.visible && b.fluff > 0.2 && b.fluff < 0.9; }); }
check(fillSeen, 'green ring fills while plumping');
if (fillSeen) await shot(4);
await p.waitForTimeout(3000);
check(await G(() => window.__G().seen.has('bed') && !window.__G().ghost?.visible), 'bed done: the ghost is gone for good');

// basket: passing by keeps the arms full, standing there empties them
await G(() => window.__walk(-5.8, 3.2)); await p.waitForTimeout(6000);
const held = await G(() => window.__G().carry.length);
await G(() => window.__walk(2.4, 7.3)); await p.waitForTimeout(4000); // walks past the basket's south side
await G(() => window.__walk(2.4, 6.9)); await p.waitForTimeout(300);
const after = await G(() => window.__G().carry.length);
check(held > 0 && after > 0, `walking past the basket throws nothing away (${held} -> ${after})`);
await p.waitForTimeout(400);
await shot(5);
await p.waitForTimeout(3000);
check(await G(() => window.__G().carry.length === 0), 'standing at the basket empties the arms');

// the request of the day goes away once done
await G(() => { const g = window.__G(); g.step = 4; g.newDay(); });
await p.waitForTimeout(500);
await shot(6);
await G(() => { const d = window.__G().daily; d.state.n = d.state.target - 1; for (const k of ['cure', 'goodbye', 'feed']) if (d.hit(k, d.state.name)) break; });
await p.waitForTimeout(4000);
check(await G(() => getComputedStyle(document.getElementById('daily')).opacity === '0'), 'request card gone after it is done');

// the first adoption: the camera goes to the hug, then the album opens, then the hearts card
await G(() => { const r = window.__G().residents[0]; r.hearts = 3; r.need = null; window.__G().adopt(r); });
await p.waitForFunction(() => window.__G().focus, null, { timeout: 20000 }).then(() => check(true, 'camera follows the first adoption'), () => check(false, 'camera follows the first adoption'));
await p.waitForFunction(() => window.__G().adopters[0]?.state === 'hug', null, { timeout: 40000 }).catch(() => {});
await shot(7);
await p.waitForFunction(() => document.getElementById('album')?.classList.contains('on'), null, { timeout: 40000 }).then(() => check(true, 'album opens after it'), () => check(false, 'album opens after it'));
await p.waitForTimeout(1500);
check(await G(() => [...document.querySelectorAll('#album .nm')].some((e) => e.textContent.length > 2)), 'album cards have names');
await shot(8);
await p.click('#album .close');
await p.waitForTimeout(800);
check(await G(() => !!document.getElementById('story')), 'hearts card after the album');
await shot(9);

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
process.exit(fail ? 1 : 0);
