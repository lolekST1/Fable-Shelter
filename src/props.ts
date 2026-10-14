import * as THREE from 'three';
import type { Medicine } from './icons';

/** Meshes for the gameplay props: medicines, the stations that make them, coins and particles. */

const mats = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb07a4a, roughness: 0.9 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff2f7e, emissiveIntensity: 0.35, roughness: 0.3 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x4fb4ff, emissive: 0x1f7fd0, emissiveIntensity: 0.35, roughness: 0.15 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x59c25a, emissive: 0x1f6a2a, emissiveIntensity: 0.2, roughness: 0.6, side: THREE.DoubleSide }),
  twine: new THREE.MeshStandardMaterial({ color: 0xd9b07a, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.85 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0xa87c52, roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xa3abb5, roughness: 0.8 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x4b4560, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }),
  ironDark: new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.6 }),
};

const leafGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.07, 0.08, 0, 0.2);
  s.quadraticCurveTo(-0.07, 0.08, 0, 0);
  return new THREE.ShapeGeometry(s, 6);
})();

/** one portion of medicine, ~0.25 tall, standing on its own origin */
export function medicineMesh(kind: Medicine): THREE.Group {
  const g = new THREE.Group();
  if (kind === 'pink') {
    // warm brew in a round flask
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mats.glass);
    bulb.position.y = 0.075;
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.063, 16, 12), mats.pink);
    fill.position.y = 0.072;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.08, 12), mats.glass);
    neck.position.y = 0.17;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.04, 10), mats.cork);
    cork.position.y = 0.225;
    g.add(fill, bulb, neck, cork);
  } else if (kind === 'blue') {
    // spring water in a tall bottle
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.16, 14), mats.glass);
    body.position.y = 0.08;
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.052, 0.13, 14), mats.blue);
    fill.position.y = 0.07;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.06, 12), mats.glass);
    neck.position.y = 0.19;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.025, 0.04, 10), mats.cork);
    cork.position.y = 0.235;
    g.add(fill, body, neck, cork);
  } else {
    // a little bundle of fresh herbs tied with twine
    for (let i = 0; i < 5; i++) {
      const l = new THREE.Mesh(leafGeo, mats.leaf);
      l.position.y = 0.06;
      l.rotation.set(0, (i / 5) * Math.PI * 2, (i % 2 ? 1 : -1) * 0.25);
      l.scale.setScalar(1 + (i % 3) * 0.15);
      g.add(l);
    }
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0x3f8a3a }));
    stem.position.y = 0.04;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 6, 14), mats.twine);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.06;
    g.add(stem, tie);
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.userData.kind = kind;
  g.scale.setScalar(1.25);
  return g;
}

export const coinGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20);
coinGeo.rotateX(Math.PI / 2);
export const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.7, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.25 });

export const TRAY_MAX = 6;

/**
 * A station brews one kind of medicine and sets it out on a little tray beside it.
 * Pink: cauldron. Blue: stone spring with a dripping spout. Green: planter of herbs.
 */
export class Station {
  group = new THREE.Group();
  tray: THREE.Group[] = [];
  private slots: THREE.Vector3[] = [];
  private brew = 0;
  private anim: ((t: number) => void)[] = [];
  private t = Math.random() * 5;

