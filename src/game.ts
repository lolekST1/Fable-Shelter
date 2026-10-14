import * as THREE from 'three';
import type { Creature } from './creature';
import type { Sfx } from './sfx';
import { type Ailment, bubbleCanvas, drawAilment, drawCauldron, drawCoin, drawStack } from './icons';

/**
 * The first gameplay loop:
 *  cauldrons brew potions → the keeper picks them up (they stack on his back)
 *  → sick creatures arrive on the meadow → the keeper walks up and a potion flies to them
 *  → they are cured and drop coins → coins pay for new things on glowing build spots.
 * Everything is told with icons, numbers and motion; no words.
 */

export interface GameDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keeper: Creature;
  sfx: Sfx;
  shadowTex: THREE.Texture;
  /** creature names that can come in as patients, with their heights */
  patientKinds: [string, number][];
  spawnCreature: (name: string, height: number) => Promise<Creature>;
}

const AILMENTS: Ailment[] = ['sparks', 'snow', 'bubbles'];
const TINT: Record<Ailment, number> = { sparks: 0xffd9cc, snow: 0xcfe0ff, bubbles: 0xdcffd8 };
const PICK_R = 1.4; // how close the keeper must be to a cauldron to take potions
const GIVE_R = 1.45; // ... and to a patient to hand one over
const TRAY_MAX = 6;

// ---------------------------------------------------------------- props

function vialMesh(): THREE.Group {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transmission: 0, transparent: true, opacity: 0.55, clearcoat: 1 });
  const liquid = new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff2f7e, emissiveIntensity: 0.35, roughness: 0.3 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), glass);
  bulb.position.y = 0.075;
  const fill = new THREE.Mesh(new THREE.SphereGeometry(0.063, 16, 12), liquid);
  fill.position.y = 0.072;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.08, 12), glass);
  neck.position.y = 0.17;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0xb07a4a, roughness: 0.9 }));
  cork.position.y = 0.225;
  g.add(fill, bulb, neck, cork);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  g.scale.setScalar(1.25);
  return g;
}

const coinGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20);
coinGeo.rotateX(Math.PI / 2);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.7, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.25 });

class Cauldron {
  group = new THREE.Group();
  tray: THREE.Group[] = [];
  private slots: THREE.Vector3[] = [];
  private brew = 0;
  private bubbles: THREE.Mesh[] = [];
  private t = Math.random() * 5;
  constructor(public pos: THREE.Vector3, public brewTime: number, shadowTex: THREE.Texture) {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 0.62;
      pts.push(new THREE.Vector2(Math.sin(a + 0.35) * 0.52, -Math.cos(a + 0.35) * 0.42 + 0.48));
    }
    pts.push(new THREE.Vector2(0.5, 0.74), new THREE.Vector2(0.56, 0.78), new THREE.Vector2(0.56, 0.84), new THREE.Vector2(0.46, 0.84));
    const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshStandardMaterial({ color: 0x4b4560, roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide }));
    pot.castShadow = true;
    const brewMat = new THREE.MeshStandardMaterial({ color: 0xff4f9e, emissive: 0xff2f7e, emissiveIntensity: 0.6, roughness: 0.4 });
    const surface = new THREE.Mesh(new THREE.CircleGeometry(0.47, 24), brewMat);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 0.76;
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffb8d9, emissive: 0xff7fbf, emissiveIntensity: 0.4 }));
      b.userData.p = Math.random() * 6;
      b.userData.x = (Math.random() - 0.5) * 0.5;
      b.userData.z = (Math.random() - 0.5) * 0.5;
      this.bubbles.push(b);
      this.group.add(b);
    }
    const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3550, roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), legMat);
      leg.position.set(Math.cos(a) * 0.32, 0.05, Math.sin(a) * 0.32);
      this.group.add(leg);
    }
    // little wooden tray beside it where the finished potions wait
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.46), new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.85 }));
    board.position.set(0.82, 0.18, 0.05);
    board.castShadow = true;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0xa87c52 }));
    stand.position.set(0.82, 0.07, 0.05);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) this.slots.push(new THREE.Vector3(0.64 + i * 0.18, 0.22, -0.07 + j * 0.24));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.45 }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.set(0.35, 0.012, 0);
    this.group.add(pot, surface, board, stand, sh);
    this.group.position.copy(pos);
  }
  /** returns true when a new potion appeared on the tray */
  update(dt: number): boolean {
    this.t += dt;
    for (const b of this.bubbles) {
      const p = ((this.t * 0.8 + b.userData.p) % 1.6) / 1.6;
      b.position.set(b.userData.x, 0.74 + p * 0.25, b.userData.z);
      b.scale.setScalar(p < 0.85 ? 0.6 + p * 0.6 : (1 - p) * 7);
    }
    for (const v of this.tray) if (v.scale.x < 1.25) v.scale.setScalar(Math.min(1.25, v.scale.x + dt * 6));
    if (this.tray.length >= TRAY_MAX) return false;
    this.brew += dt;
    if (this.brew < this.brewTime) return false;
    this.brew = 0;
    const v = vialMesh();
    v.position.copy(this.slots[this.tray.length]);
    v.scale.setScalar(0.01);
    this.group.add(v);
    this.tray.push(v);
    return true;
  }
}

