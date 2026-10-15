// Stand a generated prop upright: props are made from three-quarter images taken from above, so Pixal3D leaves
// them tilted toward that camera. Finds the tilt (around x and z) at which the model is lowest, i.e. standing on
// its base, then centres it and puts its base (1st percentile of height, so stray drips and stalks don't count)
// at y = 0.   node models/upright.mjs in.glb out.glb [tiltXdeg tiltZdeg]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';

const [inp, out, fx, fz] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(inp);
const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

// every vertex in world space (subsampled)
const pts = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const m = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const a = prim.getAttribute('POSITION');
    const step = Math.max(1, Math.floor(a.getCount() / 6000));
    const v = [0, 0, 0];
    for (let i = 0; i < a.getCount(); i += step) {
      a.getElement(i, v);
      pts.push([m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]]);
    }
  }
}
const pct = (arr, p) => { const s = Float64Array.from(arr).sort(); return s[Math.floor((s.length - 1) * p)]; };
/** rotation matrix (row-major 3x3) for x then z tilt */
const rot = (ax, az) => {
  const cx = Math.cos(ax), sx = Math.sin(ax), cz = Math.cos(az), sz = Math.sin(az);
  // Rz * Rx
  return [cz, -sz * cx, sz * sx, sz, cz * cx, -cz * sx, 0, sx, cx];
};
const apply = (r, p) => [r[0] * p[0] + r[1] * p[1] + r[2] * p[2], r[3] * p[0] + r[4] * p[1] + r[5] * p[2], r[6] * p[0] + r[7] * p[1] + r[8] * p[2]];
const height = (ax, az) => { const r = rot(ax, az); const ys = pts.map((p) => apply(r, p)[1]); return pct(ys, 0.99) - pct(ys, 0.01); };

let best = [0, 0, height(0, 0)];
const deg = Math.PI / 180;
// every prop image is a three-quarter view from above, so the tilt is always back by roughly 10–40 degrees
for (let x = -40; x <= -10; x += 1) for (let z = -8; z <= 8; z += 2) { const h = height(x * deg, z * deg); if (h < best[2]) best = [x * deg, z * deg, h]; }
// refine around the best coarse guess
if (fx !== undefined) best = [+fx * deg, +(fz ?? 0) * deg, 0]; // tilt given by hand: when bubbles or a tall shape fool the search
const [bx, bz] = best;
if (fx === undefined) for (let x = -2; x <= 2; x += 0.5) for (let z = -4; z <= 4; z += 1) { const h = height(bx + x * deg, bz + z * deg); if (h < best[2]) best = [bx + x * deg, bz + z * deg, h]; }

const r = rot(best[0], best[1]);
const rp = pts.map((p) => apply(r, p));
const ground = pct(rp.map((p) => p[1]), 0.01);
const cx = (pct(rp.map((p) => p[0]), 0.02) + pct(rp.map((p) => p[0]), 0.98)) / 2;
const cz = (pct(rp.map((p) => p[2]), 0.02) + pct(rp.map((p) => p[2]), 0.98)) / 2;

// quaternion of Rz * Rx
const qx = [Math.sin(best[0] / 2), 0, 0, Math.cos(best[0] / 2)], qz = [0, 0, Math.sin(best[1] / 2), Math.cos(best[1] / 2)];
const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const wrap = doc.createNode('upright').setRotation(mul(qz, qx)).setTranslation([-cx, -ground, -cz]);
for (const child of scene.listChildren()) { scene.removeChild(child); wrap.addChild(child); }
scene.addChild(wrap);
await io.write(out, doc);
console.log(`tilt x ${(best[0] / deg).toFixed(1)} z ${(best[1] / deg).toFixed(1)}`);