  constructor(public kind: Medicine, public pos: THREE.Vector3, public brewTime: number, shadowTex: THREE.Texture) {
    if (kind === 'pink') this.buildCauldron();
    else if (kind === 'blue') this.buildSpring();
    else this.buildHerbs();
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.46), mats.wood);
    board.position.set(0.82, 0.18, 0.05);
    board.castShadow = true;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8), mats.darkWood);
    stand.position.set(0.82, 0.07, 0.05);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) this.slots.push(new THREE.Vector3(0.64 + i * 0.18, 0.22, -0.07 + j * 0.24));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0.35, 0.012, 0);
    this.group.add(board, stand, sh);
    this.group.position.copy(pos);
  }

  private buildCauldron() {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 0.62;
      pts.push(new THREE.Vector2(Math.sin(a + 0.35) * 0.52, -Math.cos(a + 0.35) * 0.42 + 0.48));
    }
    pts.push(new THREE.Vector2(0.5, 0.74), new THREE.Vector2(0.56, 0.78), new THREE.Vector2(0.56, 0.84), new THREE.Vector2(0.46, 0.84));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mats.iron);
    pot.castShadow = true;
    const surface = new THREE.Mesh(new THREE.CircleGeometry(0.47, 24), new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff2f7e, emissiveIntensity: 0.6, roughness: 0.4 }));
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.76;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), mats.ironDark);
      leg.position.set(Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.32);
      this.group.add(leg);
    }
    this.group.add(pot, surface);
    this.bubbles(0.74, 0xffb8d9, 0xff7fbf, 0.5);
  }

  private buildSpring() {
    // ring of round stones around a pool, a stone spout dripping into it
    const ring = new THREE.Group();
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.15 + (i % 3) * 0.02, 12, 10), mats.stone);
      s.position.set(Math.cos(a) * 0.45, 0.13, Math.sin(a) * 0.45);
      s.scale.y = 0.8;
      s.castShadow = true;
      ring.add(s);
    }
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ color: 0x4fb4ff, emissive: 0x1f7fd0, emissiveIntensity: 0.45, roughness: 0.1 }));
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.17;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.75, 10), mats.stone);
    pillar.position.set(0, 0.38, -0.45);
    pillar.castShadow = true;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25, 8), mats.stone);
    spout.rotation.x = Math.PI / 2;
    spout.position.set(0, 0.66, -0.3);
    this.group.add(ring, water, pillar, spout);
    // drops falling from the spout
    const dropMat = new THREE.MeshStandardMaterial({ color: 0x9ad6ff, emissive: 0x4fb4ff, emissiveIntensity: 0.5 });
    for (let i = 0; i < 3; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dropMat);
      const ph = i / 3;
      this.group.add(d);
      this.anim.push((t) => {
        const p = (t * 1.2 + ph) % 1;
        d.position.set(0, 0.64 - p * p * 0.48, -0.18);
        d.scale.set(1, 1.3, 1);
      });
    }
    const rip = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    rip.rotation.x = -Math.PI / 2;
    this.group.add(rip);
    this.anim.push((t) => {
      const p = (t * 1.2) % 1;
      rip.position.set(0, 0.18, -0.18);
      rip.scale.setScalar(1 + p * 3);
      (rip.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - p);
    });
  }

  private buildHerbs() {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.6), mats.wood);
    box.position.y = 0.15;
    box.castShadow = true;
    const soil = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), mats.soil);
    soil.position.y = 0.29;
    this.group.add(box, soil);
    for (let i = 0; i < 3; i++) {
      const plant = new THREE.Group();
      for (let k = 0; k < 7; k++) {
        const l = new THREE.Mesh(leafGeo, mats.leaf);
        l.rotation.set(0, (k / 7) * Math.PI * 2, 0.35 + (k % 2) * 0.25);
        l.scale.setScalar(1.6 + (k % 3) * 0.3);
        plant.add(l);
      }
      plant.position.set(-0.3 + i * 0.3, 0.3, 0);
      this.group.add(plant);
      const ph = i * 1.3;
      this.anim.push((t) => { plant.rotation.z = Math.sin(t * 1.6 + ph) * 0.08; });
    }
  }

  private bubbles(y: number, color: number, emissive: number, spread: number) {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 10, 8), new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4 }));
      const ph = Math.random() * 6, x = (Math.random() - 0.5) * spread, z = (Math.random() - 0.5) * spread;
      this.group.add(b);
      this.anim.push((t) => {
        const p = ((t * 0.8 + ph) % 1.6) / 1.6;
        b.position.set(x, y + p * 0.25, z);
        b.scale.setScalar(p < 0.85 ? 0.6 + p * 0.6 : (1 - p) * 7);
      });
    }
  }

  /** world position of a tray slot, for flights */
  slotWorld(i: number) {
    return this.slots[i].clone().add(this.pos);
  }

  /** fills the tray instantly (used when restoring a saved game) */
  update(dt: number) {
    this.t += dt;
    for (const a of this.anim) a(this.t);
    for (const v of this.tray) if (v.scale.x < 1.25) v.scale.setScalar(Math.min(1.25, v.scale.x + dt * 6));
    if (this.tray.length >= TRAY_MAX) return;
    this.brew += dt;
    if (this.brew < this.brewTime) return;
    this.brew = 0;
    const v = medicineMesh(this.kind);
    v.position.copy(this.slots[this.tray.length]);
    v.scale.setScalar(0.01);
    this.group.add(v);
    this.tray.push(v);
  }
}

/** a wooden signpost with a heart on it: tells passing creatures where help is */
export function signpostMesh(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 8), mats.darkWood);
  post.position.y = 0.65;
  post.castShadow = true;
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.36, 0.06), mats.wood);
  board.position.set(0.12, 1.08, 0);
  board.castShadow = true;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.18, 0.06, 3), mats.wood);
  tip.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
  tip.position.set(0.62, 1.08, 0);
  const s = new THREE.Shape();
  s.moveTo(0, -0.1);
  s.bezierCurveTo(-0.16, 0.02, -0.06, 0.13, 0, 0.05);
  s.bezierCurveTo(0.06, 0.13, 0.16, 0.02, 0, -0.1);
  const heart = new THREE.Mesh(new THREE.ShapeGeometry(s, 8), new THREE.MeshStandardMaterial({ color: 0xff6f91, emissive: 0xff3f6f, emissiveIntensity: 0.4 }));
  heart.position.set(0.1, 1.08, 0.035);
  heart.scale.setScalar(1.3);
  const heart2 = heart.clone();
  heart2.position.z = -0.035;
  heart2.rotation.y = Math.PI;
  g.add(post, board, tip, heart, heart2);
  return g;
}

