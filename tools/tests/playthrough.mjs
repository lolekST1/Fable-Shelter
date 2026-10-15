// Balance: a bot plays the whole game from an empty shelter to the last build spot, fast-forwarded
// (?speed=N runs N game steps per frame, ?norender skips drawing). It plays like a decent player: brings cures
// to patients, feeds and tucks in residents, says goodbye at adoptions, picks up coins and buys the next spot
// as soon as it can. Areas with a hired helper are left to the helper while there is anything else to do.
// Writes out/playthrough_<run>.json and prints a table: game minutes per purchase, cures and adoptions it took.
//   RUNS=2 MAXMIN=150 SPEED=60 node tests/playthrough.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
const RUNS = +(process.env.RUNS ?? 1);
const MAXMIN = +(process.env.MAXMIN ?? 150); // stop after this many game minutes
const AFTER = +(process.env.AFTER ?? 5); // game minutes to keep playing after the last purchase
const SPEED = +(process.env.SPEED ?? 60);
fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

/** runs inside the page: the bot, called before every game step */
function bot() {
  const B = (window.__bot = {
    t: 0, decideT: 0, path: [], goal: null, why: 'idle', stuckT: 0, lastPos: null,
    cures: 0, curesZone: { camp: 0, pond: 0, glade: 0, snow: 0 }, adoptions: 0, bonus: 0, turnedAway: 0,
    buys: [], samples: [], idle: 0, noCoinsUntil: 0, coin: null, heartWait: 0, waits: [], doneAt: null, why_t: {},
  });
  const V = (x, z) => ({ x, z });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const zoneOf = (g, p) => { const z = g.zone(p); return z === 'pen' ? 'camp' : z; };
  let hooked = null;
  window.__tick = (dt) => {
    const g = window.__G?.();
    if (!g) return;
    if (hooked !== g) {
      hooked = g;
      // count cures, adoptions and goodbye bonuses by wrapping the game's own methods
      const cure = g.cure.bind(g);
      g.cure = (p) => { B.cures++; B.curesZone[p.sp.zone ?? 'camp']++; if (p.waitStart !== undefined) B.waits.push(B.t - p.waitStart); cure(p); };
      const farewell = g.farewell.bind(g);
      g.farewell = (r) => { B.adoptions++; if (g.d.keeper.root.position.distanceTo(r.c.root.position) < 3) B.bonus++; farewell(r); };
    }
    B.t += dt;
    const k = g.d.keeper.root.position;
    for (const p of g.patients) {
      if (p.waitStart === undefined && (p.state === 'waiting' || p.state === 'arriving')) p.waitStart = B.t;
      if (p.state === 'leaving' && !p.counted) { p.counted = true; B.turnedAway++; }
    }
    // purchases
    if (g.bought > B.buys.length) {
      while (B.buys.length < g.bought) B.buys.push({ i: B.buys.length, t: B.t, cures: B.cures, adoptions: B.adoptions, hearts: g.hearts, coins: g.coins });
      if (g.spots.length === 0) B.doneAt ??= B.t;
    }
    // once a second: how busy the camp is
    if (Math.floor(B.t) !== Math.floor(B.t - dt)) {
      const waiting = g.patients.filter((p) => p.state === 'waiting' || p.state === 'arriving').length;
      const needs = g.residents.filter((r) => r.need).length;
      B.samples.push([+B.t.toFixed(0), g.coins, g.hearts, waiting, needs, g.residents.length, g.carry.length, B.why, +k.x.toFixed(1), +k.z.toFixed(1), B.goal && +B.goal.x.toFixed(1), B.goal && +B.goal.z.toFixed(1), g.carry.map((v) => v.userData.kind).join(",")]);
      B.why_t[B.why] = (B.why_t[B.why] ?? 0) + 1;
      const next = g.spots.find((s) => s.index === g.bought);
      if (next && g.coins >= next.def.price - next.paid && (next.def.hearts ?? 0) > g.hearts) B.heartWait++;
    }

    B.decideT -= dt;
    if (B.decideT <= 0) {
      B.decideT = 0.25;
      const [goal, why] = decide(g, k);
      if (!B.goal || dist(goal, B.goal) > 0.3 || why !== B.why) B.path = detour(g, k, roundPen(k, g.route(k.clone(), new k.constructor(goal.x, 0, goal.z)).map((p) => V(p.x, p.z))), why);
      B.goal = goal;
      B.why = why;
      // stuck against something: step aside for a moment
      if (B.lastPos && dist(B.lastPos, k) < 0.05 && dist(k, goal) > 0.5) B.stuckT += 0.25; else B.stuckT = 0;
      B.lastPos = V(k.x, k.z);
      // going back and forth without getting anywhere (a coin behind the fence): give up on coins for a while
      if (B.t - (B.anchorT ?? 0) > 8) {
        if (B.anchor && dist(B.anchor, k) < 0.8 && !['idle', 'tuck', 'buy', 'goodbye'].includes(why)) { B.noCoinsUntil = B.t + 10; B.stuckT = 2; }
        B.anchor = V(k.x, k.z);
        B.anchorT = B.t;
      }
      if (B.stuckT > 1.5) { B.path = [V(k.x + (Math.random() - 0.5) * 2, k.z + (Math.random() - 0.5) * 2)]; B.goal = null; B.stuckT = 0; B.stucks = (B.stucks ?? 0) + 1; }
    }
    while (B.path.length > 1 && dist(B.path[0], k) < 0.35) B.path.shift();
    if (B.path.length) window.__walk(B.path[0].x, B.path[0].z);
  };

  // the game's route() goes through the pen gates, but a leg from a gate to a far target can still cut across
  // the fence: add points round the outside of the pen (radius 3.6)
  function roundPen(k, path) {
    const out = [];
    let from = V(k.x, k.z);
    for (const to of path) {
      for (let n = 0; n < 8; n++) {
        const dx = to.x - from.x, dz = to.z - from.z, L2 = Math.max(1e-6, dx * dx + dz * dz);
        const t = Math.max(0, Math.min(1, -(from.x * dx + from.z * dz) / L2));
        const cx = from.x + dx * t, cz = from.z + dz * t, d = Math.hypot(cx, cz);
        const outside = (p) => Math.hypot(p.x, p.z) > 3.4;
        if (d > 4.1 || !outside(from) || !outside(to) || t <= 0 || t >= 1) break;
        // step round on the side the leg passes, an eighth of a turn at a time, so each new leg clears the fence too
        const a0 = Math.atan2(from.z, from.x), a = d > 1e-3 ? Math.atan2(cz, cx) : a0 + Math.PI / 2;
        let da = a - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const step = a0 + Math.sign(da) * Math.min(Math.abs(da) + 0.6, Math.PI / 4);
        const w = V(Math.cos(step) * 4.7, Math.sin(step) * 4.7);
        out.push(w);
        from = w;
      }
      out.push(to);
      from = to;
    }
    return out;
  }

  // walking past a station picks up everything on its tray; a careful player (?careful) steps round the
  // stations it does not need, so the arms are not filled with berries on the way to the cauldron
  const careful = location.search.includes('careful');
  function detour(g, k, path, why) {
    if (!careful) return path;
    const out = [];
    let from = V(k.x, k.z);
    for (const to of path) {
      const dx = to.x - from.x, dz = to.z - from.z, L2 = Math.max(1e-6, dx * dx + dz * dz);
      // and the basket, which tips the whole pile in, unless that is where it is going
      const avoid = [...g.stations.map((s) => s.pos), ...(why === 'basket' ? [] : [g.basket.position])];
      for (const s of avoid) {
        if (dist(s, to) < 1.6 || dist(s, from) < 1.6) continue; // going to (or leaving) this one
        const t = Math.max(0, Math.min(1, ((s.x - from.x) * dx + (s.z - from.z) * dz) / L2));
        const cx = from.x + dx * t, cz = from.z + dz * t, d = Math.hypot(cx - s.x, cz - s.z);
        if (d < 1.6) {
          const nx = d > 1e-3 ? (cx - s.x) / d : -dz / Math.sqrt(L2), nz = d > 1e-3 ? (cz - s.z) / d : dx / Math.sqrt(L2);
          out.push(V(s.x + nx * 1.9, s.z + nz * 1.9));
          break;
        }
      }
      out.push(to);
      from = to;
    }
    return out;
  }

  // what a decent player would do next: [where to go, why]
  function decide(g, k) {
    const workerZones = new Set(g.workers.map((w) => w.zone));
    // a helper's area is left to the helper unless there is nothing else to do
    const cost = (p, zone) => dist(p, k) + (workerZones.has(zone) ? 25 : 0);
    const best = (list) => list.sort((a, b) => a[0] - b[0])[0];
    const kinds = g.carry.filter((v) => v.userData.landed).map((v) => v.userData.kind);
    const has = (kind) => kinds.includes(kind);
    const waiting = g.patients.filter((p) => p.state === 'waiting' || p.state === 'arriving');
    const residents = g.residents.filter((r) => r.state === 'idle' || r.state === 'toBed');

    // a spot to buy
    const next = g.spots.find((s) => s.index === g.bought);
    const looseCoins = g.ground.filter((c) => !c.magnet);
    // stick to one coin until it is picked up (or given up on), so the goal does not flip between coins
    if (!looseCoins.includes(B.coin) || B.t < B.noCoinsUntil) B.coin = null;
    B.coin ??= looseCoins.filter((c) => dist(c.m.position, k) < 4).sort((a, b) => dist(a.m.position, k) - dist(b.m.position, k))[0] ?? null;
    if (B.coin && B.t >= B.noCoinsUntil) return [V(B.coin.m.position.x, B.coin.m.position.z), 'coins'];
    if (next && g.coins >= next.def.price - next.paid && (next.def.hearts ?? 0) <= g.hearts)
      return [V(next.pos.x, next.pos.z), 'buy'];

    const jobs = [];
    // cures in hand for a patient
    for (const p of waiting) if (has(p.sp.cure)) {
      const pp = p.c.root.position, d = Math.max(1e-3, dist(pp, k));
      jobs.push([cost(pp, zoneOf(g, pp)), V(pp.x + ((k.x - pp.x) / d) * 0.9, pp.z + ((k.z - pp.z) / d) * 0.9), 'cure']);
    }
    // berries in hand for a hungry resident
    for (const r of residents) if (r.need === 'food' && !r.fedIncoming && has('berry')) {
      const rp = r.c.root.position, d = Math.max(1e-3, dist(rp, k));
      jobs.push([cost(rp, r.bed.zone), V(rp.x + ((k.x - rp.x) / d) * 0.9, rp.z + ((k.z - rp.z) / d) * 0.9), 'feed']);
    }
    // a sleepy resident: stand on its bed
    for (const r of residents) if (r.need === 'sleep' && r.state === 'idle') jobs.push([cost(r.bed.pos, r.bed.zone), V(r.bed.pos.x, r.bed.pos.z), 'tuck']);
    // an adopter is on the way: be there for the goodbye bonus
    for (const a of g.adopters) if (a.state !== 'go') { const rp = a.r.c.root.position; jobs.push([dist(rp, k) + 4, V(rp.x + 0.9, rp.z + 0.6), 'goodbye']); }
    let j = best(jobs);
    if (j && j[0] < 25) return [j[1], j[2]];

    // fetch what is missing from the stations
    const want = new Map();
    for (const p of waiting) if (!has(p.sp.cure) && !p.claimed) want.set(p.sp.cure, Math.min(want.get(p.sp.cure) ?? 99, workerZones.has(zoneOf(g, p.c.root.position)) ? 25 : 0));
    for (const r of residents) if (r.need === 'food' && !r.fedIncoming && !has('berry')) want.set('berry', Math.min(want.get('berry') ?? 99, workerZones.has(r.bed.zone) ? 25 : 0));
    if (g.carry.length >= g.capacity && want.size) {
      const bk = g.basket.position;
      return [V(bk.x + 0.7, bk.z - 0.4), 'basket'];
    }
    const fetch = [];
    for (const s of g.stations) if (want.has(s.kind) && s.tray.length) {
      const front = V(s.pos.x - 0.2, s.pos.z + 0.9);
      fetch.push([dist(front, k) + want.get(s.kind), front, 'fetch']);
    }
    const f = best(fetch);
    if (f && f[0] < 25) return [f[1], f[2]];

    // coins lying around
    const c = B.t < B.noCoinsUntil ? null : best(looseCoins.map((c) => [dist(c.m.position, k), V(c.m.position.x, c.m.position.z), 'coins']));
    if (c) return [c[1], c[2]];
    // the helpers' areas after all
    if (j) return [j[1], j[2]];
    if (f) return [f[1], f[2]];
    // nothing to do: wait by the newest medicine station, ready for the next patient
    const s = g.stations.filter((s) => s.kind !== 'berry').pop();
    return [V(s.pos.x - 0.2, s.pos.z + 0.9), 'idle'];
  }
}

