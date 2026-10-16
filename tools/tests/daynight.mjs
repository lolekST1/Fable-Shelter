// Time of day and weather: ?night starts in the night (dim blue light, lamps and fires glow, residents want sleep),
// ?rain makes it rain (streaks round the camera, the spring brews twice as fast). Draw calls stay close to the day's.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const save = { ver: 2, coins: 0, bought: 25, hearts: 140, residents: ['chmurnik', 'smok', 'feniks', 'gryf'].map((name) => ({ name, hearts: 1 })) };
const run = async (query, fn) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE + '?dtmax=0.4' + query); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const sky = (p) => p.evaluate(() => { const G = window.__G(); return { light: G.daylight, rain: +G.rain.toFixed(2), night: G.night, glows: G.glows.filter((g) => g.visible).length, calls: window.__calls() }; });
// the lantern by the pond: lamps are what lights up, so look from there
const toLantern = async (p) => { await p.evaluate(() => window.__walk(0, -9)); await p.waitForTimeout(5000); await p.evaluate(() => window.__walk(-0.4, -16.6)); await p.waitForTimeout(9000); };

let dayCalls = 0;
await run('', async (p) => {
  const s = await sky(p);
  check(s.light === 1 && !s.night && s.glows === 0 && s.rain === 0, `day: full light, no glows, dry (${JSON.stringify(s)})`);
  await toLantern(p);
  dayCalls = (await sky(p)).calls;
  await p.screenshot({ path: 'out/day.png', timeout: 150000 });
});

await run('&night', async (p) => {
  const s = await sky(p);
  check(s.light < 0.05 && s.night && s.glows === 3, `night: dark, lantern, mushroom lamp and bonfire glow (${JSON.stringify(s)})`);
  // sleepy at night: needs that come up are mostly sleep
  const needs = await p.evaluate(async () => {
    const G = window.__G(), got = [];
    for (let i = 0; i < 8; i++) {
      // only needs that come up fresh in this round count (one being fed would otherwise count every round)
      const fresh = G.residents.filter((r) => r.state === 'idle');
      for (const r of fresh) { r.need = null; r.needT = 0; }
      await new Promise((res) => setTimeout(res, 400));
      for (const r of fresh) if (r.need) got.push(r.need);
    }
    return got;
  });
  const sleepy = needs.filter((n) => n === 'sleep').length;
  check(needs.length >= 6 && sleepy / needs.length > 0.6, `at night residents mostly want to sleep (${sleepy}/${needs.length})`);
  await toLantern(p);
  const c = (await sky(p)).calls;
  check(c <= dayCalls + 3, `draw calls at night ${c} vs day ${dayCalls}`);
  await p.screenshot({ path: 'out/night.png', timeout: 150000 });
});

await run('&rain', async (p) => {
  await p.waitForTimeout(6000);
  const s = await sky(p);
  const boost = await p.evaluate(() => window.__G().stations.find((st) => st.kind === 'blue').boost);
  check(s.rain > 0.9 && boost > 0, `rain: it pours and the spring brews faster (${JSON.stringify(s)}, boost ${boost})`);
  await toLantern(p);
  const c = (await sky(p)).calls;
  check(c <= dayCalls + 2, `draw calls in the rain ${c} vs day ${dayCalls}`);
  await p.screenshot({ path: 'out/rain.png', timeout: 150000 });
});

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
