import * as THREE from 'three';
import type { Medicine } from './icons';

/** Meshes for the gameplay props: medicines, the stations that make them, coins and particles. */

const mats = {
  glass: new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.55, clearcoat: 1 }),
  cork: new THREE.MeshStandardMaterial({ color: 0xb07a4a, roughness: 0.9 }),
  pink: new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff2f7e, emissiveIntensity: 0.35, roughness: 0.3 }),
  purple: new THREE.MeshStandardMaterial({ color: 0xa46cff, emissive: 0x7a3fe0, emissiveIntensity: 0.45, roughness: 0.3 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x4fb4ff, emissive: 0x1f7fd0, emissiveIntensity: 0.35, roughness: 0.15 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x59c25a, emissive: 0x1f6a2a, emissiveIntensity: 0.2, roughness: 0.6, side: THREE.DoubleSide }),
  twine: new THREE.MeshStandardMaterial({ color: 0xd9b07a, roughness: 0.9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.85 }),
  darkWood: new THREE.MeshStandardMaterial({ color: 0xa87c52, roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xa3abb5, roughness: 0.8 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 1 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x4b4560, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }),
  ironDark: new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.6 }),
  honey: new THREE.MeshStandardMaterial({ color: 0xf5b301, emissive: 0xc77a00, emissiveIntensity: 0.4, roughness: 0.25 }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xf2e2c4, roughness: 1 }),
  straw: new THREE.MeshStandardMaterial({ color: 0xe8c36a, roughness: 0.9 }),
  moss: new THREE.MeshStandardMaterial({ color: 0x6aa84f, roughness: 1 }),
  cocoa: new THREE.MeshStandardMaterial({ color: 0x8a4f2a, emissive: 0x3a1a08, emissiveIntensity: 0.3, roughness: 0.35 }),
  mug: new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.5 }),
  snow: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8dcf0, emissiveIntensity: 0.25, roughness: 0.95 }),
  flame: new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a00, emissiveIntensity: 1, roughness: 0.5 }),
  flameCore: new THREE.MeshStandardMaterial({ color: 0xffe066, emissive: 0xffc000, emissiveIntensity: 1, roughness: 0.5 }),
  knit: new THREE.MeshStandardMaterial({ color: 0xe8435a, roughness: 1 }),
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
  if (kind === 'pink' || kind === 'purple') {
    // warm brew (pink) or lily nectar (purple) in a round flask
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), mats.glass);
    bulb.position.y = 0.075;
    const fill = new THREE.Mesh(new THREE.SphereGeometry(0.063, 16, 12), kind === 'pink' ? mats.pink : mats.purple);
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
  } else if (kind === 'gold') {
    // golden honey in a squat jar with a cloth lid
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.13, 16), mats.glass);
    body.position.y = 0.065;
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.062, 0.11, 16), mats.honey);
    fill.position.y = 0.058;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.035, 16), mats.cloth);
    lid.position.y = 0.145;
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.077, 0.008, 6, 18), mats.twine);
    tie.rotation.x = Math.PI / 2;
    tie.position.y = 0.13;
    g.add(fill, body, lid, tie);
  } else if (kind === 'cocoa') {
    // hot cocoa in a mug with a marshmallow
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.062, 0.13, 16), mats.mug);
    body.position.y = 0.065;
    const fill = new THREE.Mesh(new THREE.CircleGeometry(0.062, 16), mats.cocoa);
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.12;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.071, 0.068, 0.025, 16), mats.knit);
    band.position.y = 0.06;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 12, Math.PI), mats.mug);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.07, 0.07, 0);
    const mallow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.035), mats.cloth);
    mallow.position.set(-0.015, 0.128, 0.01);
    mallow.rotation.y = 0.5;
    g.add(body, fill, band, handle, mallow);
  } else if (kind === 'berry') {
    // a little cluster of red berries with a leaf
    const bm = new THREE.MeshStandardMaterial({ color: 0xe8435a, emissive: 0x7a1020, emissiveIntensity: 0.25, roughness: 0.35 });
    for (const [x, y, z] of [[-0.05, 0.06, 0], [0.05, 0.06, 0.02], [0, 0.06, -0.06], [0, 0.14, -0.01]]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), bm);
      b.position.set(x, y, z);
      g.add(b);
    }
    const l = new THREE.Mesh(leafGeo, mats.leaf);
    l.position.set(0.02, 0.16, 0);
    l.rotation.z = -0.6;
    g.add(l);
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
 * Swap a prop's simple stand-in for its generated 3D model: the stand-in's meshes are hidden and the model,
 * scaled to `width` across, takes their place. Prop models come centred and standing on y = 0 (tools/models/upright.mjs).
 * Stand-ins stay if the model is missing.
 */
