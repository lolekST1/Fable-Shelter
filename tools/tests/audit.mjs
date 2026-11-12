// Poprawki z audytu 12.11.2026 (A2-A6): środek zagrody bez niewidzialnej przeszkody, wpłacone monety i wczytujący się
// mieszkańcy zostają w zapisie, pacjenci przychodzą mimo nieudanego pobrania modelu, skały jaskini mają kolizję.
//   node tests/audit.mjs
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'ŹLE  ') + what); if (!ok) bad++; };
const ready = (p) => p.waitForFunction(() => window.__G?.()?.stations?.length, null, { timeout: 120000 });

// nowa gra; pierwsze pobranie modelu pacjenta się nie udaje
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => check(false, 'błąd strony: ' + e.message));
  let failed = 0;
  await p.route('**/models/chmurnik.glb.txt', (r) => (failed++ ? r.continue() : r.abort()));
  await p.goto(BASE + '?reset=1&nostory&dtmax=0.4&quality=5&day=2026-06-01');
  await ready(p);
  check(await p.evaluate(() => !window.__G().circles().some((c) => Math.hypot(c[0], c[1]) < 0.01)), 'A2: na środku zagrody nie ma przeszkody');
  const arrived = await p.waitForFunction(() => window.__G().patients.length > 0, null, { timeout: 90000 }).then(() => true, () => false);
  check(failed > 1 && arrived, `A5: pacjent przyszedł mimo nieudanego pobrania (pobrań modelu: ${failed})`);
  await p.evaluate(() => window.__coins(20 - window.__G().coins));
  const spot = await p.evaluate(() => window.__spots().spots[0]);
  await p.evaluate(([x, z]) => window.__walk(x, z), [spot[1], spot[2]]);
  await p.waitForFunction(() => window.__spots().spots[0][5] === 20, null, { timeout: 60000 }).catch(() => {});
  const s = await p.evaluate(() => ({ paid: window.__spots().spots[0][5], coins: window.__G().coins, saved: JSON.parse(window.__G().saveData()).coins }));
  check(s.paid === 20 && s.coins === 0 && s.saved === 20, `A3: wpłacone 20 monet zostaje w zapisie (wpłata ${s.paid}, w ręku ${s.coins}, w zapisie ${s.saved})`);
  await p.close();
}

// pełny zapis; model jednego mieszkańca wczytuje się długo
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  p.on('pageerror', (e) => check(false, 'błąd strony: ' + e.message));
  await p.addInitScript(() => localStorage.setItem('fable-shelter-save-v3', JSON.stringify({ ver: 2, coins: 0, bought: 99, hearts: 500, residents: [{ name: 'chmurnik', hearts: 1 }, { name: 'smok', hearts: 2, v: 1 }] })));
  await p.route('**/models/smok.glb.txt', async (r) => { await new Promise((ok) => setTimeout(ok, 30000)); await r.continue(); });
  await p.goto(BASE + '?nostory&dtmax=0.4&quality=5&day=2026-06-01');
  await ready(p);
  const s = await p.evaluate(() => ({ here: window.__G().residents.map((r) => r.name), saved: JSON.parse(window.__G().saveData()).residents }));
  check(!s.here.includes('smok') && s.saved.some((r) => r.name === 'smok' && r.hearts === 2 && r.v === 1), `A4: wczytujący się smok jest w zapisie (${JSON.stringify(s.saved)})`);
  const rocks = await p.evaluate(() => { const g = window.__G(), cs = g.circles(); return g.rocks.filter((h) => h.parent).map((h) => cs.some((c) => Math.hypot(c[0] - h.position.x, c[1] - h.position.z) < 0.01)); });
  check(rocks.length === 4 && rocks.every(Boolean), `A6: skały przy wejściu do jaskini mają kolizję (${rocks.length} skał)`);
  await c.close();
}
await b.close();
console.log(bad ? `NIE PRZESZŁO: ${bad}` : 'wszystko ok');
process.exit(bad ? 1 : 0);