/** wicker basket by the pen: walk up to it to empty your arms */
export function basketMesh(): THREE.Group {
  const g = new THREE.Group();
  const wicker = new THREE.MeshStandardMaterial({ color: 0xd9a35f, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0xb07a3a, roughness: 0.9 });
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector2(0.3 + i * 0.012 + Math.sin(i * 0.4) * 0.02, i * 0.06));
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 22), wicker);
  body.material = wicker.clone();
  (body.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  body.castShadow = true;
  // woven bands
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.31 + i * 0.022, 0.018, 6, 26), dark);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.06 + i * 0.13;
    g.add(band);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.035, 8, 28), dark);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.48;
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), dark);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = 0.02;
  g.add(body, rim, bottom);
  return g;
}

/** backpack the keeper wears after the carry upgrade */
export function backpackMesh(): THREE.Group {
  const g = new THREE.Group();
  const leather = new THREE.MeshStandardMaterial({ color: 0xc47a3a, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x9a5a26, roughness: 0.8 });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), leather);
  bag.scale.set(1.15, 1.3, 0.75);
  const flap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), dark);
  flap.scale.set(1.3, 0.6, 0.9);
  flap.position.y = 0.16;
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.08), dark);
  pocket.position.set(0, -0.08, -0.17);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 0.6, roughness: 0.3 }));
  buckle.position.set(0, -0.06, -0.215);
  g.add(bag, flap, pocket, buckle);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- particles

interface Particle { m: THREE.Mesh; v: THREE.Vector3; life: number; max: number; g: number; spin: number; s: number }
type Kind = 'spark' | 'flake' | 'bubble' | 'star' | 'dust';

export class Fx {
  private list: Particle[] = [];
  private geo: Record<Kind, THREE.BufferGeometry> = {
    spark: new THREE.OctahedronGeometry(0.05),
    flake: new THREE.OctahedronGeometry(0.045),
    bubble: new THREE.SphereGeometry(0.06, 10, 8),
    star: new THREE.OctahedronGeometry(0.07),
    dust: new THREE.SphereGeometry(0.05, 8, 6),
  };
  private mat: Record<Kind, THREE.Material[]> = {
    spark: [new THREE.MeshBasicMaterial({ color: 0xff8a3d }), new THREE.MeshBasicMaterial({ color: 0xffe066 })],
    flake: [new THREE.MeshBasicMaterial({ color: 0xffffff }), new THREE.MeshBasicMaterial({ color: 0xd6ecff })],
    bubble: [new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 })],
    star: [0xffe066, 0xff8fc8, 0xffffff, 0x9ff0b0].map((c) => new THREE.MeshBasicMaterial({ color: c })),
    dust: [new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), new THREE.MeshBasicMaterial({ color: 0xbff0ff })],
  };
  constructor(private scene: THREE.Scene) {}
  emit(kind: Kind, at: THREE.Vector3, n: number, opts: { speed?: number; up?: number; dir?: THREE.Vector3; spread?: number; g?: number; life?: number; size?: number }) {
    const mats = this.mat[kind];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(this.geo[kind], mats[i % mats.length]);
      m.position.copy(at);
      const sp = (opts.speed ?? 1.5) * (0.5 + Math.random() * 0.7);
      const v = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2).normalize();
      if (opts.dir) v.lerp(opts.dir, 1 - (opts.spread ?? 0.6)).normalize();
      v.multiplyScalar(sp);
      v.y += opts.up ?? 0;
      const s = (opts.size ?? 1) * (0.7 + Math.random() * 0.6);
      m.scale.setScalar(s);
      this.scene.add(m);
      const life = (opts.life ?? 0.8) * (0.7 + Math.random() * 0.6);
      this.list.push({ m, v, life, max: life, g: opts.g ?? 4, spin: (Math.random() - 0.5) * 10, s });
    }
  }
  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.list.splice(i, 1);
        continue;
      }
      p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.03) { p.m.position.y = 0.03; p.v.multiplyScalar(0.5); }
      p.m.rotation.x += p.spin * dt;
      p.m.rotation.y += p.spin * dt;
      p.m.scale.setScalar(p.s * Math.min(1, (p.life / p.max) * 3));
    }
  }
}