export function dressUp(target: THREE.Object3D, model: THREE.Object3D, width: number, yaw = 0) {
  const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
  model.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const fit = new THREE.Group();
  fit.add(model);
  fit.scale.setScalar(width / Math.max(size.x, size.z));
  fit.rotation.y = yaw; // a model whose front is not along +z like its stand-in's
  for (const c of target.children) c.visible = !!c.userData.fx; // bubbles and bees keep flying round the model
  target.add(fit);
}

/**
 * A station brews one kind of medicine and sets it out on a little tray beside it.
 * Pink: cauldron. Blue: stone spring with a dripping spout. Green: planter of herbs.
 */
export class Station {
  group = new THREE.Group();
  tray: THREE.Group[] = [];
  private slots: THREE.Vector3[] = [];
  private brew = 0;
  /** seconds of doubled brewing left, given by a resident helping out */
  boost = 0;
  private anim: ((t: number) => void)[] = [];
  private t = Math.random() * 5;

  /** the station itself without its tray, so a 3D model can replace it (see dressUp) */
  body = new THREE.Group();

  constructor(public kind: Medicine, public pos: THREE.Vector3, public brewTime: number, shadowTex: THREE.Texture) {
    if (kind === 'pink') this.buildCauldron();
    else if (kind === 'blue') this.buildSpring();
    else if (kind === 'green') this.buildHerbs();
    else if (kind === 'purple') this.buildLily();
    else if (kind === 'gold') this.buildHive();
    else if (kind === 'cocoa') this.buildCocoaFire();
    else this.buildBerryBush();
    this.body.add(...this.group.children);
    this.group.add(this.body);
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

  private buildLily() {
    // a big water lily on a pad in a small pool, nectar glowing in its heart
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.62, 28), new THREE.MeshStandardMaterial({ color: 0x5fb8e6, emissive: 0x1f6fa0, emissiveIntensity: 0.3, roughness: 0.1 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.02;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 26, 1, false, 0.3, Math.PI * 2 - 0.6), mats.leaf);
    pad.position.y = 0.05;
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xd4b2ff, roughness: 0.6 });
    const flower = new THREE.Group();
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 7; i++) {
        const pe = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), petalMat);
        pe.scale.set(0.55, 0.35, 1.3);
        const a = (i / 7) * Math.PI * 2 + ring * 0.45;
        const rr = 0.13 + ring * -0.04;
        pe.position.set(Math.cos(a) * rr, 0.14 + ring * 0.06, Math.sin(a) * rr);
        pe.rotation.y = -a + Math.PI / 2;
        pe.rotation.x = -0.5 - ring * 0.4;
        pe.castShadow = true;
        flower.add(pe);
      }
    }
    const nectar = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), mats.purple);
    nectar.position.y = 0.2;
    flower.add(nectar);
    this.group.add(pool, pad, flower);
    this.bubbles(0.22, 0xe0ccff, 0xa46cff, 0.15);
    this.anim.push((t) => { flower.rotation.y = Math.sin(t * 0.7) * 0.15; pad.rotation.y = Math.sin(t * 0.5) * 0.08; });
  }

  private buildHive() {
    // a straw skep on a tree stump, with a few bees buzzing round it
    const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.45, 0.4, 14), mats.darkWood);
    stump.position.y = 0.2;
    stump.castShadow = true;
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.38, 14), mats.wood);
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.401;
    this.group.add(stump, top);
    const skep = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const rr = 0.32 - i * i * 0.012 - i * 0.02;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.07, 8, 20), mats.straw);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.46 + i * 0.1;
      ring.castShadow = true;
      skep.add(ring);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), mats.straw);
    cap.position.y = 0.92;
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: 0x3a2a14 }));
    door.position.set(0, 0.52, 0.33);
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), mats.honey);
    drip.position.set(0.05, 0.48, 0.32);
    drip.scale.set(1, 1.6, 1);
    skep.add(cap, door, drip);
    this.group.add(skep);
    const beeMat = new THREE.MeshBasicMaterial({ color: 0xffc83d });
    for (let i = 0; i < 3; i++) {
      const bee = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), beeMat);
      bee.scale.set(1.4, 1, 1);
      const ph = i * 2.1;
      bee.userData.fx = true; // stays when a 3D model replaces the hive (see dressUp)
      this.group.add(bee);
      this.anim.push((t) => {
        const a = t * (1.6 + i * 0.4) + ph;
        bee.position.set(Math.cos(a) * (0.45 + i * 0.08), 0.75 + Math.sin(t * 5 + i) * 0.08, Math.sin(a) * (0.45 + i * 0.08));
      });
    }
    this.anim.push((t) => { skep.scale.set(1 + Math.sin(t * 2) * 0.01, 1 - Math.sin(t * 2) * 0.01, 1); });
  }

  private buildCocoaFire() {
    // a little campfire in a ring of stones with a pot of cocoa hanging over it on a tripod
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11), mats.stone);
      st.position.set(Math.cos(a) * 0.42, 0.07, Math.sin(a) * 0.42);
      st.castShadow = true;
      this.group.add(st);
    }
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), mats.darkWood);
      log.rotation.set(Math.PI / 2 - 0.25, (i / 3) * Math.PI, 0);
      log.position.y = 0.1;
      this.group.add(log);
    }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 10), mats.flame);
    flame.position.y = 0.26;
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), mats.flameCore);
    core.position.y = 0.2;
    this.group.add(flame, core);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.25, 6), mats.darkWood);
      leg.position.set(Math.cos(a) * 0.32, 0.58, Math.sin(a) * 0.32);
      leg.lookAt(0, 1.3, 0);
      leg.rotateX(Math.PI / 2);
      this.group.add(leg);
    }
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 12, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), mats.iron);
    pot.position.y = 0.72;
    pot.castShadow = true;
    const surface = new THREE.Mesh(new THREE.CircleGeometry(0.21, 18), mats.cocoa);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.83;
    this.group.add(pot, surface);
    this.bubbles(0.86, 0xffffff, 0xd8c8b8, 0.2);
    this.anim.push((t) => {
      flame.scale.set(1 + Math.sin(t * 13) * 0.08, 1 + Math.sin(t * 9) * 0.15, 1 + Math.cos(t * 11) * 0.08);
      core.scale.y = 1 + Math.sin(t * 15) * 0.2;
    });
  }

  private buildBerryBush() {
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f9e45, roughness: 0.9 });
    const berryMat = new THREE.MeshStandardMaterial({ color: 0xe8435a, emissive: 0x7a1020, emissiveIntensity: 0.25, roughness: 0.35 });
    const bush = new THREE.Group();
    for (const [x, y, z, s] of [[0, 0.42, 0, 0.42], [-0.3, 0.3, 0.1, 0.3], [0.3, 0.32, -0.05, 0.32], [0.05, 0.3, 0.3, 0.28], [-0.05, 0.3, -0.3, 0.28]]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 14, 10), leafMat);
      m.position.set(x, y, z);
      m.castShadow = true;
      bush.add(m);
    }
    for (let i = 0; i < 14; i++) {
      const a = i * 2.39, h = 0.25 + (i % 5) * 0.11;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), berryMat);
      const rr = 0.44 - Math.abs(h - 0.45) * 0.5;
      b.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr);
      bush.add(b);
    }
    this.group.add(bush);
    this.anim.push((t) => { bush.scale.set(1 + Math.sin(t * 1.3) * 0.015, 1 - Math.sin(t * 1.3) * 0.015, 1); });
  }

  private bubbles(y: number, color: number, emissive: number, spread: number) {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 10, 8), new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.4 }));
      const ph = Math.random() * 6, x = (Math.random() - 0.5) * spread, z = (Math.random() - 0.5) * spread;
      b.userData.fx = true; // stays when a 3D model replaces the station (see dressUp)
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
    this.boost = Math.max(0, this.boost - dt);
    this.brew += dt * (this.boost > 0 ? 2.2 : 1);
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

