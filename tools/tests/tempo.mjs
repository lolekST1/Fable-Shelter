// Tempo gry z kilku przejść naraz. Czyta out/playthrough_*.json (z tests/playthrough.mjs) i liczy dla każdego
// zakupu medianę, minimum i maksimum minut gry od poprzedniego zakupu. Pojedynczy przebieg nie wystarcza do porównań
// (rozrzut między przebiegami bywa kilkunastominutowy), dlatego tu zawsze patrzymy na kilka.
//   node tests/tempo.mjs                 # tabela + porównanie z docs/tempo.json, jeśli jest
//   SAVE=1 node tests/tempo.mjs          # zapisuje wynik jako nowy punkt odniesienia w docs/tempo.json
//   FILES=out/a_1.json,out/a_2.json node tests/tempo.mjs   # inne pliki niż out/playthrough_*.json
// Wypisuje obserwacje, nie werdykty: co jest wolniejsze lub szybsze i o ile. Ocena należy do człowieka albo agenta.
import fs from 'fs';
import path from 'path';

const BASE_FILE = path.join('..', 'docs', 'tempo.json');
const files = process.env.FILES
  ? process.env.FILES.split(',')
  : fs.readdirSync('out').filter((f) => /^playthrough_\d+\.json$/.test(f)).map((f) => path.join('out', f));
if (!files.length) { console.log('Brak plików out/playthrough_*.json. Najpierw: RUNS=3 CAREFUL=1 node tests/playthrough.mjs'); process.exit(1); }
const runs = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));

const med = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = (x) => (x === undefined || Number.isNaN(x) ? '   -' : x.toFixed(1).padStart(5));

// minuty gry na każdy zakup (od poprzedniego) i minuta zakupu od startu
const maxBuys = Math.max(...runs.map((r) => r.buys.length));
const buys = [];
for (let i = 0; i < maxBuys; i++) {
  const gaps = [], at = [], cures = [];
  for (const r of runs) {
    const b = r.buys[i];
    if (!b) continue;
    const prev = r.buys[i - 1] ?? { t: 0, cures: 0 };
    gaps.push((b.t - prev.t) / 60);
    at.push(b.t / 60);
    cures.push(b.cures - prev.cures);
  }
  buys.push({ i: i + 1, n: gaps.length, gap: med(gaps), min: Math.min(...gaps), max: Math.max(...gaps), at: med(at), cures: med(cures) });
}

// monety na minutę po ostatnim zakupie (nie ma ich na co wydać) z próbek [t, coins, ...]
const surplus = runs.map((r) => {
  if (r.doneAt == null) return undefined;
  const after = r.samples.filter((s) => s[0] >= r.doneAt);
  if (after.length < 30) return undefined;
  const a = after[0], z = after[after.length - 1];
  return (z[1] - a[1]) / ((z[0] - a[0]) / 60);
}).filter((x) => x !== undefined);

// podział czasu opiekuna (procent sekund) — suma po przebiegach
const why = {};
for (const r of runs) for (const [k, v] of Object.entries(r.why_t ?? {})) why[k] = (why[k] ?? 0) + v;
const whyAll = Object.values(why).reduce((a, b) => a + b, 0) || 1;
const share = Object.fromEntries(Object.entries(why).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round((v / whyAll) * 100)]));

const summary = {
  date: new Date().toISOString().slice(0, 10),
  runs: runs.length,
  allBuys: runs.map((r) => r.buys.length),
  endMin: med(runs.map((r) => (r.doneAt ?? r.t) / 60)),
  finished: runs.filter((r) => r.doneAt != null).length,
  cures: med(runs.map((r) => r.cures)),
  adoptions: med(runs.map((r) => r.adoptions)),
  turnedAway: med(runs.map((r) => r.turnedAway)),
  heartWaitS: med(runs.map((r) => r.heartWait)),
  stucks: runs.map((r) => r.stucks ?? 0),
  surplusPerMin: surplus.length ? Math.round(med(surplus)) : null,
  share,
  buys,
};

const base = fs.existsSync(BASE_FILE) ? JSON.parse(fs.readFileSync(BASE_FILE, 'utf8')) : null;

