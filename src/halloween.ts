import * as THREE from 'three';
import { today } from './daily';

/**
 * Halloween: from 24 October to 2 November (?halloween turns it on any day, for tests). Two camp species come only
 * then (dyniak, duszek), the camp gets carved pumpkins round the pen that glow at night and bats at dusk, and the
 * wardrobe sells a witch hat and a trail of pumpkin sparks. What was adopted or bought stays after the event.
 */
export function halloween() {
  if (new URLSearchParams(location.search).has('halloween')) return true;
  const [, m, d] = today().split('-').map(Number);
  return (m === 10 && d >= 24) || (m === 11 && d <= 2);
}

/** the event's own species: a camp patient now and then while it lasts */
export const HALLOWEEN_SPECIES = ['dyniak', 'duszek'];
/** share of camp patients that are Halloween ones */
export const HALLOWEEN_CHANCE = 0.3;

/** a carved pumpkin's face (eyes, nose, toothy grin), lit from inside */
function faceTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffb030';
  for (const x of [38, 90]) {
    g.beginPath(); g.moveTo(x - 16, 54); g.lineTo(x + 16, 54); g.lineTo(x, 30); g.closePath(); g.fill();
  }
  g.beginPath(); g.moveTo(56, 72); g.lineTo(72, 72); g.lineTo(64, 60); g.closePath(); g.fill();
  g.beginPath();
  g.moveTo(24, 82); g.quadraticCurveTo(64, 122, 104, 82); g.quadraticCurveTo(64, 100, 24, 82);
  g.fill();
  g.fillStyle = '#e8701a';
  g.fillRect(48, 84, 10, 9); g.fillRect(70, 84, 10, 9); // teeth left in the grin
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Pumpkins at the given spots (x, z, size, turn), each facing the camera side. Three instanced meshes in all (bodies,
 * stems, faces), so a dozen pumpkins cost three draw calls. `glow(n)` lights the faces (0 by day, 1 at night).
 */
export function pumpkins(at: [number, number, number, number][]) {
  const g = new THREE.Group();
  const body = new THREE.SphereGeometry(0.3, 14, 8);
  body.scale(1, 0.78, 1);
  // shallow ribs, so it reads as a pumpkin and not an orange
  const p = body.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 - 0.06 * Math.abs(Math.sin(a * 4));
    p.setXYZ(i, x * k, p.getY(i), z * k);
  }
  body.computeVertexNormals();
  body.translate(0, 0.22, 0);
  const stem = new THREE.CylinderGeometry(0.03, 0.045, 0.14, 6);
  stem.translate(0, 0.5, 0);
  const face = new THREE.PlaneGeometry(0.36, 0.36);
  face.translate(0, 0.24, 0.27);
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture(), transparent: true, color: 0x9a5a20 });
  const meshes = [
    new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ color: 0xf08a24, roughness: 0.7 }), at.length),
    new THREE.InstancedMesh(stem, new THREE.MeshStandardMaterial({ color: 0x5f8a32, roughness: 0.8 }), at.length),
    new THREE.InstancedMesh(face, faceMat, at.length),
  ];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  at.forEach(([x, z, size, turn], i) => {
    m.compose(v.set(x, 0, z), q.setFromAxisAngle(up, turn), s.setScalar(size));
    for (const mesh of meshes) mesh.setMatrixAt(i, m);
  });
  meshes[0].castShadow = true;
  g.add(...meshes);
  g.userData.glow = (n: number) => { faceMat.color.setRGB(0.6 + 0.4 * n, 0.35 + 0.65 * n, 0.12 + 0.5 * n); };
  return g;
}

/** a few bats flapping in loops over the camp at dusk and night; `tick(t, night)` moves them (night 0..1) */
export function bats(n = 6) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3a2a4a';
  g.beginPath();
  g.moveTo(64, 26);
  g.quadraticCurveTo(40, 4, 6, 16); g.quadraticCurveTo(20, 24, 16, 34); g.quadraticCurveTo(30, 28, 34, 40); g.quadraticCurveTo(46, 32, 56, 42);
  g.lineTo(64, 36); g.lineTo(72, 42);
  g.quadraticCurveTo(82, 32, 94, 40); g.quadraticCurveTo(98, 28, 112, 34); g.quadraticCurveTo(108, 24, 122, 16); g.quadraticCurveTo(88, 4, 64, 26);
  g.fill();
  g.beginPath(); g.ellipse(64, 30, 9, 11, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffd34d';
  g.beginPath(); g.arc(60, 27, 2, 0, Math.PI * 2); g.arc(68, 27, 2, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const list: { s: THREE.Sprite; r: number; h: number; w: number; a: number; cx: number; cz: number }[] = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    s.scale.set(0.5, 0.25, 1);
    group.add(s);
    list.push({ s, r: 2 + (i % 3) * 1.4, h: 2.6 + (i % 2) * 0.8, w: (i % 2 ? 1 : -1) * (0.5 + i * 0.07), a: i * 1.7, cx: ((i * 37) % 7) - 3, cz: ((i * 53) % 7) - 1 });
  }
  group.userData.tick = (t: number, night: number) => {
    group.visible = night > 0.3;
    if (!group.visible) return;
    for (const b of list) {
      const a = b.a + t * b.w;
      b.s.position.set(b.cx + Math.cos(a) * b.r, b.h + Math.sin(t * 2 + b.a) * 0.3, b.cz + Math.sin(a) * b.r);
      b.s.scale.set(0.5, 0.25 * (0.6 + 0.4 * Math.abs(Math.sin(t * 14 + b.a))), 1); // flapping
      (b.s.material as THREE.SpriteMaterial).opacity = Math.min(1, (night - 0.3) * 3);
    }
  };
  return group;
}