/** a round cushion bed for a resident; `fluff` animates when the keeper plumps it up */
export function bedMesh(): THREE.Group {
  const g = new THREE.Group();
  const outer = new THREE.MeshStandardMaterial({ color: 0xc98fd6, roughness: 0.9 });
  const inner = new THREE.MeshStandardMaterial({ color: 0xf3dcf7, roughness: 1 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 12, 28), outer);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  ring.scale.set(1, 0.85, 0.75);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 26), inner);
  pad.position.y = 0.06;
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pillow.scale.set(1.3, 0.45, 0.8);
  pillow.position.set(0, 0.14, -0.2);
  ring.castShadow = true;
  g.add(ring, pad, pillow);
  return g;
}

/** a lily-pad bed for the pond residents */
export function lilyBedMesh(): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.08, 28, 1, false, 0.25, Math.PI * 2 - 0.5), mats.leaf);
  pad.position.y = 0.05;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 8, 28, Math.PI * 2 - 0.5), mats.leaf);
  rim.rotation.set(Math.PI / 2, 0, 0.25);
  rim.position.y = 0.1;
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pillow.scale.set(1.3, 0.45, 0.8);
  pillow.position.set(0, 0.15, -0.22);
  pad.castShadow = true;
  g.add(pad, rim, pillow);
  return g;
}

/** an arched wooden footbridge over the brook, spanning along z */
export function bridgeMesh(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const t = i / 8 - 0.5;
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.22), i % 2 ? mats.wood : mats.darkWood);
    plank.position.set(0, 0.12 + (0.25 - t * t) * 0.9, t * 2.2);
    plank.rotation.x = -t * 0.8;
    plank.castShadow = true;
    g.add(plank);
  }
  for (const side of [-0.62, 0.62]) {
    for (let i = 0; i < 4; i++) {
      const t = i / 3 - 0.5;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), mats.darkWood);
      post.position.set(side, 0.35 + (0.25 - t * t) * 0.9, t * 2.0);
      g.add(post);
    }
    const rope = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 6, 20, Math.PI * 0.62), mats.twine);
    rope.rotation.set(0, Math.PI / 2, 0);
    rope.position.set(side, -0.35, 0);
    rope.rotation.z = Math.PI * 0.19;
    g.add(rope);
  }
  return g;
}

