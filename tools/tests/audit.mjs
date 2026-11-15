// Poprawki z audytu 12.11.2026 (A1-A7, B1): środek zagrody bez niewidzialnej przeszkody, wpłacone monety i wczytujący się
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
  // B1: monety leżące na ziemi po wyleczeniu też są w zapisie
  await p.evaluate(() => { const g = window.__G(); g.cure(g.patients[0]); });
  const m = await p.evaluate(() => { const g = window.__G(); return { ground: g.ground.reduce((n, c) => n + c.value, 0), coins: g.coins, saved: JSON.parse(g.saveData()).coins }; });
  check(m.ground > 0 && m.saved === m.coins + 20 + m.ground, `B1: monety na ziemi są w zapisie (na ziemi ${m.ground}, w zapisie ${m.saved})`);
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
  // strzałka do czegoś daleko na północnym zachodzie ląduje w lewym górnym rogu: ma się zsunąć pod liczniki
  const clear = await p.evaluate(() => {
    const g = window.__G();
    g.placeEdge(g.d.keeper.root.position.clone().set(-30, 0, -30), 1, g.guideEdge);
    const x = parseFloat(g.guideEdge.style.left), y = parseFloat(g.guideEdge.style.top);
    return [...document.querySelectorAll('#coins, #hearts, #daily')].every((e) => { const r = e.getBoundingClientRect(); return !(x > r.left - 20 && x < r.right + 20 && y > r.top - 20 && y < r.bottom + 20); });
  });
  check(clear, 'strzałka przy krawędzi ekranu nie zachodzi na licznik monet, serduszek ani kartę „Dziś”');
  await c.close();
}

// A1, A7, B3: pamięć grafiki nie rośnie z każdym pacjentem, który odszedł (cały obóz w kadrze, żeby wszystko było rysowane)
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => check(false, 'błąd strony: ' + e.message));
  await p.goto(BASE + '?reset=1&nostory&dtmax=0.4&quality=5&day=2026-06-01&cam=45');
  await ready(p);
  await p.evaluate(() => {
    const g = window.__G();
    g.maxPatients = 4;
    window.__gone = 0;
    let before = 0;
    // wyleczony bez wolnego legowiska odchodzi; liczymy tych, którzy zniknęli
    window.__tick = () => {
      for (const q of g.patients) if (q.state === 'waiting' && q.stateT > 6) g.cure(q);
      const left = g.patients.filter((q) => q.state === 'leaving').length;
      if (left < before) window.__gone += before - left;
      before = left;
    };
  });
  const mem = () => p.evaluate(() => { const m = window.__renderer.info.memory; return { geometries: m.geometries, textures: m.textures, gone: window.__gone }; });
  await p.waitForFunction(() => window.__gone >= 4, null, { timeout: 200000 });
  const m0 = await mem();
  await p.waitForFunction((n) => window.__gone >= n + 10, m0.gone, { timeout: 300000 });
  const m1 = await mem();
  check(m1.textures - m0.textures < 12 && m1.geometries - m0.geometries < 12, `A1: po ${m1.gone - m0.gone} kolejnych pacjentach pamięć nie rośnie (tekstury ${m0.textures} -> ${m1.textures}, siatki ${m0.geometries} -> ${m1.geometries})`);
  const shared = await p.evaluate(() => { const t = window.__G().stations[0].tray; return t.length > 1 && t[0].children[0].geometry === t[1].children[0].geometry; });
  check(shared, 'A1: fiolki z jednej tacy mają wspólną siatkę');
  check(await p.evaluate(() => { const d = window.__G().d; return d.portrait('chmurnik', null) === d.portrait('chmurnik', null); }), 'A7: portret tego samego stworka rysuje się raz');
  // B3: kopie gatunku mają wspólny model; podwójne dispose() jednej kopii nie zwalnia go innym, ostatnia kopia go zwalnia
  // (smok: w nowej grze go nie ma, więc żadna inna kopia nie trzyma modelu)
  const b3 = await p.evaluate(async () => {
    const d = window.__G().d;
    const [x, y, z] = [await d.spawnCreature('smok', 1), await d.spawnCreature('smok', 1), await d.spawnCreature('smok', 1)];
    const shared = x.mesh.geometry === y.mesh.geometry && x.skin.map === y.skin.map && x.skin !== y.skin;
    let freed = 0;
    y.skin.map.addEventListener('dispose', () => freed++);
    x.dispose(); x.dispose();
    const afterDouble = freed;
    y.dispose(); z.dispose();
    await new Promise((r) => setTimeout(r, 50)); // the shared model is freed once its parse promise settles
    return { shared, afterDouble, afterLast: freed };
  });
  check(b3.shared, 'B3: kopie gatunku mają wspólną siatkę i tekstury, a własny materiał');
  check(b3.afterDouble === 0, `B3: podwójne dispose() jednej kopii nie zwalnia tekstur pozostałym (zwolnień: ${b3.afterDouble})`);
  check(b3.afterLast === 1, `B3: ostatnia kopia zwalnia wspólne tekstury (zwolnień: ${b3.afterLast})`);
  await p.close();
}
await b.close();
console.log(bad ? `NIE PRZESZŁO: ${bad}` : 'wszystko ok');
process.exit(bad ? 1 : 0);
