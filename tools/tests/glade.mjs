// Glade (terrain 3): the hedge blocks the keeper until the gate is built; then the keeper walks in,
// glade patients sit in the heather, the beehive brews honey and honey cures them.
import { chromium } from 'playwright';
const BASE = process.env.GAME_URL ?? 'http://localhost:4173/';
import fs from 'fs'; fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const run = async (save, fn) => {
  const p = await b.newPage({ viewport:{width:390,height:844} });
  p.on('pageerror',e=>console.log('ERR '+e.message)); p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log('CONSOLE '+m.text())});
  await p.addInitScript((s) => localStorage.setItem('fable-shelter-save-v3', JSON.stringify(s)), save);
  await p.goto(BASE+'?dtmax=0.4&debug'); await p.waitForTimeout(12000);
  await fn(p);
  await p.close();
};
const walk = async (p, x, z, ms) => { await p.evaluate(([x,z])=>window.__walk(x,z),[x,z]); await p.waitForTimeout(ms); };
const K = (p) => p.evaluate(() => window.__keeper());
const S = (p) => p.evaluate(() => window.__game());
let fail = 0;
const check = (ok, what) => { console.log(ok ? 'OK  ' : 'FAIL', what); if (!ok) fail++; };

// 1. everything up to the pond bought: the hedge stops the keeper
await run({ coins: 0, bought: 13, hearts: 9 }, async (p) => {
  await walk(p, 15, 1.5, 9000);
  const k = await K(p);
  check(Math.hypot(k[0], k[1]) < 11.2, `hedge blocks the keeper (at ${k.map(v => v.toFixed(1))})`);
  await p.screenshot({ path: 'out/gl0.png', timeout: 150000 });
});

// 2. the whole glade bought
await run({ coins: 0, bought: 99, hearts: 15, residents: [{ name: 'leszy', hearts: 1 }, { name: 'wilkolaczek', hearts: 1 }, { name: 'sowka', hearts: 0 }] }, async (p) => {
  await walk(p, 15, 1.5, 9000);
  const k = await K(p);
  check(k[0] > 13, `keeper walks into the glade (at ${k.map(v => v.toFixed(1))})`);
  await p.waitForTimeout(8000);
  let st = await S(p);
  check(st.tray.some((t) => t.startsWith('gold') && +t.slice(4) > 0), `beehive brews honey (${st.tray})`);
  // with the snowy hill open too, the glade's own patient may take a few more seconds to turn up
  let gladeSick = [];
  for (let i = 0; i < 10 && !gladeSick.length; i++) {
    st = await S(p);
    gladeSick = st.patients.filter((x) => x[1] > 10.5 && x[0] !== 'cured' && x[0] !== 'leaving');
    if (!gladeSick.length) await p.waitForTimeout(2000);
  }
  check(gladeSick.length > 0, `a patient sits in the glade (${JSON.stringify(st.patients)})`);
  await p.screenshot({ path: 'out/gl1.png', timeout: 150000 });
  // take honey and hand it out to the glade patients
  await walk(p, 13.75, -0.7, 5000);
  st = await S(p);
  check(st.carryKinds.includes('gold'), `keeper picks up honey (${st.carryKinds})`);
  const before = (await S(p)).coins;
  for (let i = 0; i < 6; i++) {
    st = await S(p);
    const s = st.patients.find((x) => x[1] > 10.5 && (x[0] === 'waiting' || x[0] === 'arriving'));
    if (!s) break;
    await walk(p, s[1], s[2], 3500);
  }
  await p.waitForTimeout(4000);
  st = await S(p);
  check(st.coins > before, `honey cures glade patients (coins ${before} -> ${st.coins})`);
  await p.screenshot({ path: 'out/gl2.png', timeout: 150000 });
  // and back to the camp through the gate
  await p.evaluate(() => window.__go(0, 6)); await p.waitForTimeout(12000); // like a tap: back through the gap
  const k2 = await K(p);
  check(Math.hypot(k2[0], k2[1] - 6) < 1.5, `keeper walks back to the camp (at ${k2.map(v => v.toFixed(1))})`);
  console.log('residents', JSON.stringify(st.residents.map((r) => r.slice(0, 4))), 'strays', JSON.stringify(await p.evaluate(() => window.__strays())));
});
await b.close();
console.log(fail ? `${fail} FAILED` : 'all OK');