/** a little lantern on a post that glows: more patients find their way to the pond */
export function lanternMesh(): THREE.Group {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8), mats.darkWood);
  post.position.y = 0.6;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd34d, emissiveIntensity: 1.2 }));
  lamp.position.y = 1.3;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 8), mats.darkWood);
  cap.position.y = 1.48;
  post.castShadow = true;
  g.add(post, lamp, cap);
  return g;
}

/** the shelter house: a cottage built into a giant tree stump, mossy roof, round door at its front (+z) */
export function shelterHouseMesh(): THREE.Group {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: 0x9a6a42, roughness: 0.9 });
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 1.7, 24), bark);
  stump.position.y = 0.85;
  const roof = new THREE.Mesh(new THREE.SphereGeometry(1.45, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.moss);
  roof.scale.y = 0.65;
  roof.position.y = 1.65;
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshStandardMaterial({ color: 0x6b4428, roughness: 0.8 }));
  door.position.set(0, 0.5, 1.39);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0xff7aa0, emissive: 0xff4f80, emissiveIntensity: 0.4 }));
  heart.position.set(0, 1.12, 1.33);
  const glow = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd34d, emissiveIntensity: 0.9 });
  for (const a of [-0.7, 0.7]) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), glow);
    w.position.set(Math.sin(a) * 1.36, 0.95, Math.cos(a) * 1.36);
    w.rotation.y = a;
    g.add(w);
  }
  const shroom = new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.6 });
  for (const [x, z] of [[0.5, 0.6], [-0.6, 0.3], [0.1, -0.7]]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shroom);
    m.position.set(x, 2.05 + (x * x + z * z < 0.5 ? 0.1 : -0.05), z);
    g.add(m);
  }
  stump.castShadow = roof.castShadow = true;
  g.add(stump, roof, door, heart);
  return g;
}

/** a soft round moss bed for the glade residents */
export function mossBedMesh(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 12, 28), mats.moss);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  ring.scale.set(1, 0.85, 0.75);
  ring.castShadow = true;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 26), new THREE.MeshStandardMaterial({ color: 0x9fd77a, roughness: 1 }));
  pad.position.y = 0.06;
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pillow.scale.set(1.3, 0.45, 0.8);
  pillow.position.set(0, 0.14, -0.2);
  g.add(ring, pad, pillow);
  // a few heather sprigs tucked into the rim
  const sprig = new THREE.MeshStandardMaterial({ color: 0xc084e8, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 1.1;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), sprig);
    s.position.set(Math.cos(a) * 0.46, 0.2, Math.sin(a) * 0.36);
    g.add(s);
  }
  return g;
}

/** a knitted blanket nest for the snowy hill residents */
export function snowBedMesh(): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 12, 28), mats.knit);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.11;
  ring.scale.set(1, 0.85, 0.75);
  ring.castShadow = true;
  // a white pompom on the rim, like on a winter hat
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pom.position.set(0.36, 0.24, 0.2);
  g.add(pom);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 26), new THREE.MeshStandardMaterial({ color: 0xf2d39b, roughness: 1 }));
  pad.position.y = 0.06;
  const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }));
  pillow.scale.set(1.3, 0.45, 0.8);
  pillow.position.set(0, 0.14, -0.2);
  g.add(ring, pad, pillow);
  return g;
}

/** a big bonfire: more patients find their way up the snowy hill */
export function bonfireMesh(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14), mats.stone);
    st.position.set(Math.cos(a) * 0.6, 0.09, Math.sin(a) * 0.6);
    g.add(st);
  }
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.95, 8), mats.darkWood);
    const a = (i / 5) * Math.PI * 2;
    log.position.set(Math.cos(a) * 0.18, 0.4, Math.sin(a) * 0.18);
    log.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    log.castShadow = true;
    g.add(log);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 12), mats.flame);
  flame.position.y = 0.5;
  const core = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.5, 10), mats.flameCore);
  core.position.y = 0.38;
  g.add(flame, core);
  g.userData.flame = flame;
  return g;
}

/** a ski-pole arch with a snow cap: the way through the snowdrift, spanning along z */
export function snowGateMesh(): THREE.Group {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xe8435a, roughness: 0.6 });
  for (const z of [-0.9, 0.9]) {
    for (let k = 0; k < 5; k++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), k % 2 ? mats.snow : red);
      seg.position.set(0, 0.15 + k * 0.3, z);
      seg.castShadow = true;
      g.add(seg);
    }
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 2.0), mats.wood);
  bar.position.y = 1.55;
  g.add(bar);
  for (let i = 0; i < 7; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mats.snow);
    f.position.set(0, 1.66, -0.9 + i * 0.3);
    f.scale.set(1, 0.6, 1);
    g.add(f);
  }
  return g;
}

