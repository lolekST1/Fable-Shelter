// Save backup, counters, residents plumping beds, and the boosters for a rewarded ad (?ads fakes the ad off Poki):
// the backup code round-trips and a cut one is refused; counters land in the local log (?stats);
// a 'boost' resident plumps a sleepy neighbour's bed with the keeper far away; the gold booster doubles coins,
// the volunteer helps and leaves; the chest offers ×2; without ads none of it shows and the chest opens as before.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const open = async (save, extra = '') => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  if (save) await p.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)); } }, save);
  await p.goto(BASE + '?lang=pl&dtmax=0.4&nostory&quality=0' + extra);
  await p.waitForTimeout(12000);
  return p;
};
const G = (p, f, a) => p.evaluate(f, a);

// 1. backup: the code from the album loads the same game in a fresh browser; half a code is refused
{
  const p = await open({ ver: 2, coins: 777, bought: 12, hearts: 21 });
  await G(p, () => window.__G().album.open());
  await p.waitForTimeout(500);
  const code = await G(p, () => document.querySelector('#backup textarea').value);
  check(/^FS1-.+-[0-9a-f]{4}$/.test(code), `album shows a backup code (${code.slice(0, 24)}…)`);
  await p.screenshot({ path: 'out/boost_backup.png' });
  await p.close();
  const q = await open(null, '&reset=1');
  await G(q, () => window.__G().album.open());
  const inp = q.locator('#backup textarea').nth(1);
  await inp.fill(code.slice(0, code.length - 10));
  await q.locator('#backup button', { hasText: 'Wczytaj' }).click();
  check((await q.locator('#backup .msg').textContent()).includes('cały'), 'a cut code is refused');
  await inp.fill(code);
  await q.locator('#backup button', { hasText: 'Wczytaj' }).click();
  check((await q.locator('#backup button.warn').count()) === 1, 'the first tap asks again');
  await Promise.all([q.waitForEvent('load'), q.locator('#backup button.warn').click()]);
  await q.waitForTimeout(12000);
  const st = await G(q, () => ({ coins: window.__G().coins, bought: window.__G().bought }));
  check(st.coins >= 777 && st.bought === 12, // the camp helper may earn a few coins meanwhile
     `the backup is loaded after the reload (${JSON.stringify(st)})`);
  await q.close();
}

// 2. counters: a visit and a purchase are in the local log, ?stats shows it
{
  const p = await open({ ver: 2, coins: 0, bought: 3, hearts: 2 }, '&stats');
  await G(p, () => window.__coins(500));
  const sp = await G(p, () => window.__spots());
  await G(p, ([x, z]) => window.__walk(x, z), [sp.spots[0][1], sp.spots[0][2]]);
  await p.waitForTimeout(9000);
  const log = await G(p, () => JSON.parse(localStorage.getItem('fable-shelter-stats')));
  const names = log.events.map((e) => e[1]);
  check(names.some((n) => n.startsWith('session:day')) && names.some((n) => n.startsWith('build:4-')), `visit and purchase counted (${names.slice(-4).join(', ')})`);
  check(await p.locator('pre').filter({ hasText: 'sesje' }).count() === 1, '?stats shows the log');
  await p.screenshot({ path: 'out/boost_stats.png' });
  await p.close();
}

// 3. a 'boost' resident (smok) plumps up a sleepy neighbour's bed while the keeper stays away
{
  const p = await open({ ver: 2, coins: 0, bought: 9, hearts: 20, residents: [{ name: 'smok', hearts: 2 }, { name: 'gryf', hearts: 1 }] });
  // plumping takes only a second or two: the page notes every state of the smok itself (a test step can be slower)
  await G(p, () => {
    const g = window.__G(); g.workers.length = 0; window.__walk(0, 7);
    window.__smok = new Set();
    window.setInterval(() => window.__smok.add(g.residents.find((r) => r.name === 'smok')?.state), 50);
  });
  let ok = false, saw = false, last = null;
  for (let i = 0; i < 40 && !ok; i++) {
    const s = await G(p, () => {
      const g = window.__G();
      const smok = g.residents.find((r) => r.name === 'smok'), gryf = g.residents.find((r) => r.name === 'gryf');
      if (smok.need) smok.need = null;
      if (!gryf.need && gryf.state === 'idle') { gryf.need = 'sleep'; gryf.needT = 99; g.drawNeed(gryf); }
      smok.helpT = Math.min(smok.helpT, 0.1);
      return { smok: window.__smok.has('helpWork') ? 'helpWork' : smok.state, gryf: gryf.state };
    });
    last = s;
    if (s.smok === 'helpWork') saw = true;
    if (saw && (s.gryf === 'toSleep' || s.gryf === 'sleeping')) ok = true;
    else await p.waitForTimeout(1000);
  }
  check(saw && ok, `a smok plumps the sleepy gryf's bed, the keeper far away (${JSON.stringify({ saw, last, states: await G(p, () => [...window.__smok]) })})`);
  await p.close();
}