// ---------------------------------------------------------------- particles

interface Particle { m: THREE.Mesh; v: THREE.Vector3; life: number; max: number; g: number; spin: number; s: number }

class Fx {
  private list: Particle[] = [];
  private geo = {
    spark: new THREE.OctahedronGeometry(0.05),
    flake: new THREE.OctahedronGeometry(0.045),
    bubble: new THREE.SphereGeometry(0.06, 10, 8),
    star: new THREE.OctahedronGeometry(0.07),
  };
  private mat = {
    spark: [new THREE.MeshBasicMaterial({ color: 0xff8a3d }), new THREE.MeshBasicMaterial({ color: 0xffe066 })],
    flake: [new THREE.MeshBasicMaterial({ color: 0xffffff }), new THREE.MeshBasicMaterial({ color: 0xd6ecff })],
    bubble: [new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 })],
    star: [0xffe066, 0xff8fc8, 0xffffff, 0x9ff0b0].map((c) => new THREE.MeshBasicMaterial({ color: c })),
  };
  constructor(private scene: THREE.Scene) {}
  emit(kind: keyof Fx['geo'], at: THREE.Vector3, n: number, opts: { speed?: number; up?: number; dir?: THREE.Vector3; spread?: number; g?: number; life?: number; size?: number }) {
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

// ---------------------------------------------------------------- moving things

interface Flight { obj: THREE.Object3D; from: THREE.Vector3; to: () => THREE.Vector3; t: number; dur: number; arc: number; done: () => void }

interface Patient {
  c: Creature;
  ailment: Ailment;
  state: 'arriving' | 'waiting' | 'incoming' | 'cured' | 'leaving';
  seat: THREE.Vector3;
  exit: THREE.Vector3;
  fxT: number;
  stateT: number;
  bubble: THREE.Sprite;
  edge: HTMLDivElement;
}

interface Coin { m: THREE.Mesh; v: THREE.Vector3; t: number; magnet: boolean }

interface BuildSpot {
  pos: THREE.Vector3;
  price: number;
  paid: number;
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  icon: 'cauldron' | 'stack';
  payT: number;
  build: () => void;
}

export class Game {
  coins = 0;
  carry: THREE.Group[] = [];
  capacity = 4;
  maxPatients = 1;
  cauldrons: Cauldron[] = [];
  patients: Patient[] = [];
  private fx: Fx;
  private flights: Flight[] = [];
  private ground: Coin[] = [];
  private spots: BuildSpot[] = [];
  private slots: THREE.Object3D[] = [];
  private pickT = 0;
  private spawnT = 1.5;
  private spawning = false;
  private hud: HTMLDivElement;
  private hudNum: HTMLSpanElement;
  private guide: THREE.Group;
  /** called once when the player first picks up potions (to hide the touch hint) */
  onFirstPickup?: () => void;
  /** tutorial: 0 take potions, 1 cure a patient, 2 build, 3 done */
  private step = 0;
  private t = 0;
  private tmp = new THREE.Vector3();

  constructor(private d: GameDeps) {
    this.fx = new Fx(d.scene);
    this.addCauldron(new THREE.Vector3(-2.9, 0, 3.0), 2.6);
    this.addSpot(new THREE.Vector3(2.9, 0, 3.0), 20, 'cauldron', () => {
      this.addCauldron(new THREE.Vector3(2.9, 0, 3.0), 2.6, true);
      this.maxPatients = 2;
      this.addSpot(new THREE.Vector3(-4.6, 0, 0.6), 40, 'stack', () => {
        this.capacity = 8;
        this.spawnCrate(new THREE.Vector3(-4.6, 0, 0.6));
      });
    });
    // empty attachment points on the keeper's back where carried potions sit
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Object3D();
      // held in front of the chest, piling up like in an arcade shop
      s.position.set(0, 0.5 + i * 0.3, 0.4);
      d.keeper.attach(s);
      this.slots.push(s);
    }
    // coin counter
    const css = document.createElement('style');
    css.textContent = `
      #coins { position: fixed; left: calc(14px + env(safe-area-inset-left)); top: calc(14px + env(safe-area-inset-top)); display: flex; align-items: center; gap: 8px;
        padding: 6px 16px 6px 6px; border-radius: 30px; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2);
        font: 800 24px system-ui, sans-serif; color: #5b4a1a; pointer-events: none; transition: transform .12s; }
      #coins.bump { transform: scale(1.15); }
      #coins canvas { width: 34px; height: 34px; }
      .edge { position: fixed; width: 64px; height: 64px; margin: -32px 0 0 -32px; pointer-events: none; display: none; }
      .edge .ar { position: absolute; inset: 0; transform-origin: 50% 50%; }
      .edge canvas { position: absolute; left: 12px; top: 12px; width: 40px; height: 40px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(40,70,60,.3); }
      .edge.on { display: block; animation: edgepulse 1s ease-in-out infinite; }
      @keyframes edgepulse { 50% { transform: scale(1.12); } }`;
    document.head.appendChild(css);
    this.hud = document.createElement('div');
    this.hud.id = 'coins';
    const cc = document.createElement('canvas');
    cc.width = cc.height = 68;
    drawCoin(cc.getContext('2d')!, 34, 34, 30);
    this.hudNum = document.createElement('span');
    this.hudNum.textContent = '0';
    this.hud.append(cc, this.hudNum);
    document.body.appendChild(this.hud);
    // bouncing guide arrow for the first steps
    this.guide = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa000, emissiveIntensity: 0.5, roughness: 0.4 }));
    cone.rotation.x = Math.PI;
    cone.rotation.y = Math.PI / 4;
    this.guide.add(cone);
    d.scene.add(this.guide);
  }

  /** extra circles the keeper should not walk through */
  circles(): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (const c of this.cauldrons) {
      out.push([c.pos.x, c.pos.z, 0.55], [c.pos.x + 0.82, c.pos.z + 0.05, 0.3]);
    }
    for (const p of this.patients) out.push([p.c.root.position.x, p.c.root.position.z, 0.42]);
    return out;
  }

  // ------------------------------------------------------------ building blocks

  private addCauldron(pos: THREE.Vector3, brew: number, pop = false) {
    const c = new Cauldron(pos, brew, this.d.shadowTex);
    this.d.scene.add(c.group);
    this.cauldrons.push(c);
    if (pop) this.popIn(c.group);
  }

  private spawnCrate(pos: THREE.Vector3) {
    // a backpack rack: wooden crate with spare potions, the keeper now carries more
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0xc89a6a, roughness: 0.85 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), wood);
    box.position.y = 0.25;
    box.castShadow = true;
    g.add(box);
    for (let i = 0; i < 4; i++) {
      const v = vialMesh();
      v.position.set(-0.27 + i * 0.18, 0.5, 0);
      g.add(v);
    }
    g.position.copy(pos);
    this.d.scene.add(g);
    this.popIn(g);
  }

  private popIn(o: THREE.Object3D) {
    o.scale.setScalar(0.01);
    o.userData.pop = this.t;
    this.fx.emit('star', o.position.clone().setY(0.6), 30, { speed: 3, up: 2, life: 1 });
    this.d.sfx.build();
  }

  private addSpot(pos: THREE.Vector3, price: number, icon: BuildSpot['icon'], build: () => void) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(pos).setY(0.02);
    this.d.scene.add(mesh);
    const s: BuildSpot = { pos, price, paid: 0, mesh, canvas, tex, icon, payT: 0, build };
    this.drawSpot(s);
    this.spots.push(s);
  }

  private drawSpot(s: BuildSpot) {
    const g = s.canvas.getContext('2d')!;
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,0.32)';
    g.beginPath();
    g.arc(128, 128, 118, 0, Math.PI * 2);
    g.fill();
    g.setLineDash([22, 14]);
    g.lineWidth = 9;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.stroke();
    g.setLineDash([]);
    // progress ring
    const k = s.paid / s.price;
    if (k > 0) {
      g.beginPath();
      g.arc(128, 128, 104, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      g.lineWidth = 12;
      g.strokeStyle = '#ffd34d';
      g.stroke();
    }
    if (s.icon === 'cauldron') drawCauldron(g, 128, 98, 46);
    else drawStack(g, 128, 92, 50);
    drawCoin(g, 92, 178, 20);
    g.font = '800 46px system-ui, sans-serif';
    g.fillStyle = '#ffffff';
    g.strokeStyle = 'rgba(60,80,60,0.6)';
    g.lineWidth = 6;
    g.textBaseline = 'middle';
    const txt = String(s.price - s.paid);
    g.strokeText(txt, 120, 180);
    g.fillText(txt, 120, 180);
    s.tex.needsUpdate = true;
  }

  private fly(obj: THREE.Object3D, to: () => THREE.Vector3, dur: number, arc: number, done: () => void) {
    const from = obj.getWorldPosition(new THREE.Vector3());
    const q = obj.getWorldQuaternion(new THREE.Quaternion());
    const sc = obj.getWorldScale(new THREE.Vector3());
    this.d.scene.add(obj);
    obj.position.copy(from);
    obj.quaternion.copy(q);
    obj.scale.copy(sc);
    this.flights.push({ obj, from, to, t: 0, dur, arc, done });
  }

  private setCoins(n: number) {
    this.coins = n;
    this.hudNum.textContent = String(n);
    this.hud.classList.add('bump');
    clearTimeout((this.hud as unknown as { _t: number })._t);
    (this.hud as unknown as { _t: number })._t = window.setTimeout(() => this.hud.classList.remove('bump'), 120);
  }

  // ------------------------------------------------------------ patients

  private async spawnPatient() {
    this.spawning = true;
    const [name, h] = this.d.patientKinds[Math.floor(Math.random() * this.d.patientKinds.length)];
    const ailment = AILMENTS[Math.floor(Math.random() * AILMENTS.length)];
    // come in from the edge of the meadow, settle down somewhere in front of the pen
    let seat = new THREE.Vector3();
    let theta = 0;
    for (let tries = 0; tries < 20; tries++) {
      theta = (Math.random() - 0.5) * 3.2;
      const r = 5 + Math.random() * 2.2;
      seat = new THREE.Vector3(Math.sin(theta) * r, 0, Math.cos(theta) * r);
      const clear =
        this.cauldrons.every((c) => c.pos.distanceTo(seat) > 1.8) &&
        this.spots.every((s) => s.pos.distanceTo(seat) > 1.6) &&
        this.patients.every((p) => p.seat.distanceTo(seat) > 1.8) &&
        seat.distanceTo(this.d.keeper.root.position) > 1.5;
      if (clear) break;
    }
    const exit = new THREE.Vector3(Math.sin(theta) * 13, 0, Math.cos(theta) * 13);
    const c = await this.d.spawnCreature(name, h);
    c.root.position.copy(exit);
    c.setTint(TINT[ailment]);
    c.lookAt(seat.x, seat.z);
    this.d.scene.add(c.root);
    const bt = new THREE.CanvasTexture(bubbleCanvas(ailment));
    bt.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, depthTest: false }));
    bubble.scale.set(0.62, 0.71, 1);
    bubble.renderOrder = 10;
    this.d.scene.add(bubble);
    // edge-of-screen pointer for when the patient is out of view
    const edge = document.createElement('div');
    edge.className = 'edge';
    edge.innerHTML = '<svg class="ar" viewBox="0 0 64 64"><path d="M60 32 L44 20 L44 44 Z" fill="#ff7a59" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
    const ic = document.createElement('canvas');
    ic.width = ic.height = 80;
    drawAilment(ic.getContext('2d')!, ailment, 40, 40, 28);
    edge.appendChild(ic);
    document.body.appendChild(edge);
    this.patients.push({ c, ailment, state: 'arriving', seat, exit, fxT: 1, stateT: 0, bubble, edge });
    this.spawning = false;
  }

  private sickFx(p: Patient, dt: number) {
    p.fxT -= dt;
    const head = this.tmp.copy(p.c.root.position).setY(p.c.height * 0.75);
    if (p.ailment === 'snow') {
      if (Math.random() < dt * 5) {
        const at = head.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, p.c.height * 0.5, (Math.random() - 0.5) * 0.8));
        this.fx.emit('flake', at, 1, { speed: 0.15, g: 0.35, life: 2.4, size: 1 });
      }
      if (p.fxT <= 0) {
        p.fxT = 2.6 + Math.random();
        p.c.twitch(0.5);
        if (this.onScreen(p)) this.d.sfx.shiver();
      }
    } else if (p.fxT <= 0) {
      if (p.ailment === 'sparks') {
        p.fxT = 2.2 + Math.random() * 1.2;
        p.c.twitch(1.3);
        const dir = new THREE.Vector3().subVectors(this.d.camera.position, p.c.root.position).setY(0).normalize();
        this.fx.emit('spark', head.clone().addScaledVector(dir, 0.3), 16, { speed: 2.4, dir, spread: 0.35, up: 1, g: 3, life: 0.7 });
        if (this.onScreen(p)) this.d.sfx.sneeze();
      } else {
        p.fxT = 1.7 + Math.random();
        p.c.twitch(0.9);
        this.fx.emit('bubble', head.clone().setY(p.c.height * 0.6), 3, { speed: 0.4, up: 0.8, g: -0.3, life: 1.8, size: 1.2 });
        if (this.onScreen(p)) this.d.sfx.hiccup();
      }
    }
  }

  private onScreen(p: Patient) {
    const v = this.tmp.copy(p.c.root.position).setY(p.c.height * 0.6).project(this.d.camera);
    return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
  }

  private cure(p: Patient) {
    p.state = 'cured';
    p.stateT = 0;
    p.c.setTint(null);
    this.d.scene.remove(p.bubble);
    p.edge.remove();
    p.c.hop();
    this.d.sfx.heal();
    const at = p.c.root.position.clone().setY(p.c.height * 0.7);
    this.fx.emit('star', at, 26, { speed: 2.6, up: 2.2, life: 1.1 });
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.castShadow = true;
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * (0.5 + Math.random() * 0.6), 3.5 + Math.random() * 1.5, Math.sin(a) * (0.5 + Math.random() * 0.6));
      this.d.scene.add(m);
      this.ground.push({ m, v, t: 0, magnet: false });
    }
    if (this.step === 1) this.step = 2;
  }

  // ------------------------------------------------------------ frame

  update(dt: number) {
    this.t += dt;
    const k = this.d.keeper.root.position;
    this.fx.update(dt);

    // brewing
    for (const c of this.cauldrons) c.update(dt);
    for (const o of this.d.scene.children) {
      if (o.userData.pop !== undefined) {
        const e = Math.min(1, (this.t - o.userData.pop) / 0.5);
        // grow in with a little overshoot
        o.scale.setScalar(Math.max(0.01, (1 - Math.pow(1 - e, 3)) * (1 + 0.3 * Math.sin(e * Math.PI))));
        if (e >= 1) { o.scale.setScalar(1); delete o.userData.pop; }
      }
    }

    // pick up potions from a nearby cauldron, one at a time
    this.pickT -= dt;
    if (this.pickT <= 0 && this.carry.length < this.capacity) {
      for (const c of this.cauldrons) {
        if (!c.tray.length || c.pos.distanceTo(k) > PICK_R) continue;
        const v = c.tray.pop()!;
        const slot = this.slots[this.carry.length];
        this.carry.push(v);
        const n = this.carry.length;
        v.userData.landed = false;
        this.fly(v, () => slot.getWorldPosition(new THREE.Vector3()), 0.28, 0.6, () => {
          v.userData.landed = true;
          slot.add(v);
          v.position.set(0, 0, 0);
          v.rotation.set(0, 0, 0);
          v.scale.setScalar(1.8);
        });
        this.d.sfx.pop(n);
        this.pickT = 0.13;
        if (this.step === 0) {
          this.step = 1;
          this.onFirstPickup?.();
        }
        break;
      }
    }

    // patients
    this.spawnT -= dt;
    const active = this.patients.filter((p) => p.state !== 'cured' && p.state !== 'leaving').length;
    if (!this.spawning && active < this.maxPatients && this.spawnT <= 0) {
      this.spawnT = 4;
      void this.spawnPatient();
    }
    for (let i = this.patients.length - 1; i >= 0; i--) {
      const p = this.patients[i];
      const pos = p.c.root.position;
      p.stateT += dt;
      p.c.update(dt);
      if (p.state === 'arriving' || p.state === 'leaving') {
        const target = p.state === 'arriving' ? p.seat : p.exit;
        const dx = target.x - pos.x, dz = target.z - pos.z, dd = Math.hypot(dx, dz);
        const sp = p.state === 'arriving' ? 1.7 : 2.2;
        if (dd < 0.05) {
          p.c.walk = 0;
          if (p.state === 'leaving') {
            this.d.scene.remove(p.c.root);
            this.patients.splice(i, 1);
            continue;
          }
          p.state = 'waiting';
        } else {
          pos.x += (dx / dd) * Math.min(dd, sp * dt);
          pos.z += (dz / dd) * Math.min(dd, sp * dt);
          p.c.walk += (Math.min(1, dd / 0.5) - p.c.walk) * Math.min(1, dt * 8);
          p.c.lookAt(target.x, target.z);
        }
      }
      if (p.state === 'waiting' && pos.distanceTo(k) < 4) p.c.lookAt(k.x, k.z);
      // hand over a potion when the keeper comes close, even while the patient is still walking in;
      // only potions already resting in the keeper's arms can go (one still flying in would be sent twice)
      const top = this.carry[this.carry.length - 1];
      if ((p.state === 'waiting' || p.state === 'arriving') && top?.userData.landed && pos.distanceTo(k) < GIVE_R) {
        {
          const v = this.carry.pop()!;
          p.state = 'incoming';
          p.c.walk = 0;
          this.fly(v, () => p.c.root.position.clone().setY(p.c.height * 0.8), 0.38, 0.9, () => {
            this.d.scene.remove(v);
            this.cure(p);
          });
        }
      }
      if (p.state === 'arriving' || p.state === 'waiting' || p.state === 'incoming') {
        this.sickFx(p, dt);
        p.bubble.position.set(pos.x, p.c.height + 0.5 + Math.sin(this.t * 3 + i) * 0.05, pos.z);
        this.placeEdge(p);
      }
      if (p.state === 'cured') {
        if (p.stateT > 0.9 && p.stateT - dt <= 0.9) p.c.hop();
        if (p.stateT > 2) p.state = 'leaving';
      }
    }

    // coins: pop out, bounce, then get pulled to the keeper when he is close
    for (let i = this.ground.length - 1; i >= 0; i--) {
      const c = this.ground[i];
      c.t += dt;
      if (!c.magnet) {
        c.v.y -= 12 * dt;
        c.m.position.addScaledVector(c.v, dt);
        if (c.m.position.y < 0.1) {
          c.m.position.y = 0.1;
          c.v.y = Math.abs(c.v.y) * 0.35;
          c.v.x *= 0.6;
          c.v.z *= 0.6;
        }
        c.m.rotation.y += dt * 4;
        if (c.t > 0.6 && Math.hypot(c.m.position.x - k.x, c.m.position.z - k.z) < 2.2) c.magnet = true;
      } else {
        const target = k.clone().setY(0.9);
        c.m.position.lerp(target, Math.min(1, dt * 12));
        if (c.m.position.distanceTo(target) < 0.2) {
          this.d.scene.remove(c.m);
          this.ground.splice(i, 1);
          this.setCoins(this.coins + 2);
          this.d.sfx.coin(this.coins);
        }
      }
    }

    // build spots: stand on one to pour coins into it
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i];
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(this.t * 3) * 0.2;
      const on = Math.hypot(k.x - s.pos.x, k.z - s.pos.z) < 0.9;
      s.payT -= dt;
      if (on && this.coins > 0 && s.paid < s.price && s.payT <= 0) {
        s.payT = 0.05;
        this.setCoins(this.coins - 1);
        s.paid++;
        const m = new THREE.Mesh(coinGeo, coinMat);
        m.position.copy(k).setY(1);
        this.fly(m, () => s.pos.clone().setY(0.1), 0.25, 0.5, () => this.d.scene.remove(m));
        this.d.sfx.pay();
        this.drawSpot(s);
        if (s.paid >= s.price) {
          this.d.scene.remove(s.mesh);
          this.spots.splice(i, 1);
          s.build();
          if (this.step === 2) this.step = 3;
        }
      }
    }

    // flights (potions, coins) along little arcs
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += dt / f.dur;
      const e = Math.min(1, f.t);
      const to = f.to();
      f.obj.position.lerpVectors(f.from, to, e);
      f.obj.position.y += Math.sin(e * Math.PI) * f.arc;
      if (e >= 1) {
        this.flights.splice(i, 1);
        f.done();
      }
    }

    this.updateGuide();
  }

  private updateGuide() {
    let target: THREE.Vector3 | null = null;
    if (this.step === 0) {
      const c = this.cauldrons.find((c) => c.tray.length) ?? this.cauldrons[0];
      target = c.pos.clone().setY(1.5);
    } else if (this.step === 1) {
      const p = this.patients.find((p) => p.state === 'waiting');
      if (p && this.carry.length) target = p.c.root.position.clone().setY(p.c.height + 1.15);
      else if (!this.carry.length) target = this.cauldrons[0].pos.clone().setY(1.5);
    } else if (this.step === 2) {
      if (this.ground.length) target = null;
      else if (this.spots.length && this.coins >= this.spots[0].price) target = this.spots[0].pos.clone().setY(1);
    }
    this.guide.visible = !!target;
    if (target) {
      this.guide.position.set(target.x, target.y + Math.abs(Math.sin(this.t * 4)) * 0.25, target.z);
      this.guide.rotation.y += 0.03;
    }
  }

  /** pin an arrow to the screen edge pointing at a patient that is out of view */
  private placeEdge(p: Patient) {
    const v = this.tmp.copy(p.c.root.position).setY(p.c.height * 0.6).project(this.d.camera);
    const behind = v.z > 1;
    if (!behind && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.88) {
      p.edge.classList.remove('on');
      return;
    }
    let dx = v.x, dy = -v.y;
    if (behind) { dx = -dx; dy = -dy; }
    const W = window.innerWidth / 2, H = window.innerHeight / 2, m = 44;
    const sx = dx * W, sy = dy * H;
    const t = Math.min((W - m) / Math.max(1e-3, Math.abs(sx)), (H - m) / Math.max(1e-3, Math.abs(sy)));
    p.edge.style.left = `${W + sx * t}px`;
    p.edge.style.top = `${H + sy * t}px`;
    (p.edge.firstChild as SVGElement).style.transform = `rotate(${Math.atan2(sy, sx)}rad)`;
    p.edge.classList.add('on');
  }
}