/** a snowdrift of round mounds; returns each mound so the middle ones can be dug away */
export function driftMounds(points: [number, number][]): THREE.Group[] {
  return points.map(([x, z], i) => {
    const b = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mats.snow);
      m.position.set(((k * 7 + i) % 3 - 1) * 0.25, 0.25 + k * 0.12, ((k + i) % 2 - 0.5) * 0.3);
      m.scale.set(1.15, 0.75, 1);
      m.castShadow = true;
      b.add(m);
    }
    b.position.set(x, 0, z);
    return b;
  });
}

/** the snowy hill south-west of the camp: a snow cover, snowy pines round the back of its rim, a few snowmen-mounds */
export function snowScenery(cx: number, cz: number, r: number, away: number): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.CircleGeometry(r + 0.6, 40), new THREE.MeshLambertMaterial({ color: 0xf4f8ff }));
  cover.rotation.x = -Math.PI / 2;
  cover.position.set(cx, 0.005, cz);
  g.add(cover);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();
  // little lumps of snow scattered over the cover
  const N = 40;
  const lumps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xdde8f4, emissiveIntensity: 0.5 }), N);
  for (let i = 0; i < N; i++) {
    const a = i * 2.399, rr = Math.sqrt((i + 0.5) / N) * r;
    lumps.setMatrixAt(i, m4.compose(pos.set(cx + Math.cos(a) * rr, 0.02, cz + Math.sin(a) * rr), q.identity(), scl.set(1 + (i % 3) * 0.5, 0.6, 1 + (i % 2) * 0.5)));
    lumps.setColorAt(i, col.set(i % 4 ? 0xffffff : 0xe2eefc));
  }
  g.add(lumps);
  // snowy pines on the far half of the rim, away from the way in
  const T = 11;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 }), T);
  const tiers = new THREE.InstancedMesh(new THREE.ConeGeometry(0.8, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), T * 3);
  tiers.castShadow = true;
  for (let i = 0; i < T; i++) {
    const a = away - 1.9 + i * 0.38;
    const tx = cx + Math.cos(a) * (r + 1.4), tz = cz + Math.sin(a) * (r + 1.4);
    const s = 0.9 + (i % 3) * 0.15;
    trunks.setMatrixAt(i, m4.compose(pos.set(tx, 0.3 * s, tz), q.identity(), scl.setScalar(s)));
    for (let k = 0; k < 3; k++) {
      const ts = s * (1 - k * 0.25);
      tiers.setMatrixAt(i * 3 + k, m4.compose(pos.set(tx, (0.9 + k * 0.5) * s, tz), q.identity(), scl.setScalar(ts)));
      // dark green tiers with the top one snow-white
      tiers.setColorAt(i * 3 + k, col.set(k === 2 ? 0xf4f8ff : [0x3f7a4a, 0x4a8a55][(i + k) % 2]));
    }
  }
  g.add(trunks, tiers);
  return g;
}

/** a wooden arch with heather on top: the gate in the hedge, spanning along z */
export function gateArchMesh(): THREE.Group {
  const g = new THREE.Group();
  for (const z of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 8), mats.darkWood);
    post.position.set(0, 0.75, z);
    post.castShadow = true;
    g.add(post);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 8, 20, Math.PI), mats.wood);
  arch.rotation.y = Math.PI / 2;
  arch.position.y = 1.5;
  g.add(arch);
  const flower = new THREE.MeshStandardMaterial({ color: 0xc084e8, roughness: 0.8 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), i % 3 ? flower : mats.leaf);
    f.position.set(0, 1.5 + Math.sin(a) * 0.9, Math.cos(a) * 0.9);
    g.add(f);
  }
  return g;
}

/** a glowing mushroom lamp: more patients find their way to the glade */
export function mushroomLampMesh(): THREE.Group {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xfff3d6, roughness: 0.8 }));
  stem.position.y = 0.35;
  stem.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff7a59, emissive: 0xff5a2a, emissiveIntensity: 0.35, roughness: 0.6 }));
  cap.scale.y = 0.7;
  cap.position.y = 0.66;
  cap.castShadow = true;
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xffe066, emissiveIntensity: 1 });
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), dotMat);
    d.position.set(Math.cos(a) * 0.26, 0.86 - (i % 2) * 0.06, Math.sin(a) * 0.26);
    g.add(d);
  }
  g.add(stem, cap);
  return g;
}