console.log(`\nTempo z ${runs.length} przejść (${files.join(', ')})`);
console.log(`zakup | minuta gry (mediana) | minut od poprzedniego: mediana  min  max | wyleczeń po drodze${base ? ' | punkt odniesienia ' + base.date + ': mediana, różnica' : ''}`);
for (const b of buys) {
  const o = base?.buys?.[b.i - 1];
  const diff = o ? b.gap - o.gap : undefined;
  const note = o && Math.abs(diff) >= 1 && Math.abs(diff) / o.gap >= 0.25 ? (diff > 0 ? '  ← wolniej' : '  ← szybciej') : '';
  console.log(`  ${String(b.i).padStart(2)}${b.n < runs.length ? '*' : ' '} ${f1(b.at)} | ${f1(b.gap)} ${f1(b.min)} ${f1(b.max)} | ${String(Math.round(b.cures)).padStart(3)}${o ? ` | ${f1(o.gap)} ${diff >= 0 ? '+' : ''}${diff.toFixed(1)}${note}` : ''}`);
}
if (buys.some((b) => b.n < runs.length)) console.log('  * nie każdy przebieg doszedł do tego zakupu');

const line = (label, now, old, unit = '') => console.log(`  ${label}: ${now}${unit}${old !== undefined && old !== null ? `  (było ${old}${unit})` : ''}`);
console.log('\nCałość (mediany):');
line('zakupy w przebiegach', summary.allBuys.join(', '), base?.allBuys?.join(', '));
line('koniec gry albo limit, minuta', summary.endMin.toFixed(0), base?.endMin?.toFixed(0));
line('przebiegi, które kupiły wszystko', `${summary.finished}/${runs.length}`, base ? `${base.finished}/${base.runs}` : undefined);
line('wyleczenia', summary.cures, base?.cures);
line('adopcje', summary.adoptions, base?.adoptions);
line('odesłani z braku legowiska', summary.turnedAway, base?.turnedAway);
line('sekundy czekania tylko na serduszka', summary.heartWaitS, base?.heartWaitS);
line('zacięcia automatu (na przebieg)', summary.stucks.join(', '), base?.stucks?.join(', '));
line('monety na minutę po ostatnim zakupie', summary.surplusPerMin ?? 'brak (nikt nie skończył)', base?.surplusPerMin);
console.log(`  czas opiekuna (%): ${JSON.stringify(share)}`);

// obserwacje, bez ocen
const obs = [];
const gaps = buys.map((b) => b.gap);
for (let i = 1; i < buys.length - 1; i++) {
  const around = (gaps[i - 1] + gaps[i + 1]) / 2;
  if (gaps[i] > around * 2 && gaps[i] - around >= 2) obs.push(`zakup ${buys[i].i} trwa ${gaps[i].toFixed(1)} min, sąsiednie średnio ${around.toFixed(1)}`);
}
for (const b of buys) if (b.max - b.min >= 4) obs.push(`zakup ${b.i}: rozrzut ${b.min.toFixed(1)}–${b.max.toFixed(1)} min między przebiegami`);
if (summary.heartWaitS > 30) obs.push(`serduszka blokowały zakupy przez ${summary.heartWaitS} s (mediana)`);
// „zacięcia” to każde ominięcie przeszkody przez automat (zwykle ok. 100 na przebieg), więc liczy się tylko wzrost
const stuckNow = med(summary.stucks), stuckOld = base?.stucks ? med(base.stucks) : null;
if (stuckOld !== null && stuckNow > stuckOld * 1.5 && stuckNow - stuckOld > 30) obs.push(`automat częściej utyka: ${stuckNow} razy na przebieg (było ${stuckOld}), sprawdź trasy i kolizje`);
if (obs.length) { console.log('\nObserwacje:'); for (const o of obs) console.log('  - ' + o); }

if (process.env.SAVE) {
  fs.writeFileSync(BASE_FILE, JSON.stringify(summary, null, 1) + '\n');
  console.log(`\nZapisano punkt odniesienia: docs/tempo.json`);
}
