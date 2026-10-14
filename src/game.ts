import * as THREE from 'three';
import type { Creature } from './creature';
import type { Sfx } from './sfx';
import { type Ailment, type Medicine, type SpotIcon, CURE, bubbleCanvas, drawAilment, drawCoin, drawSpotIcon } from './icons';
import { Fx, Station, backpackMesh, coinGeo, coinMat, medicineMesh, signpostMesh } from './props';

/**
 * The shelter loop:
 *  stations brew medicine → the keeper picks it up (it piles in his arms)
 *  → sick creatures arrive, each needing the medicine that matches its ailment
 *  → the keeper (or a helper) brings it, they are cured and drop coins
 *  → coins pay for the next build spot in a long progression.
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

const TINT: Record<Ailment, number> = { sparks: 0xffd9cc, snow: 0xcfe0ff, bubbles: 0xdcffd8 };
/** coins dropped per cure (each coin is worth 2): harder ailments pay a bit more */
const REWARD: Record<Ailment, number> = { snow: 5, sparks: 6, bubbles: 7 };
const AILMENT_OF: Record<Medicine, Ailment> = { pink: 'snow', blue: 'sparks', green: 'bubbles' };
const PICK_R = 1.4;
const GIVE_R = 1.45;
const SAVE_KEY = 'fable-shelter-save-v1';

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
  /** a helper already on its way with the cure */
  claimed: boolean;
}

interface Coin { m: THREE.Mesh; v: THREE.Vector3; t: number; magnet: boolean }

/** one step of the progression */
interface SpotDef {
  icon: SpotIcon;
  price: number;
  at: [number, number];
  /** apply the purchase; `instant` when restoring a save (no fanfare) */
  apply: (g: Game, instant: boolean) => void;
}

const SPOTS: SpotDef[] = [
  { icon: 'cauldron', price: 50, at: [-4.6, 1.4], apply: (g, i) => { g.addStation('pink', -4.6, 1.4, i); g.maxPatients = 2; } },
  { icon: 'backpack', price: 80, at: [0, 4.8], apply: (g, i) => g.giveBackpack(i) },
  { icon: 'spring', price: 120, at: [2.9, 3.0], apply: (g, i) => g.addStation('blue', 2.9, 3.0, i) },
  { icon: 'herbs', price: 180, at: [4.6, 1.4], apply: (g, i) => { g.addStation('green', 4.6, 1.4, i); g.maxPatients = 3; } },
  { icon: 'shoes', price: 220, at: [-1.8, 5.5], apply: (g, i) => g.giveShoes(i) },
  { icon: 'sign', price: 280, at: [-6.0, 3.6], apply: (g, i) => g.addSign(-6.0, 3.6, i) },
  { icon: 'helper', price: 400, at: [1.8, 5.5], apply: (g, i) => void g.addHelper(i) },
];

interface ActiveSpot {
  def: SpotDef;
  index: number;
  pos: THREE.Vector3;
  paid: number;
  mesh: THREE.Mesh;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  payT: number;
  payAcc: number;
}

interface Helper {
  c: Creature;
  state: 'idle' | 'toStation' | 'toPatient';
  station: Station | null;
  patient: Patient | null;
  item: THREE.Group | null;
  home: THREE.Vector3;
}

export class Game {
  coins = 0;
  carry: THREE.Group[] = [];
  capacity = 4;
  maxPatients = 1;
  speed = 1;
  stations: Station[] = [];
  patients: Patient[] = [];
  /** called once when the player first picks up medicine (to hide the touch hint) */
  onFirstPickup?: () => void;
  private bought = 0;
  /** true when a saved game was restored */
  restored = false;
  private fx: Fx;
  private flights: Flight[] = [];
  private ground: Coin[] = [];
  private spots: ActiveSpot[] = [];
  private slots: THREE.Object3D[] = [];
  private props: THREE.Object3D[] = [];
  private helpers: Helper[] = [];
  private pickT = 0;
  private spawnT = 1.5;
  private spawning = false;
  private hud!: HTMLDivElement;
  private hudNum!: HTMLSpanElement;
  private guide: THREE.Group;
  private shoes = false;
  private dustT = 0;
  /** tutorial: 0 take medicine, 1 cure a patient, 2 build, 3 done */
  private step = 0;
  private t = 0;
  private saveT = 0;
  private tmp = new THREE.Vector3();