/** the heather glade east of the camp: heather patches and round trees around its rim */
export function gladeScenery(cx: number, cz: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const heath = new THREE.Mesh(new THREE.CircleGeometry(r + 0.6, 40), new THREE.MeshLambertMaterial({ color: 0xa9cf7a }));
  heath.rotation.x = -Math.PI / 2;
  heath.position.set(cx, 0.004, cz);
  g.add(heath);
  // instanced, so the whole glade costs a few draw calls on a phone
  const bloom = [0xc084e8, 0xd9a6f2, 0xa66bd6, 0xf0c6ff];
  const N = 160;
  const heather = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), scl = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const a = i * 2.399, rr = Math.sqrt((i + 0.5) / N) * r * 1.05;
    m4.compose(pos.set(cx + Math.cos(a) * rr, 0.06, cz + Math.sin(a) * rr), q.identity(), scl.set(1 + (i % 3) * 0.3, 0.7, 1 + (i % 2) * 0.3));
    heather.setMatrixAt(i, m4);
    heather.setColorAt(i, col.set(bloom[i % bloom.length]));
  }
  g.add(heather);
  const T = 11;
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 }), T);
  const crowns = new THREE.InstancedMesh(new THREE.SphereGeometry(0.7, 14, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), T * 3);
  crowns.castShadow = true;
  const green = [0x4f9e45, 0x5fae4f, 0x6aaf4f];
  for (let i = 0; i < T; i++) {
    const a = -1.9 + i * 0.38; // the back half of the rim, away from the gate
    const tx = cx + Math.cos(a) * (r + 1.4), tz = cz + Math.sin(a) * (r + 1.4);
    const s = 0.9 + (i % 3) * 0.15;
    trunks.setMatrixAt(i, m4.compose(pos.set(tx, 0.6 * s, tz), q.identity(), scl.setScalar(s)));
    for (let k = 0; k < 3; k++) {
      const cs = s * (1 - k * 0.17);
      crowns.setMatrixAt(i * 3 + k, m4.compose(pos.set(tx + (k - 1) * 0.25 * s, (1.5 + k * 0.42) * s, tz + (k % 2) * 0.2 * s), q.identity(), scl.setScalar(cs)));
      crowns.setColorAt(i * 3 + k, col.set(green[(i + k) % 3]));
    }
  }
  g.add(trunks, crowns);
  return g;
}

/** a hedge of round bushes; returns each bush so the middle ones can be cleared for the gate */
export function hedgeBushes(points: [number, number][]): THREE.Group[] {
  const mat = new THREE.MeshLambertMaterial({ color: 0x4f9e45 });
  return points.map(([x, z], i) => {
    const b = new THREE.Group();
    for (let k = 0; k < 3; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), mat);
      m.position.set(((k * 7 + i) % 3 - 1) * 0.25, 0.45 + k * 0.15, ((k + i) % 2 - 0.5) * 0.3);
      m.castShadow = true;
      b.add(m);
    }
    b.position.set(x, 0, z);
    return b;
  });
}

/** the brook along the north of the camp and the pond beyond it, with reeds and lily pads */
export function pondScenery(): THREE.Group {
  const g = new THREE.Group();
  const water = new THREE.MeshStandardMaterial({ color: 0x7cc8f0, emissive: 0x2a7fb8, emissiveIntensity: 0.25, roughness: 0.1, transparent: true, opacity: 0.92 });
  const brook = new THREE.Mesh(new THREE.PlaneGeometry(60, 1.4, 1, 1), water);
  brook.rotation.x = -Math.PI / 2;
  brook.position.set(0, 0.015, -9);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), water);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(0.6, 0.016, -14.6);
  g.add(brook, pond);
  // stones, pads and reeds are instanced: a handful of draw calls instead of ~200
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const stones: THREE.Matrix4[] = [];
  for (let i = 0; i < 60; i++) {
    const x = -24 + i * 0.8 + Math.sin(i * 7.3) * 0.3;
    if (Math.abs(x) < 1) continue;
    for (const z of [-8.25, -9.75]) {
      if ((i * 13 + (z > -9 ? 1 : 0)) % 3 === 0) continue;
      const r = 0.12 + ((i * 5) % 4) * 0.03;
      stones.push(m4.compose(p.set(x, 0.05, z + Math.sin(i * 3.1) * 0.1), q.identity(), s.set(r, r * 0.6, r)).clone());
    }
  }
  const stoneMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: 0xa3abb5, roughness: 0.8 }), stones.length);
  stones.forEach((m, i) => stoneMesh.setMatrixAt(i, m));
  const pads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 14, 1, false, 0.3, Math.PI * 2 - 0.6), mats.leaf, 9);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.1, r = 0.6 + (i % 4) * 0.45;
    pads.setMatrixAt(i, m4.compose(p.set(0.6 + Math.cos(a) * r, 0.03, -14.6 + Math.sin(a) * r), q.setFromEuler(e.set(0, a, 0)), s.set(1, 1, 1)));
  }
  const reeds: [number, number, number, number][] = [];
  for (let i = 0; i < 26; i++) {
    const a = i * 0.9 + 0.3, r = 2.75 + (i % 3) * 0.12;
    const x = 0.6 + Math.cos(a) * r, z = -14.6 + Math.sin(a) * r;
    if (z > -12.4 && Math.abs(x) < 2) continue; // keep the path from the bridge open
    reeds.push([x, z, 0.5 + (i % 4) * 0.12, Math.sin(i) * 0.12]);
  }
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.02, 1, 5), new THREE.MeshStandardMaterial({ color: 0x5f9e45, roughness: 0.9 }), reeds.length);
  const tops = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.9 }), reeds.length);
  reeds.forEach(([x, z, h, tilt], i) => {
    stems.setMatrixAt(i, m4.compose(p.set(x, h / 2, z), q.setFromEuler(e.set(0, 0, tilt)), s.set(1, h, 1)));
    tops.setMatrixAt(i, m4.compose(p.set(x, h, z), q.identity(), s.set(1, 1, 1)));
  });
  g.add(stoneMesh, pads, stems, tops);
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
type Kind = 'spark' | 'flake' | 'bubble' | 'star' | 'dust' | 'smoke' | 'spore' | 'feather' | 'confetti' | 'pebble' | 'heart' | 'zzz' | 'leaf' | 'note';

