// After models/lighter.sh: render each model before and after and count new dark speckles (texture seams torn by
// the simplifier). Needs `npm run serve`. Prints names with their speckle count; anything above ~150 is visible.
//   node models/speckles.mjs smok chmurnik ...
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 420 } });
const shot = async (m) => {
  await p.goto('http://localhost:4180/tools/viewer/preview.html?m=' + m);
  await p.waitForFunction(() => document.title === 'done', null, { timeout: 180000 });
  return (await p.screenshot()).toString('base64');
};
for (const name of process.argv.slice(2)) {
  const a = await shot(`tools/work/lighter/${name}.orig.glb`), c = await shot(`tools/work/lighter/${name}.glb`);
  const n = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + s; });
    const [ia, ic] = await Promise.all([load(a), load(c)]);
    const px = (i) => { const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const g = cv.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), dc = px(ic);
    const lum = (d, k) => 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
    let n = 0;
    for (let k = 0; k < da.length; k += 4) if (lum(dc, k) < 60 && lum(da, k) - lum(dc, k) > 60) n++;
    return n;
  }, [a, c]);
  console.log(`${name} ${n}`);
}
await b.close();