  constructor(private d: GameDeps) {
    this.fx = new Fx(d.scene);
    // the keeper holds what he carries in front of his chest, piling up like in an arcade shop
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Object3D();
      s.position.set(0, 0.5 + i * 0.3, 0.4);
      d.keeper.attach(s);
      this.slots.push(s);
    }
    this.buildHud();
    this.guide = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 4), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffa000, emissiveIntensity: 0.5, roughness: 0.4 }));
    cone.rotation.x = Math.PI;
    cone.rotation.y = Math.PI / 4;
    this.guide.add(cone);
    d.scene.add(this.guide);

    this.addStation('pink', -2.9, 3.0, true);
    this.load();
    this.refreshSpots();
    window.addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
  }

  // ------------------------------------------------------------ save / load

  private load() {
    let data: { coins?: number; bought?: number } | null = null;
    try {
      if (new URLSearchParams(location.search).has('reset')) localStorage.removeItem(SAVE_KEY);
      data = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    } catch { /* storage blocked: start fresh */ }
    if (!data) return;
    const n = Math.min(SPOTS.length, Math.max(0, data.bought ?? 0));
    for (let i = 0; i < n; i++) SPOTS[i].apply(this, true);
    this.bought = n;
    this.setCoins(Math.max(0, data.coins ?? 0), false);
    this.restored = true;
    if (n > 0) this.step = 3;
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ coins: this.coins, bought: this.bought }));
    } catch { /* ignore */ }
  }

  // ------------------------------------------------------------ hud

  private buildHud() {
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
  }

  /** debug/testing: grant coins */
  addCoins(n: number) {
    this.setCoins(this.coins + n);
  }

  private setCoins(n: number, bump = true) {
    this.coins = n;
    this.hudNum.textContent = String(n);
    if (!bump) return;
    this.hud.classList.add('bump');
    clearTimeout((this.hud as unknown as { _t: number })._t);
    (this.hud as unknown as { _t: number })._t = window.setTimeout(() => this.hud.classList.remove('bump'), 120);
  }

  /** extra circles the keeper should not walk through */
  circles(): [number, number, number][] {
    const out: [number, number, number][] = [];
    for (const s of this.stations) out.push([s.pos.x, s.pos.z, 0.55], [s.pos.x + 0.82, s.pos.z + 0.05, 0.3]);
    for (const p of this.patients) out.push([p.c.root.position.x, p.c.root.position.z, 0.42]);
    for (const o of this.props) out.push([o.position.x, o.position.z, 0.25]);
    return out;
  }

  // ------------------------------------------------------------ things the progression adds

  addStation(kind: Medicine, x: number, z: number, instant: boolean) {
    const s = new Station(kind, new THREE.Vector3(x, 0, z), kind === 'pink' ? 2.6 : kind === 'blue' ? 3.0 : 3.4, this.d.shadowTex);
    this.d.scene.add(s.group);
    this.stations.push(s);
    if (!instant) this.popIn(s.group);
  }

  addSign(x: number, z: number, instant: boolean) {
    const g = signpostMesh();
    g.position.set(x, 0, z);
    g.rotation.y = 0.5;
    this.d.scene.add(g);
    this.props.push(g);
    this.maxPatients = 4;
    if (!instant) this.popIn(g);
  }

  /** carry upgrade: a backpack appears on the keeper and he can hold twice as much */
  giveBackpack(instant: boolean) {
    const b = backpackMesh();
    b.position.set(0, 0.62, -0.3);
    this.d.keeper.attach(b);
    this.capacity = 8;
    if (!instant) this.toKeeper();
  }

  /** speed upgrade: swift shoes, with a sparkle trail while walking */
  giveShoes(instant: boolean) {
    this.shoes = true;
    this.speed = 1.35;
    if (!instant) this.toKeeper();
  }

  /** a cured kraken stays on as a volunteer and carries medicine around by itself */
  async addHelper(instant: boolean) {
    const home = new THREE.Vector3(1.8, 0, 5.5);
    const c = await this.d.spawnCreature('kraken', 0.95);
    c.root.position.copy(home);
    this.d.scene.add(c.root);
    const slot = new THREE.Object3D();
    slot.position.set(0, 0.95, 0.15);
    c.attach(slot);
    c.root.userData.slot = slot;
    this.helpers.push({ c, state: 'idle', station: null, patient: null, item: null, home });
    if (!instant) {
      this.fx.emit('star', home.clone().setY(0.8), 30, { speed: 3, up: 2, life: 1 });
      this.d.sfx.build();
      c.hop();
    }
  }

  private toKeeper() {
    const k = this.d.keeper.root.position;
    this.fx.emit('star', k.clone().setY(1.0), 34, { speed: 3, up: 2.5, life: 1.1 });
    this.d.keeper.hop();
    this.d.sfx.build();
  }

  private popIn(o: THREE.Object3D) {
    o.scale.setScalar(0.01);
    o.userData.pop = this.t;
    this.fx.emit('star', o.position.clone().setY(0.6), 30, { speed: 3, up: 2, life: 1 });
    this.d.sfx.build();
  }

  // ------------------------------------------------------------ build spots

  /** the next two purchases are on offer at any time */
  private refreshSpots() {
    for (let i = this.bought; i < Math.min(SPOTS.length, this.bought + 2); i++) {
      if (this.spots.some((s) => s.index === i)) continue;
      const def = SPOTS[i];
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(def.at[0], 0.02, def.at[1]);
      this.d.scene.add(mesh);
      const s: ActiveSpot = { def, index: i, pos: new THREE.Vector3(def.at[0], 0, def.at[1]), paid: 0, mesh, canvas, tex, payT: 0, payAcc: 0 };
      this.drawSpot(s);
      this.spots.push(s);
    }
  }

  private drawSpot(s: ActiveSpot) {
    const g = s.canvas.getContext('2d')!;
    const price = s.def.price;
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
    const k = s.paid / price;
    if (k > 0) {
      g.beginPath();
      g.arc(128, 128, 104, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      g.lineWidth = 12;
      g.strokeStyle = '#ffd34d';
      g.stroke();
    }
    drawSpotIcon(g, s.def.icon, 128, 96, 46);
    drawCoin(g, 88, 180, 20);
    g.font = '800 46px system-ui, sans-serif';
    g.fillStyle = '#ffffff';
    g.strokeStyle = 'rgba(60,80,60,0.6)';
    g.lineWidth = 6;
    g.textBaseline = 'middle';
    const txt = String(price - s.paid);
    g.strokeText(txt, 116, 182);
    g.fillText(txt, 116, 182);
    s.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------ helpers for moving things

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

  /** put every landed item into the slot matching its place in the pile */
  private restack() {
    this.carry.forEach((v, i) => {
      if (!v.userData.landed) return;
      this.slots[i].add(v);
      v.position.set(0, 0, 0);
    });
  }

  // ------------------------------------------------------------ patients

  private unlockedAilments(): Ailment[] {
    const kinds = new Set(this.stations.map((s) => s.kind));
    return (['pink', 'blue', 'green'] as Medicine[]).filter((m) => kinds.has(m)).map((m) => AILMENT_OF[m]);
  }

  private async spawnPatient() {
    this.spawning = true;
    const [name, h] = this.d.patientKinds[Math.floor(Math.random() * this.d.patientKinds.length)];
    const open = this.unlockedAilments();
    // the newest ailment shows up a bit more often so a fresh station gets used
    const ailment = Math.random() < 0.4 ? open[open.length - 1] : open[Math.floor(Math.random() * open.length)];
    let seat = new THREE.Vector3();
    let theta = 0;
    for (let tries = 0; tries < 30; tries++) {
      theta = (Math.random() - 0.5) * 3.4;
      const r = 5.6 + Math.random() * 2.4;
      seat = new THREE.Vector3(Math.sin(theta) * r, 0, Math.cos(theta) * r);
      const clear =
        this.stations.every((c) => c.pos.distanceTo(seat) > 1.9) &&
        this.spots.every((s) => s.pos.distanceTo(seat) > 1.6) &&
        this.props.every((o) => o.position.distanceTo(seat) > 1.4) &&
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
    bubble.scale.set(0.78, 0.76, 1);
    bubble.renderOrder = 10;
    this.d.scene.add(bubble);
    const edge = document.createElement('div');
    edge.className = 'edge';
    edge.innerHTML = '<svg class="ar" viewBox="0 0 64 64"><path d="M60 32 L44 20 L44 44 Z" fill="#ff7a59" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';
    const ic = document.createElement('canvas');
    ic.width = ic.height = 80;
    drawAilment(ic.getContext('2d')!, ailment, 40, 40, 28);
    edge.appendChild(ic);
    document.body.appendChild(edge);
    this.patients.push({ c, ailment, state: 'arriving', seat, exit, fxT: 1, stateT: 0, bubble, edge, claimed: false });
    this.spawning = false;
  }

  private sickFx(p: Patient, dt: number) {
    p.fxT -= dt;
    const head = this.tmp.copy(p.c.root.position).setY(p.c.height * 0.75);
    if (p.ailment === 'snow') {
      if (Math.random() < dt * 5) {
        const at = head.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, p.c.height * 0.5, (Math.random() - 0.5) * 0.8));
        this.fx.emit('flake', at, 1, { speed: 0.15, g: 0.35, life: 2.4 });
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

  /** send a medicine item flying from wherever it is to the patient, and cure on arrival */
  private deliver(v: THREE.Group, p: Patient) {
    p.state = 'incoming';
    p.c.walk = 0;
    this.fly(v, () => p.c.root.position.clone().setY(p.c.height * 0.8), 0.38, 0.9, () => {
      this.d.scene.remove(v);
      this.cure(p);
    });
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
    for (let i = 0; i < REWARD[p.ailment]; i++) {
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
    const keeper = this.d.keeper;
    const k = keeper.root.position;
    this.fx.update(dt);
    for (const s of this.stations) s.update(dt);
    for (const o of this.d.scene.children) {
      if (o.userData.pop === undefined) continue;
      const e = Math.min(1, (this.t - o.userData.pop) / 0.5);
      o.scale.setScalar(Math.max(0.01, (1 - Math.pow(1 - e, 3)) * (1 + 0.3 * Math.sin(e * Math.PI))));
      if (e >= 1) { o.scale.setScalar(1); delete o.userData.pop; }
    }

    // swift shoes leave a little sparkle trail
    if (this.shoes && keeper.walk > 0.3) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.07;
        this.fx.emit('dust', k.clone().setY(0.08), 1, { speed: 0.4, up: 0.5, g: 0.5, life: 0.5, size: 0.8 });
      }
    }

    // pick up medicine from any station in reach, one at a time
    this.pickT -= dt;
    if (this.pickT <= 0 && this.carry.length < this.capacity) {
      for (const s of this.stations) {
        if (!s.tray.length || s.pos.distanceTo(k) > PICK_R) continue;
        const v = s.tray.pop()!;
        v.userData.landed = false;
        this.carry.push(v);
        const n = this.carry.length;
        this.fly(v, () => this.slots[Math.max(0, this.carry.indexOf(v))].getWorldPosition(new THREE.Vector3()), 0.28, 0.6, () => {
          v.userData.landed = true;
          v.rotation.set(0, 0, 0);
          v.scale.setScalar(1.8);
          this.restack();
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
      this.spawnT = 3.5;
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
      // the keeper hands over the matching medicine when he comes close (also while the patient walks in);
      // only items already resting in his arms can go, never one still flying in
      if ((p.state === 'waiting' || p.state === 'arriving') && pos.distanceTo(k) < GIVE_R) {
        const need = CURE[p.ailment];
        let idx = -1;
        for (let j = this.carry.length - 1; j >= 0; j--) if (this.carry[j].userData.landed && this.carry[j].userData.kind === need) { idx = j; break; }
        if (idx >= 0) {
          const [v] = this.carry.splice(idx, 1);
          this.restack();
          this.deliver(v, p);
        }
      }
      if (p.state === 'arriving' || p.state === 'waiting' || p.state === 'incoming') {
        this.sickFx(p, dt);
        p.bubble.position.set(pos.x, p.c.height + 0.55 + Math.sin(this.t * 3 + i) * 0.05, pos.z);
        this.placeEdge(p);
      }
      if (p.state === 'cured') {
        if (p.stateT > 0.9 && p.stateT - dt <= 0.9) p.c.hop();
        if (p.stateT > 2) p.state = 'leaving';
      }
    }

    this.updateHelpers(dt);

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
      // spots must be bought in order: the second one on offer waits for the first
      const next = s.index === this.bought;
      // pour at a rate that empties any price in about 1.5 s, independent of frame rate
      if (on && next && this.coins > 0 && s.paid < s.def.price) s.payAcc += dt * Math.max(12, s.def.price / 1.5);
      else s.payAcc = 0;
      const chunk = Math.min(this.coins, s.def.price - s.paid, Math.floor(s.payAcc));
      if (chunk > 0) {
        s.payAcc -= chunk;
        this.setCoins(this.coins - chunk);
        s.paid += chunk;
        const m = new THREE.Mesh(coinGeo, coinMat);
        m.position.copy(k).setY(1);
        if (s.payT <= 0) {
          // one flying coin and one clink every few hundredths of a second, not one per coin
          s.payT = 0.06;
          this.fly(m, () => s.pos.clone().setY(0.1), 0.25, 0.5, () => this.d.scene.remove(m));
          this.d.sfx.pay();
        }
        this.drawSpot(s);
        if (s.paid >= s.def.price) {
          this.d.scene.remove(s.mesh);
          this.spots.splice(i, 1);
          this.bought++;
          s.def.apply(this, false);
          this.refreshSpots();
          this.save();
          if (this.step === 2) this.step = 3;
        }
      }
      (s.mesh.material as THREE.MeshBasicMaterial).opacity *= next ? 1 : 0.45;
    }

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
    this.saveT += dt;
    if (this.saveT > 5) {
      this.saveT = 0;
      this.save();
    }
  }

  /** volunteer helpers: pick a patient nobody is serving, fetch the right medicine, bring it */
  private updateHelpers(dt: number) {
    for (const h of this.helpers) {
      h.c.update(dt);
      const pos = h.c.root.position;
      const goTo = (x: number, z: number, speed: number) => {
        const dx = x - pos.x, dz = z - pos.z, dd = Math.hypot(dx, dz);
        if (dd < 0.05) { h.c.walk = 0; return true; }
        pos.x += (dx / dd) * Math.min(dd, speed * dt);
        pos.z += (dz / dd) * Math.min(dd, speed * dt);
        h.c.walk += (Math.min(1, dd / 0.5) - h.c.walk) * Math.min(1, dt * 8);
        h.c.lookAt(x, z);
        return false;
      };
      if (h.state === 'idle' && h.item) {
        // still holding medicine from an errand someone else finished: find another patient who needs it
        const kind = h.item.userData.kind as Medicine;
        const p = this.patients.find((p) => (p.state === 'waiting' || p.state === 'arriving') && !p.claimed && CURE[p.ailment] === kind);
        if (p) { p.claimed = true; h.patient = p; h.state = 'toPatient'; }
        else goTo(h.home.x, h.home.z, 1.4);
      } else if (h.state === 'idle') {
        const p = this.patients.find((p) => (p.state === 'waiting' || p.state === 'arriving') && !p.claimed && this.stations.some((s) => s.kind === CURE[p.ailment] && s.tray.length));
        if (p) {
          const need = CURE[p.ailment];
          const st = this.stations.filter((s) => s.kind === need && s.tray.length).sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0];
          p.claimed = true;
          h.patient = p;
          h.station = st;
          h.state = 'toStation';
        } else goTo(h.home.x, h.home.z, 1.4);
      } else if (h.state === 'toStation' && h.station) {
        const st = h.station;
        const p = h.patient!;
        if (p.state === 'cured' || p.state === 'leaving' || p.state === 'incoming') { p.claimed = false; h.state = 'idle'; continue; }
        if (goTo(st.pos.x - 0.1, st.pos.z + 0.75, 2.0) || pos.distanceTo(st.pos) < 1.0) {
          if (!st.tray.length) { p.claimed = false; h.state = 'idle'; continue; }
          const v = st.tray.pop()!;
          const slot = h.c.root.userData.slot as THREE.Object3D;
          this.fly(v, () => slot.getWorldPosition(new THREE.Vector3()), 0.25, 0.5, () => {
            slot.add(v);
            v.position.set(0, 0, 0);
            v.rotation.set(0, 0, 0);
            v.scale.setScalar(1.8);
          });
          h.item = v;
          h.state = 'toPatient';
        }
      } else if (h.state === 'toPatient' && h.patient && h.item) {
        const p = h.patient;
        if (p.state === 'cured' || p.state === 'leaving' || p.state === 'incoming') {
          // someone was quicker; keep the medicine for the next patient who needs it
          h.patient = null;
          h.state = 'idle';
          continue;
        }
        const pp = p.c.root.position;
        if (goTo(pp.x, pp.z, 2.0) || pos.distanceTo(pp) < 1.1) {
          const v = h.item;
          h.item = null;
          h.state = 'idle';
          h.c.walk = 0;
          this.deliver(v, p);
        }
      }
    }
  }

  private updateGuide() {
    let target: THREE.Vector3 | null = null;
    if (this.step === 0) {
      target = this.stations[0].pos.clone().setY(1.5);
    } else if (this.step === 1) {
      const p = this.patients.find((p) => p.state === 'waiting' || p.state === 'arriving');
      if (p && this.carry.length) target = p.c.root.position.clone().setY(p.c.height + 1.3);
      else if (!this.carry.length) target = this.stations[0].pos.clone().setY(1.5);
    } else if (this.step === 2) {
      const s = this.spots.find((s) => s.index === this.bought);
      if (!this.ground.length && s && this.coins >= s.def.price) target = s.pos.clone().setY(1);
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