export class Fx {
  private list: Particle[] = [];
  private geo: Record<Kind, THREE.BufferGeometry> = {
    spark: new THREE.OctahedronGeometry(0.05),
    flake: new THREE.OctahedronGeometry(0.045),
    bubble: new THREE.SphereGeometry(0.06, 10, 8),
    star: new THREE.OctahedronGeometry(0.07),
    dust: new THREE.SphereGeometry(0.05, 8, 6),
    smoke: new THREE.SphereGeometry(0.09, 10, 8),
    spore: new THREE.SphereGeometry(0.035, 8, 6),
    feather: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.09); s.quadraticCurveTo(0.05, 0, 0, 0.09); s.quadraticCurveTo(-0.05, 0, 0, -0.09); return new THREE.ShapeGeometry(s, 5); })(),
    confetti: new THREE.BoxGeometry(0.06, 0.06, 0.01),
    pebble: new THREE.DodecahedronGeometry(0.05),
    heart: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.06); s.bezierCurveTo(-0.1, 0.01, -0.04, 0.08, 0, 0.03); s.bezierCurveTo(0.04, 0.08, 0.1, 0.01, 0, -0.06); return new THREE.ShapeGeometry(s, 6); })(),
    zzz: new THREE.TorusGeometry(0.04, 0.012, 6, 12),
    leaf: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.08); s.quadraticCurveTo(0.07, 0, 0, 0.09); s.quadraticCurveTo(-0.07, 0, 0, -0.08); return new THREE.ShapeGeometry(s, 5); })(),
    note: (() => { const s = new THREE.Shape(); s.absellipse(0, 0, 0.045, 0.035, 0, Math.PI * 2, false, -0.4); const st = new THREE.Shape(); st.moveTo(0.03, 0); st.lineTo(0.045, 0); st.lineTo(0.045, 0.14); st.lineTo(0.09, 0.1); st.lineTo(0.09, 0.12); st.lineTo(0.03, 0.16); return new THREE.ShapeGeometry([s, st], 6); })(),
  };
  private mat: Record<Kind, THREE.Material[]> = {
    spark: [new THREE.MeshBasicMaterial({ color: 0xff8a3d }), new THREE.MeshBasicMaterial({ color: 0xffe066 })],
    flake: [new THREE.MeshBasicMaterial({ color: 0xffffff }), new THREE.MeshBasicMaterial({ color: 0xd6ecff })],
    bubble: [new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 })],
    star: [0xffe066, 0xff8fc8, 0xffffff, 0x9ff0b0].map((c) => new THREE.MeshBasicMaterial({ color: c })),
    dust: [new THREE.MeshBasicMaterial({ color: 0xfff6c8 }), new THREE.MeshBasicMaterial({ color: 0xbff0ff })],
    smoke: [new THREE.MeshBasicMaterial({ color: 0x9aa0a8, transparent: true, opacity: 0.7 }), new THREE.MeshBasicMaterial({ color: 0xc2c7cd, transparent: true, opacity: 0.6 })],
    spore: [new THREE.MeshBasicMaterial({ color: 0xe8c84a }), new THREE.MeshBasicMaterial({ color: 0xf5e08a })],
    feather: [new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: 0xf3e6d2, side: THREE.DoubleSide })],
    confetti: [0xff6f91, 0xffd34d, 0x59c25a, 0x4fb4ff, 0xa99bf0].map((c) => new THREE.MeshBasicMaterial({ color: c })),
    pebble: [new THREE.MeshStandardMaterial({ color: 0x9aa3ad }), new THREE.MeshStandardMaterial({ color: 0x7d858e })],
    heart: [new THREE.MeshBasicMaterial({ color: 0xff5f86, side: THREE.DoubleSide })],
    zzz: [new THREE.MeshBasicMaterial({ color: 0x8f9bff })],
    leaf: [0xff9a3d, 0xffcf4d, 0xe8643a, 0x8fcf6a].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })),
    note: [0x6a5acd, 0x8a6cff].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })),
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

