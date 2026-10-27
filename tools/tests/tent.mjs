// The guest tent: with every bed taken a cured patient does not walk away but waits in a little tent; when a bed frees
// up it moves in; after TENT_WAIT it gives up and leaves; no more than TENT_MAX tents; none during the tutorial.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };
// 12 purchases: 8 beds (6 in the pen, 2 lily pads), all taken
const full = ['chmurnik', 'smok', 'feniks', 'gryf', 'grzybolak', 'kraken', 'zabiksiaze', 'nessie'].map((name) => ({ name, hearts: 1 }));
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => console.log('ERR ' + e.message));
await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), { ver: 2, coins: 0, bought: 12, hearts: 20, residents: full });
await p.goto(BASE + '?dtmax=0.4&nostory&quality=0');
await p.waitForTimeout(14000);
const G = (f, a) => p.evaluate(f, a);
check(await G(() => window.__G().beds.every((x) => x.owner)), 'every bed is taken');
// cure the waiting patients one after another (more than TENT_MAX)
const cureOne = () => G(() => {
  const g = window.__G();
  const q = g.patients.find((x) => x.state === 'waiting' || x.state === 'arriving');
  if (q) g.cure(q);
  return !!q;
});
let cured = 0;
for (let i = 0; i < 40 && cured < 4; i++) { if (await cureOne()) cured++; await p.waitForTimeout(1500); }
await p.waitForTimeout(3000);
let st = await G(() => { const g = window.__G(); return { guests: g.patients.filter((x) => x.state === 'guest').length, tents: g.patients.filter((x) => x.tent).length, leaving: g.patients.filter((x) => x.state === 'leaving').length }; });
check(cured === 4 && st.guests === 3 && st.tents === 3, `three cured patients wait in tents, the fourth goes home (${cured} cured, ${JSON.stringify(st)})`);
const guest = await G(() => { const q = window.__G().patients.find((x) => x.state === 'guest'); return [q.c.root.position.x, q.c.root.position.z]; });
await G(([x, z]) => window.__walk(x, z + 1.5), guest);
await p.waitForTimeout(5000);
await p.screenshot({ path: 'out/tent.png' });
// a bed frees up: a guest moves in
const before = await G(() => window.__G().residents.length);
await G(() => { const g = window.__G(); const r = g.residents[0]; g.residents.splice(0, 1); r.bed.owner = null; g.d.scene.remove(r.c.root); });
await p.waitForTimeout(3000);
st = await G(() => { const g = window.__G(); return { guests: g.patients.filter((x) => x.state === 'guest').length, residents: g.residents.length, tents: g.props.filter((o) => o.userData.tick && o.children.length === 7).length }; });
check(st.guests === 2 && st.residents === before, `a guest takes the free bed (${JSON.stringify(st)}, residents before ${before})`);
// time is up: the others fold their tents and go
await G(() => { for (const q of window.__G().patients) if (q.state === 'guest') q.stateT = 999; });
await p.waitForTimeout(2000);
st = await G(() => { const g = window.__G(); return { guests: g.patients.filter((x) => x.state === 'guest').length, tents: g.patients.filter((x) => x.tent).length }; });
check(st.guests === 0 && st.tents === 0, `after the wait the guests leave and their tents fold (${JSON.stringify(st)})`);
await p.close();

// in the tutorial there are no tents
const q = await b.newPage({ viewport: { width: 390, height: 844 } });
await q.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), { ver: 2, coins: 0, bought: 0, hearts: 0, residents: [{ name: 'chmurnik', hearts: 0 }, { name: 'chmurnik', hearts: 0 }] });
await q.goto(BASE + '?dtmax=0.4&nostory&quality=0');
await q.waitForTimeout(14000);
const t0 = await q.evaluate(async () => {
  const g = window.__G();
  g.step = 1;
  for (let i = 0; i < 40 && !g.patients.some((x) => x.state === 'waiting'); i++) await new Promise((r) => setTimeout(r, 500));
  const x = g.patients.find((x) => x.state === 'waiting');
  if (x) g.cure(x);
  await new Promise((r) => setTimeout(r, 4000));
  return { cured: !!x, guests: g.patients.filter((x) => x.state === 'guest').length };
});
check(t0.cured && t0.guests === 0, `no tent during the tutorial (${JSON.stringify(t0)})`);
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
