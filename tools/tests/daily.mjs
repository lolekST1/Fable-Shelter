// Request of the day: a card under the hearts with one task (?day= fixes the date). Steps count, the last one pays
// coins to the keeper, progress survives a reload the same day and a new day brings a new task. Not shown in the tutorial.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
const open = async (save, day) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  if (save) await p.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } }, save);
  await p.goto(BASE + '?dtmax=0.4' + (day ? '&day=' + day : '') + (save ? '' : '&reset=1')); await p.waitForTimeout(12000);
  return p;
};
const card = (p) => p.evaluate(() => ({ shown: getComputedStyle(document.getElementById('daily')).display !== 'none', done: document.getElementById('daily').classList.contains('done'), text: document.getElementById('daily').textContent }));

// 1. a fresh game in the tutorial: no card yet
let p = await open(null, '2026-10-16');
check(!(await card(p)).shown, 'no request card during the tutorial');
await p.close();

// 2. a game in progress: a task for the day, picked the same way every time for that date
p = await open({ ver: 2, coins: 0, bought: 25, hearts: 140 }, '2026-10-16');
const st = await p.evaluate(() => window.__G().daily.state);
check(st && st.day === '2026-10-16' && ['cure', 'goodbye', 'feed'].includes(st.kind) && st.n === 0 && st.reward === 50 + 25 * 15, `today's task (${JSON.stringify(st)})`);
check(st.kind !== 'cure' || ['yeti', 'renifer', 'balwanek', 'pingwinek'].includes(st.name), 'a cure task picks a species from the newest area');
check((await card(p)).shown, 'request card shown');
await p.screenshot({ path: 'out/daily0.png', timeout: 150000 });

// 3. steps count only for the right kind (and species); the last one pays coins to the keeper
const r = await p.evaluate(async (st) => {
  const G = window.__G();
  const other = st.kind === 'feed' ? 'goodbye' : 'feed';
  G.dailyHit(other, st.name);
  const afterOther = G.daily.state.n;
  if (st.kind === 'cure') G.dailyHit('cure', 'chmurnik');
  const afterWrongName = G.daily.state.n;
  const coins0 = G.coins;
  for (let i = 0; i < st.target; i++) G.dailyHit(st.kind, st.name);
  await new Promise((res) => setTimeout(res, 10000));
  return { afterOther, afterWrongName, n: G.daily.state.n, paid: G.daily.state.paid, coins: G.coins - coins0 };
}, st);
check(r.afterOther === 0 && r.afterWrongName === 0, `other things do not count (${JSON.stringify(r)})`);
check(r.n === st.target && r.paid && r.coins >= st.reward, `done task pays ${st.reward} coins (${JSON.stringify(r)})`);
const c = await card(p);
check(c.done, `card shows the task done (${JSON.stringify(c)})`);
await p.screenshot({ path: 'out/daily1.png', timeout: 150000 });

// 4. the same day after a reload keeps the progress; the next day brings a fresh task
await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('fable-shelter-save-v3')).daily);
check(saved?.paid && saved.day === '2026-10-16', `progress saved (${JSON.stringify(saved)})`);
await p.reload(); await p.waitForTimeout(12000);
const again = await p.evaluate(() => window.__G().daily.state);
check(again?.paid && again.n === st.target, `same day after reload: still done (${JSON.stringify(again)})`);
await p.goto(BASE + '?dtmax=0.4&day=2026-10-17'); await p.waitForTimeout(12000);
const next = await p.evaluate(() => window.__G().daily.state);
check(next?.day === '2026-10-17' && next.n === 0 && !next.paid, `next day: a new task (${JSON.stringify(next)})`);
await p.close();

await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