const results = [];
for (let run = 1; run <= RUNS; run++) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => console.log('ERR ' + e.message));
  await p.addInitScript(bot);
  await p.goto(BASE + `?reset=1&norender&speed=${SPEED}${process.env.CAREFUL ? '&careful' : ''}`);
  let last = -1;
  for (;;) {
    await p.waitForTimeout(10000);
    const s = await p.evaluate(() => { const B = window.__bot, g = window.__G(); return { t: B.t, bought: g?.bought, coins: g?.coins, hearts: g?.hearts, cures: B.cures, doneAt: B.doneAt, why: B.why }; });
    const min = s.t / 60;
    if (Math.floor(min / 5) !== last) { last = Math.floor(min / 5); console.log(`run ${run}  ${min.toFixed(1)} min  bought ${s.bought}  coins ${s.coins}  hearts ${s.hearts}  cures ${s.cures}  (${s.why})`); }
    if (min > MAXMIN || (s.doneAt !== null && s.t - s.doneAt > AFTER * 60)) break;
  }
  await p.screenshot({ path: `out/playthrough_${run}.png`, timeout: 150000 }).catch(() => {});
  const B = await p.evaluate(() => { const g = window.__G(); return { ...window.__bot, path: undefined, goal: undefined, lastPos: undefined, coin: undefined, anchor: undefined, endCoins: g.coins, endHearts: g.hearts, workers: g.workers.length, residents: g.residents.length }; });
  fs.writeFileSync(`out/playthrough_${run}.json`, JSON.stringify(B));
  results.push(B);
  await p.close();

  console.log(`\nrun ${run}: purchase | game minute | minutes since previous | cures in between | adoptions in between | hearts`);
  let prev = { t: 0, cures: 0, adoptions: 0 };
  for (const x of B.buys) {
    console.log(`  ${String(x.i + 1).padStart(2)}  ${(x.t / 60).toFixed(1).padStart(6)}  ${((x.t - prev.t) / 60).toFixed(1).padStart(5)}  ${String(x.cures - prev.cures).padStart(3)}  ${String(x.adoptions - prev.adoptions).padStart(3)}  ${x.hearts}`);
    prev = x;
  }
  const avgWait = B.waits.reduce((a, w) => a + w, 0) / Math.max(1, B.waits.length);
  console.log(`  cures ${B.cures} ${JSON.stringify(B.curesZone)}, adoptions ${B.adoptions} (goodbye bonus ${B.bonus}), turned away for lack of beds ${B.turnedAway}`);
  console.log(`  avg patient wait ${avgWait.toFixed(1)} s, seconds blocked only by hearts ${B.heartWait}, end coins ${B.endCoins}`);
  console.log(`  keeper time by activity (s): ${JSON.stringify(B.why_t)}\n`);
}
await b.close();