// ------------------------------------------------------------ shelter decorations (the coin sink after the last area)
// each sets userData.tick(t) for its idle animation and userData.r for how wide the keeper walks round it

/** a swing on an A-frame with a plush cushion seat, swaying by itself */
export function swingMesh(): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-0.7, 0.7]) for (const z of [-0.35, 0.35]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.75, 8), mats.wood);
    leg.position.set(x, 0.82, z * 0.55);
    leg.rotation.x = z > 0 ? -0.22 : 0.22;
    leg.castShadow = true;
    g.add(leg);
  }
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 8), mats.darkWood);
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 1.66;
  g.add(bar);
  const seat = new THREE.Group();
  seat.position.y = 1.62;
  for (const x of [-0.3, 0.3]) {
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.15, 5), mats.twine);
    rope.position.set(x, -0.58, 0);
    seat.add(rope);
  }
  const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.34), new THREE.MeshStandardMaterial({ color: 0xff9ec4, roughness: 1 }));
  cushion.position.y = -1.18;
  cushion.castShadow = true;
  seat.add(cushion);
  g.add(seat);
  g.userData.tick = (t: number) => { seat.rotation.x = Math.sin(t * 1.6) * 0.45; };
  g.userData.r = 0.75;
  return g;
}

/** a round stone fountain with a frog in the middle spitting an arc of water */
export function fountainMesh(): THREE.Group {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.14, 10, 28), mats.stone);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.22;
  rim.castShadow = true;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.86, 0.2, 28), mats.stone);
  base.position.y = 0.1;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.7, 28), new THREE.MeshStandardMaterial({ color: 0x6cc8ff, emissive: 0x2a8ad0, emissiveIntensity: 0.3, roughness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.24;
  const frogMat = new THREE.MeshStandardMaterial({ color: 0x6fd36a, roughness: 0.7 });
  const frog = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), frogMat);
  body.scale.set(1, 0.8, 1);
  body.position.y = 0.42;
  frog.add(body);
  for (const x of [-0.1, 0.1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), frogMat);
    eye.position.set(x, 0.6, 0.06);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.ironDark);
    pupil.position.set(x, 0.62, 0.12);
    frog.add(eye, pupil);
  }
  g.add(base, rim, water, frog);
  // droplets along a parabola out of the frog's mouth, falling back into the pool
  const drops: THREE.Mesh[] = [];
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x6cc8ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), dropMat);
    drops.push(d);
    g.add(d);
  }
  g.userData.tick = (t: number) => {
    frog.rotation.y = t * 0.4;
    const dir = frog.rotation.y;
    drops.forEach((d, i) => {
      const p = (t * 0.9 + i / drops.length) % 1;
      const h = p * 0.62;
      d.position.set(Math.sin(dir) * h, 0.5 + p * 1.4 - p * p * 1.5, Math.cos(dir) * h);
    });
  };
  g.userData.r = 0.9;
  return g;
}

/** a little merry-go-round with three mushroom seats under a striped top */
export function carouselMesh(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.0, 0.16, 28), mats.wood);
  base.position.y = 0.08;
  base.castShadow = true;
  g.add(base);
  const spin = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0xffd34d, roughness: 0.4, metalness: 0.3 }));
  pole.position.y = 0.9;
  spin.add(pole);
  const cols = [0xff6fa0, 0x6fc3ff, 0xffd34d, 0x8be07a];
  for (let i = 0; i < 8; i++) {
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.45, 3, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.8, side: THREE.DoubleSide }));
    wedge.position.y = 1.78;
    spin.add(wedge);
  }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mats.honey);
  ball.position.y = 2.06;
  spin.add(ball);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const seat = new THREE.Group();
    seat.position.set(Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.35, 10), mats.cloth);
    stem.position.y = 0.33;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.7 }));
    cap.position.y = 0.48;
    cap.castShadow = true;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 6), pole.material);
    bar.position.y = 1.05;
    seat.add(stem, cap, bar);
    spin.add(seat);
  }
  g.add(spin);
  g.userData.tick = (t: number) => {
    spin.rotation.y = t * 0.8;
    spin.children.forEach((c, i) => { if (i >= 10) c.position.y = 0.06 + Math.sin(t * 2.4 + i * 2) * 0.06; });
  };
  g.userData.r = 1.05;
  return g;
}

/** the pedestal for the keeper's golden statue; the keeper model itself is put on top by the game */
export function pedestalMesh(): THREE.Group {
  const g = new THREE.Group();
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 0.18, 24), mats.stone);
  step.position.y = 0.09;
  const block = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.5, 24), mats.stone);
  block.position.y = 0.43;
  block.castShadow = true;
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.03), mats.honey);
  plaque.position.set(0, 0.44, 0.48);
  g.add(step, block, plaque);
  g.userData.r = 0.65;
  return g;
}

export const gold = new THREE.MeshStandardMaterial({ color: 0xffcf4a, emissive: 0x7a4a00, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.7 });