// 4. boosters with ?ads: the button, gold coins ×2, the volunteer comes and goes
{
  const p = await open({ ver: 2, coins: 0, bought: 12, hearts: 20 }, '&ads');
  check(await p.locator('#boostBtn.on').count() === 1, 'booster button shows');
  await p.locator('#boostBtn').click();
  check(await p.locator('#boost.on .plain').count() === 1 && await p.locator('#boost.on .ad').count() === 2, 'two offers with 🎬 and a plain "no" button');
  const sizes = await G(p, () => [...document.querySelectorAll('#boost .ad, #boost .plain')].map((e) => e.getBoundingClientRect().height));
  check(sizes[2] >= Math.max(sizes[0], sizes[1]), `the plain button is not smaller than the ad ones (${sizes.map((x) => x.toFixed(0))})`);
  await p.screenshot({ path: 'out/boost_menu.png' });
  await p.locator('#boost .ad').first().click();
  await p.waitForTimeout(3000);
  check(await G(p, () => window.__G().goldMul === 2), 'gold booster doubles coins');
  check((await p.locator('#boostBtn .t.on').textContent()).includes(':'), 'the time left shows under the button');
  const before = await G(p, () => window.__G().workers.length);
  await p.locator('#boostBtn').click();
  await p.locator('#boost .ad').nth(1).click();
  await p.waitForTimeout(4000);
  const w = await G(p, () => window.__G().workers.filter((v) => v.until).length);
  check(w === 1, `a golden volunteer comes (${before} -> +${w})`);
  await p.screenshot({ path: 'out/boost_volunteer.png' });
  await G(p, () => { for (const v of window.__G().workers) if (v.until) v.until = 0; });
  await p.waitForTimeout(2000);
  check(await G(p, () => window.__G().workers.filter((v) => v.until !== undefined).length === 0), 'the volunteer leaves when its time is up');
  await p.close();
}

// 5. the chest: with ads a choice (×2 for an ad), without them it opens as before
{
  const save = { ver: 2, coins: 0, bought: 12, hearts: 20, savedAt: Date.now() - 30 * 60000 };
  const p = await open(save, '&ads');
  const chest = await G(p, () => window.__G().chestCoins);
  await G(p, () => window.__walk(-0.9, 5.2));
  await p.waitForTimeout(6000);
  check(await p.locator('#boost.on').count() === 1, `the chest asks (${chest} coins)`);
  await p.screenshot({ path: 'out/boost_chest.png' });
  const c0 = await G(p, () => window.__G().coins);
  await p.locator('#boost .ad').click();
  await p.waitForTimeout(6000);
  const c1 = await G(p, () => window.__G().coins);
  check(c1 - c0 >= chest * 2 - 2, `×2 for the ad (${c0} -> ${c1}, chest ${chest})`);
  await p.close();
  const q = await open(save);
  const chest2 = await G(q, () => window.__G().chestCoins);
  check(await q.locator('#boostBtn.on').count() === 0, 'no booster button without ads');
  await G(q, () => window.__walk(-0.9, 5.2));
  await q.waitForTimeout(6000);
  const st = await G(q, () => ({ coins: window.__G().coins, chest: window.__G().chestCoins, asking: !!document.querySelector('#boost.on') }));
  check(!st.asking && st.chest === 0 && st.coins >= chest2 - 2, `without ads the chest just opens (${JSON.stringify(st)})`);
  await q.close();
}
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
