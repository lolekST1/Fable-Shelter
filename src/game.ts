import * as THREE from 'three';
import type { Creature } from './creature';
import type { Sfx } from './sfx';
import { type Ailment, type Medicine, type SpotIcon, bubbleCanvas, drawAilment, drawBerry, drawCoin, drawHeart, drawMoon, drawSpotIcon, needCanvas } from './icons';
import { Fx, Station, backpackMesh, basketMesh, bedMesh, bridgeMesh, coinGeo, coinMat, lanternMesh, lilyBedMesh, pondScenery, signpostMesh } from './props';

/**
 * Fable Shelter loop:
 *  sick creatures arrive, each species with its own silly ailment and a matching cure
 *  → stations around the camp brew the cures, the keeper carries them over
 *  → cured creatures move into the shelter while there is a free bed
 *  → residents get hungry (berries) and sleepy (plump up their bed); each fulfilled need is a heart
 *  → four hearts and they are adopted, leaving a big reward
 *  → coins pay for the next build spot in a long progression.
 * Everything is told with icons, numbers and motion; no words.
 */

export interface GameDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  keeper: Creature;
  sfx: Sfx;
  shadowTex: THREE.Texture;
  spawnCreature: (name: string, height: number) => Promise<Creature>;
}

/** how a resident helps around the camp once it feels at home (has at least one heart):
 *  boost a station (it brews twice as fast for a while) or carry things for the keeper */
type Skill = { boost: Medicine } | { carry: 'cure' | 'berry' };
interface Species {
  height: number; ailment: Ailment; cure: Medicine; tint: number; coins: number; skill: Skill;
  /** where it lives: the camp meadow or the pond beyond the brook */
  zone?: 'camp' | 'pond';
  /** stand-in model (and colour) until its own model is made */
  model?: string; base?: number;
}

/** every species has its own ailment; the three medicines each cure a few of them */
export const SPECIES: Record<string, Species> = {
  chmurnik: { height: 1.05, ailment: 'snow', cure: 'pink', tint: 0xcfe0ff, coins: 5, skill: { boost: 'berry' } },
  feniks: { height: 1.0, ailment: 'smoke', cure: 'pink', tint: 0xd8d8d8, coins: 5, skill: { boost: 'pink' } },
  smok: { height: 1.25, ailment: 'sparks', cure: 'blue', tint: 0xffd9cc, coins: 6, skill: { boost: 'pink' } },
  gryf: { height: 1.25, ailment: 'feathers', cure: 'green', tint: 0xf0e6d8, coins: 7, skill: { carry: 'cure' } },
  grzybolak: { height: 1.15, ailment: 'spores', cure: 'blue', tint: 0xfff0b0, coins: 6, skill: { boost: 'green' } },
  kraken: { height: 1.05, ailment: 'bubbles', cure: 'green', tint: 0xdcffd8, coins: 7, skill: { carry: 'cure' } },
  jednorozec: { height: 1.15, ailment: 'confetti', cure: 'pink', tint: 0xffe0f0, coins: 6, skill: { boost: 'blue' } },
  // pond creatures (stand-in models, recoloured, until their own are generated)
  zabiksiaze: { height: 1.0, ailment: 'crown', cure: 'purple', tint: 0xfff0a0, coins: 9, skill: { carry: 'berry' }, zone: 'pond', model: 'bazyliszek', base: 0xb6ff8a },
  nessie: { height: 1.2, ailment: 'fountain', cure: 'purple', tint: 0xc8f0ff, coins: 9, skill: { boost: 'purple' }, zone: 'pond', model: 'smok', base: 0x9fe8e0 },
  swietlik: { height: 1.0, ailment: 'flicker', cure: 'purple', tint: 0x9a90b0, coins: 10, skill: { carry: 'cure' }, zone: 'pond', model: 'feniks', base: 0xe6d6ff },
  wodnik: { height: 1.1, ailment: 'drip', cure: 'blue', tint: 0xc8dcff, coins: 10, skill: { boost: 'blue' }, zone: 'pond', model: 'grzybolak', base: 0xa8d4ff },
  bazyliszek: { height: 1.0, ailment: 'stone', cure: 'green', tint: 0xbfc4c8, coins: 8, skill: { carry: 'berry' } },
};

const PICK_R = 1.4;
const GIVE_R = 1.45;
const MAX_HEARTS = 4;
const ADOPT_COINS = 15; // coins dropped on adoption (each worth 2)
const SAVE_KEY = 'fable-shelter-save-v3';
const POND_C = new THREE.Vector3(0.6, 0, -14.6);

/** bed places inside the pen, in the order they are added */

/** lily-pad beds around the pond */
const POND_BEDS: [number, number][] = [[3.9, -12.4], [4.3, -15.8], [-2.7, -16.8]];

const BEDS: [number, number][] = [[-1.1, -2.1], [1.1, -2.1], [-2.4, -0.9], [2.4, -0.9], [-1.15, -0.35], [1.15, -0.35]];

interface Flight { obj: THREE.Object3D; from: THREE.Vector3; to: () => THREE.Vector3; t: number; dur: number; arc: number; done: () => void }

interface Patient {
  name: string;
  c: Creature;
  sp: Species;
  state: 'arriving' | 'waiting' | 'incoming' | 'cured' | 'leaving';
  seat: THREE.Vector3;
  exit: THREE.Vector3;
  fxT: number;
  stateT: number;
  bubble: THREE.Sprite;
  edge: HTMLDivElement;
  claimed: boolean;
}

interface Bed { pos: THREE.Vector3; mesh: THREE.Group; ring: THREE.Mesh; owner: Resident | null; fluff: number; pond: boolean }

interface Resident {
  name: string;
  c: Creature;
  bed: Bed;
  hearts: number;
  need: 'food' | 'sleep' | null;
  needT: number;
  state: 'toBed' | 'idle' | 'eating' | 'toSleep' | 'sleeping' | 'leaving' | 'helpGo' | 'helpWork' | 'helpBring' | 'helpBack';
  /** waypoints still to walk */
  path: THREE.Vector3[];
  helpT: number;
  /** what it is doing while helping */
  job: { station: Station; patient?: Patient; resident?: Resident; item?: THREE.Group } | null;
  stateT: number;
  target: THREE.Vector3;
  wanderT: number;
  canvas: HTMLCanvasElement;
  tex: THREE.CanvasTexture;
  bubble: THREE.Sprite;
  edge: HTMLDivElement;
  edgeIcon: HTMLCanvasElement;
  fedIncoming: boolean;
}

interface Coin { m: THREE.Mesh; v: THREE.Vector3; t: number; magnet: boolean }

interface SpotDef {
  icon: SpotIcon;
  price: number;
  /** adoptions needed before it can be paid */
  hearts?: number;
  at: [number, number];
  /** apply the purchase; `instant` when restoring a save (no fanfare) */
  apply: (g: Game, instant: boolean) => void;
}

const SPOTS: SpotDef[] = [
  { icon: 'bed', price: 30, at: BEDS[2], apply: (g, i) => g.addBed(i) },
  { icon: 'spring', price: 70, at: [5.8, 3.2], apply: (g, i) => { g.addStation('blue', 5.8, 3.2, i); g.maxPatients = 2; g.unlock('smok'); } },
  { icon: 'bed', price: 110, at: BEDS[3], apply: (g, i) => { g.addBed(i); g.unlock('feniks'); } },
  { icon: 'backpack', price: 150, at: [1.7, 4.4], apply: (g, i) => g.giveBackpack(i) },
  { icon: 'herbs', price: 200, at: [0, 8.2], apply: (g, i) => { g.addStation('green', 0, 8.2, i); g.maxPatients = 3; g.unlock('gryf'); } },
  { icon: 'bed', price: 240, at: BEDS[4], apply: (g, i) => { g.addBed(i); g.unlock('grzybolak'); } },
  { icon: 'shoes', price: 280, at: [-1.7, 5.6], apply: (g, i) => { g.giveShoes(i); g.unlock('kraken'); } },
  { icon: 'sign', price: 330, at: [-4.2, 7.2], apply: (g, i) => { g.addSign(-4.2, 7.2, i); g.unlock('jednorozec'); } },
  { icon: 'bed', price: 380, at: BEDS[5], apply: (g, i) => { g.addBed(i); g.unlock('bazyliszek'); } },
  // the pond beyond the brook
  { icon: 'bridge', price: 450, hearts: 3, at: [0, -7.4], apply: (g, i) => g.openPond(i) },
  { icon: 'lilybed', price: 500, at: POND_BEDS[1], apply: (g, i) => { g.addBed(i, true); g.unlock('nessie'); } },
  { icon: 'lantern', price: 600, hearts: 6, at: [-0.4, -18.4], apply: (g, i) => { g.addLantern(-0.4, -18.4, i); g.unlock('swietlik'); } },
  { icon: 'lilybed', price: 700, at: POND_BEDS[2], apply: (g, i) => { g.addBed(i, true); g.unlock('wodnik'); } },
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

const EDGE_SVG = '<svg class="ar" viewBox="0 0 64 64"><path d="M60 32 L44 20 L44 44 Z" fill="#ff7a59" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>';

export class Game {
  coins = 0;
  /** adoptions so far: the reputation that opens new areas */
  hearts = 0;
  pondOpen = false;
  carry: THREE.Group[] = [];
  capacity = 4;
  maxPatients = 1;
  speed = 1;
  stations: Station[] = [];
  patients: Patient[] = [];
  residents: Resident[] = [];
  beds: Bed[] = [];
  /** species that can show up as patients */
  species: string[] = ['chmurnik'];
  /** called once when the player first picks up something (to hide the touch hint) */
  onFirstPickup?: () => void;
  /** true when a saved game was restored */
  restored = false;
  private bought = 0;
  private fx: Fx;
  private flights: Flight[] = [];
  private ground: Coin[] = [];
  private spots: ActiveSpot[] = [];
  private slots: THREE.Object3D[] = [];
  private props: THREE.Object3D[] = [];
  private basket: THREE.Group;
  private dropT = 0;
  private helpers: Helper[] = [];
  private pickT = 0;
  private spawnT = 1.5;
  private spawning = false;
  private hud!: HTMLDivElement;
  private hudNum!: HTMLSpanElement;
  private heartHud!: HTMLDivElement;
  private heartNum!: HTMLSpanElement;
  private guide: THREE.Group;
  private guideEdge: HTMLDivElement;
  private shoes = false;
  private dustT = 0;
  /** tutorial: 0 take medicine, 1 cure, 2 care for a resident, 3 build, 4 done */
  private step = 0;
  private t = 0;
  private saveT = 0;
  private strayT = 1;
  private tmp = new THREE.Vector3();

  constructor(private d: GameDeps) {
    this.fx = new Fx(d.scene);
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
    // the guide gets a screen-edge arrow too: at the start the cauldron is off screen
    const gi = document.createElement('canvas');
    gi.width = gi.height = 80;
    const gg = gi.getContext('2d')!;
    gg.fillStyle = '#ffc21a';
    gg.beginPath();
    gg.moveTo(18, 26);
    gg.lineTo(62, 26);
    gg.lineTo(40, 60);
    gg.fill();
    this.guideEdge = this.makeEdge(gi);

    // the starting camp: one cauldron to the west, a berry bush by the pen, two beds, and a basket
    // well away from the medicine sources for emptying your arms
    this.addStation('pink', -5.8, 3.2, true);
    this.addStation('berry', -3.3, 4.6, true);
    this.addBed(true);
    this.addBed(true);
    d.scene.add(pondScenery());
    this.basket = basketMesh();
    this.basket.position.set(2.4, 0, 6.3);
    d.scene.add(this.basket);

    this.load();
    this.refreshSpots();
    window.addEventListener('pagehide', () => this.save());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
  }

  // ------------------------------------------------------------ save / load

  private load() {
    let data: { coins?: number; bought?: number; hearts?: number; residents?: { name: string; hearts: number }[] } | null = null;
    try {
      if (new URLSearchParams(location.search).has('reset')) localStorage.removeItem(SAVE_KEY);
      data = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    } catch { /* storage blocked: start fresh */ }
    if (!data) return;
    const n = Math.min(SPOTS.length, Math.max(0, data.bought ?? 0));
    for (let i = 0; i < n; i++) SPOTS[i].apply(this, true);
    this.bought = n;
    this.setCoins(Math.max(0, data.coins ?? 0), false);
    this.setHearts(Math.max(0, data.hearts ?? 0));
    for (const r of data.residents ?? []) if (SPECIES[r.name]) void this.spawnResident(r.name, r.hearts);
    this.restored = true;
    if (n > 0) this.step = 4;
  }

  private save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        coins: this.coins,
        bought: this.bought,
        hearts: this.hearts,
        residents: this.residents.filter((r) => r.state !== 'leaving').map((r) => ({ name: r.name, hearts: r.hearts })),
      }));
    } catch { /* ignore */ }
  }

  // ------------------------------------------------------------ hud

  private buildHud() {
    const css = document.createElement('style');
    css.textContent = `
      #coins { position: fixed; left: calc(14px + env(safe-area-inset-left)); top: calc(14px + env(safe-area-inset-top)); display: flex; align-items: center; gap: 8px;
        padding: 6px 16px 6px 6px; border-radius: 30px; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2);
        font: 800 24px system-ui, sans-serif; color: #5b4a1a; pointer-events: none; transition: transform .12s; }
      #coins.bump, #hearts.bump { transform: scale(1.15); }
      #hearts { position: fixed; left: calc(14px + env(safe-area-inset-left)); top: calc(66px + env(safe-area-inset-top)); display: flex; align-items: center; gap: 8px;
        padding: 4px 14px 4px 6px; border-radius: 30px; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2);
        font: 800 20px system-ui, sans-serif; color: #8a2a44; pointer-events: none; transition: transform .12s; }
      #hearts canvas { width: 28px; height: 28px; }
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
    // adoptions counter: hearts open new areas
    this.heartHud = document.createElement('div');
    this.heartHud.id = 'hearts';
    const hc = document.createElement('canvas');
    hc.width = hc.height = 68;
    drawHeart(hc.getContext('2d')!, 34, 36, 18, '#ff5f86');
    this.heartNum = document.createElement('span');
    this.heartNum.textContent = '0';
    this.heartHud.append(hc, this.heartNum);
    document.body.appendChild(this.heartHud);
  }

  /** debug/testing: medicine items that are neither on a tray, in the keeper's arms, nor flying */
  strays(): string[] {
    return this.findStrays().map((g) => {
      const p = g.getWorldPosition(new THREE.Vector3());
      return `${g.userData.kind}@${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} parent=${g.parent?.type}${g.parent === this.d.scene ? '(scene)' : ''}`;
    });
  }

  /** items that belong nowhere: not on a tray, in the keeper's arms, flying, or carried by a helping resident */
  private findStrays(): THREE.Group[] {
    const ok = new Set<THREE.Object3D>([...this.flights.map((f) => f.obj), ...this.stations.flatMap((s) => s.tray), ...this.carry]);
    for (const r of this.residents) if (r.job?.item) ok.add(r.job.item);
    const out: THREE.Group[] = [];
    this.d.scene.traverse((o) => {
      if (o.userData.kind === undefined || !(o as THREE.Group).isGroup || ok.has(o)) return;
      out.push(o as THREE.Group);
    });
    return out;
  }

  private setHearts(n: number) {
    this.hearts = n;
    this.heartNum.textContent = String(n);
    this.heartHud.classList.add('bump');
    window.setTimeout(() => this.heartHud.classList.remove('bump'), 150);
  }

  /** debug/testing: grant adoption hearts */
  addHearts(n: number) {
    this.setHearts(this.hearts + n);
    for (const sp of this.spots) this.drawSpot(sp);
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
    for (const r of this.residents) if (r.state !== 'sleeping' && r.state !== 'toSleep') out.push([r.c.root.position.x, r.c.root.position.z, 0.32]);
    for (const o of this.props) out.push([o.position.x, o.position.z, 0.25]);
    out.push([this.basket.position.x, this.basket.position.z, 0.42]);
    return out;
  }

  /** creatures the player can tap to make them hop */
  tappables(): Creature[] {
    return [...this.patients.map((p) => p.c), ...this.residents.map((r) => r.c), ...this.helpers.map((h) => h.c)];
  }

  // ------------------------------------------------------------ things the progression adds

  unlock(name: string) {
    if (!this.species.includes(name)) this.species.push(name);
  }

  addStation(kind: Medicine, x: number, z: number, instant: boolean) {
    const brew = { pink: 2.6, blue: 3.0, green: 3.4, berry: 2.2, purple: 3.2 }[kind];
    const s = new Station(kind, new THREE.Vector3(x, 0, z), brew, this.d.shadowTex);
    this.d.scene.add(s.group);
    this.stations.push(s);
    if (!instant) this.popIn(s.group);
  }

  addBed(instant: boolean, pond = false) {
    const [x, z] = pond ? POND_BEDS[this.beds.filter((b) => b.pond).length] : BEDS[this.beds.filter((b) => !b.pond).length];
    const mesh = pond ? lilyBedMesh() : bedMesh();
    mesh.position.set(x, 0, z);
    // pulsing ring around a bed that needs plumping up
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.74, 32), new THREE.MeshBasicMaterial({ color: 0x8f9bff, transparent: true, opacity: 0.8, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.03, z);
    ring.visible = false;
    this.d.scene.add(mesh, ring);
    this.beds.push({ pos: new THREE.Vector3(x, 0, z), mesh, ring, owner: null, fluff: 0, pond });
    if (!instant) this.popIn(mesh);
  }

  /** build the footbridge over the brook: the pond area opens with its lily station and a first lily bed */
  openPond(instant: boolean) {
    const br = bridgeMesh();
    br.position.set(0, 0, -9);
    this.d.scene.add(br);
    this.pondOpen = true;
    this.addStation('purple', -3.3, -12.6, instant);
    this.addBed(instant, true);
    this.unlock('zabiksiaze');
    if (!instant) this.popIn(br);
  }

  addLantern(x: number, z: number, instant: boolean) {
    const g = lanternMesh();
    g.position.set(x, 0, z);
    this.d.scene.add(g);
    this.props.push(g);
    this.maxPatients = 5;
    if (!instant) this.popIn(g);
  }

  /** keep the keeper on walkable ground: the meadow, the brook only over the bridge, the pond once open */
  bound(k: THREE.Vector3) {
    const prev = this.lastK;
    // the brook: it can only be crossed on the bridge (checked against the last position, so fast steps can't jump it)
    const north = (z: number) => z < -9;
    const onBridge = this.pondOpen && Math.abs(k.x) < 0.6;
    if (!this.pondOpen) k.z = Math.max(k.z, -8.2);
    else if (north(prev.z) !== north(k.z) && !onBridge) k.z = north(prev.z) ? -9.8 : -8.2;
    else if (!onBridge && k.z < -8.2 && k.z > -9.8) k.z = north(prev.z) ? -9.8 : -8.2;
    // meadow edge, and the pond circle once it is open
    if (k.z > -9) {
      const r = Math.hypot(k.x, k.z);
      if (r > 11) { k.x *= 11 / r; k.z *= 11 / r; }
    } else {
      const dp = Math.hypot(k.x - POND_C.x, k.z - POND_C.z);
      if (dp > 6.4 && !onBridge) { k.x = POND_C.x + (k.x - POND_C.x) * (6.4 / dp); k.z = POND_C.z + (k.z - POND_C.z) * (6.4 / dp); }
    }
    this.lastK.copy(k);
  }
  private lastK = new THREE.Vector3(0, 0, 2.4);

  addSign(x: number, z: number, instant: boolean) {
    const g = signpostMesh();
    g.position.set(x, 0, z);
    g.rotation.y = 0.5;
    this.d.scene.add(g);
    this.props.push(g);
    this.maxPatients = 4;
    if (!instant) this.popIn(g);
  }

  giveBackpack(instant: boolean) {
    const b = backpackMesh();
    b.position.set(0, 0.62, -0.3);
    this.d.keeper.attach(b);
    this.capacity = 8;
    if (!instant) this.toKeeper();
  }

  giveShoes(instant: boolean) {
    this.shoes = true;
    this.speed = 1.35;
    if (!instant) this.toKeeper();
  }

  async addHelper(instant: boolean) {
    const home = new THREE.Vector3(3.7, 0, 6.6);
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
    const need = s.def.hearts ?? 0;
    if (need > this.hearts) {
      // hearts still missing: show how many adoptions it takes
      drawHeart(g, 196, 58, 16, '#ff5f86');
      g.font = '800 30px system-ui, sans-serif';
      g.fillStyle = '#ffffff';
      g.strokeStyle = 'rgba(120,40,60,0.7)';
      g.lineWidth = 5;
      g.textBaseline = 'middle';
      const ht = String(need - this.hearts);
      g.strokeText(ht, 214, 60);
      g.fillText(ht, 214, 60);
    }
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

  private restack() {
    this.carry.forEach((v, i) => {
      if (!v.userData.landed) return;
      this.slots[i].add(v);
      v.position.set(0, 0, 0);
    });
  }

  /** take the topmost item of a kind that is resting in the keeper's arms */
  private takeFromArms(kind: Medicine): THREE.Group | null {
    for (let j = this.carry.length - 1; j >= 0; j--) {
      const v = this.carry[j];
      if (v.userData.landed && v.userData.kind === kind) {
        this.carry.splice(j, 1);
        this.restack();
        return v;
      }
    }
    return null;
  }

  private walk(c: Creature, target: THREE.Vector3, speed: number, dt: number): boolean {
    const pos = c.root.position;
    const dx = target.x - pos.x, dz = target.z - pos.z, dd = Math.hypot(dx, dz);
    if (dd < 0.05) { c.walk = 0; return true; }
    pos.x += (dx / dd) * Math.min(dd, speed * dt);
    pos.z += (dz / dd) * Math.min(dd, speed * dt);
    c.walk += (Math.min(1, dd / 0.5) - c.walk) * Math.min(1, dt * 8);
    c.lookAt(target.x, target.z);
    return false;
  }

  private makeEdge(icon: HTMLCanvasElement) {
    const edge = document.createElement('div');
    edge.className = 'edge';
    edge.innerHTML = EDGE_SVG;
    edge.appendChild(icon);
    document.body.appendChild(edge);
    return edge;
  }

  // ------------------------------------------------------------ patients

  private async spawnPatient() {
    this.spawning = true;
    // usually someone the keeper already carries the cure for, so a full pile is rarely useless;
    // otherwise favour the newest species so a fresh station gets used
    // the pond keeps one patient of its own once it is open
    const pondSick = this.patients.some((p) => p.sp.zone === 'pond' && p.state !== 'cured' && p.state !== 'leaving');
    const pool = this.pondOpen && !pondSick ? this.species.filter((n) => SPECIES[n].zone === 'pond') : this.species.filter((n) => this.pondOpen || SPECIES[n].zone !== 'pond');
    const held = pool.filter((n) => this.carry.some((v) => v.userData.kind === SPECIES[n].cure));
    const r = Math.random();
    const name = held.length && r < 0.5 ? held[Math.floor(Math.random() * held.length)] : r < 0.7 ? pool[pool.length - 1] : pool[Math.floor(Math.random() * pool.length)];
    const sp = SPECIES[name];
    const pond = sp.zone === 'pond';
    let seat = new THREE.Vector3();
    let theta = 0;
    for (let tries = 0; tries < 40; tries++) {
      if (pond) {
        // around the pond shore
        theta = Math.random() * Math.PI * 2;
        const rr = 3.4 + Math.random() * 2.2;
        seat = new THREE.Vector3(POND_C.x + Math.cos(theta) * rr, 0, Math.min(-10.4, POND_C.z + Math.sin(theta) * rr));
      } else {
        theta = (Math.random() - 0.5) * 3.6;
        const rr = 5 + Math.random() * 4;
        seat = new THREE.Vector3(Math.sin(theta) * rr, 0, Math.cos(theta) * rr);
      }
      const clear =
        this.stations.every((c) => c.pos.distanceTo(seat) > 2) &&
        this.spots.every((s) => s.pos.distanceTo(seat) > 1.6) &&
        this.props.every((o) => o.position.distanceTo(seat) > 1.4) &&
        this.basket.position.distanceTo(seat) > 1.4 &&
        this.beds.every((b) => b.pos.distanceTo(seat) > 1.3) &&
        this.patients.every((p) => p.seat.distanceTo(seat) > 1.8) &&
        seat.distanceTo(this.d.keeper.root.position) > 1.5;
      if (clear) break;
    }
    const exit = pond ? new THREE.Vector3(POND_C.x + Math.cos(theta) * 12, 0, POND_C.z - 6 + Math.sin(theta) * 4) : new THREE.Vector3(Math.sin(theta) * 13, 0, Math.cos(theta) * 13);
    const c = await this.d.spawnCreature(sp.model ?? name, sp.height);
    c.root.position.copy(exit);
    c.setTint(sp.tint);
    c.lookAt(seat.x, seat.z);
    this.d.scene.add(c.root);
    const bt = new THREE.CanvasTexture(bubbleCanvas(sp.ailment, sp.cure));
    bt.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, depthTest: false }));
    bubble.scale.set(0.78, 0.76, 1);
    bubble.renderOrder = 10;
    this.d.scene.add(bubble);
    const ic = document.createElement('canvas');
    ic.width = ic.height = 80;
    drawAilment(ic.getContext('2d')!, sp.ailment, 40, 40, 28);
    const edge = this.makeEdge(ic);
    this.patients.push({ name, c, sp, state: 'arriving', seat, exit, fxT: 1, stateT: 0, bubble, edge, claimed: false });
    this.spawning = false;
  }

  /** the species' own silly symptom */
  private sickFx(p: Patient, dt: number) {
    p.fxT -= dt;
    const c = p.c, h = c.height;
    // own vector: this.tmp is reused by onScreen() below, which would drag every effect to the middle
    const head = c.root.position.clone().setY(h * 0.75);
    const toCam = new THREE.Vector3().subVectors(this.d.camera.position, c.root.position).setY(0).normalize();
    const loud = this.onScreen(c.root.position, h);
    switch (p.sp.ailment) {
      case 'snow':
        // a little cloud that snows instead of raining
        if (Math.random() < dt * 5) this.fx.emit('flake', head.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, h * 0.5, (Math.random() - 0.5) * 0.8)), 1, { speed: 0.15, g: 0.35, life: 2.4 });
        if (p.fxT <= 0) { p.fxT = 2.6 + Math.random(); c.twitch(0.5); if (loud) this.d.sfx.shiver(); }
        break;
      case 'smoke':
        // its flame went out: grey puffs where the fire should be
        if (Math.random() < dt * 3) this.fx.emit('smoke', head.clone().setY(h * 1.0), 1, { speed: 0.2, up: 0.5, g: -0.4, life: 1.6, size: 1.2 });
        if (p.fxT <= 0) { p.fxT = 3 + Math.random(); c.twitch(0.6); if (loud) this.d.sfx.shiver(); }
        break;
      case 'sparks':
        if (p.fxT <= 0) {
          p.fxT = 2.2 + Math.random() * 1.2;
          c.twitch(1.3);
          this.fx.emit('spark', head.clone().addScaledVector(toCam, 0.3), 16, { speed: 2.4, dir: toCam, spread: 0.35, up: 1, g: 3, life: 0.7 });
          if (loud) this.d.sfx.sneeze();
        }
        break;
      case 'spores':
        if (p.fxT <= 0) {
          p.fxT = 2.4 + Math.random();
          c.twitch(1.1);
          this.fx.emit('spore', head.clone().addScaledVector(toCam, 0.3), 22, { speed: 1.2, dir: toCam, spread: 0.6, up: 0.6, g: 0.3, life: 1.6 });
          if (loud) this.d.sfx.sneeze();
        }
        break;
      case 'feathers':
        if (Math.random() < dt * 1.6) this.fx.emit('feather', head.clone().setY(h * 0.8), 1, { speed: 0.4, up: 0.4, g: 0.25, life: 2.8, size: 1.3 });
        if (p.fxT <= 0) { p.fxT = 3 + Math.random(); c.twitch(0.8); this.fx.emit('feather', head.clone().setY(h * 0.7), 4, { speed: 0.8, up: 0.8, g: 0.3, life: 2.5, size: 1.3 }); }
        break;
      case 'bubbles':
        if (p.fxT <= 0) {
          p.fxT = 1.7 + Math.random();
          c.twitch(0.9);
          this.fx.emit('bubble', head.clone().setY(h * 0.6), 3, { speed: 0.4, up: 0.8, g: -0.3, life: 1.8, size: 1.2 });
          if (loud) this.d.sfx.hiccup();
        }
        break;
      case 'confetti':
        if (p.fxT <= 0) {
          p.fxT = 2.3 + Math.random();
          c.twitch(1.2);
          this.fx.emit('confetti', head.clone().addScaledVector(toCam, 0.3), 24, { speed: 2, dir: toCam, spread: 0.5, up: 1.4, g: 2, life: 1.4 });
          if (loud) this.d.sfx.sneeze();
        }
        break;
      case 'crown':
        // sneezes a burst of gold, and its crown pops up for a moment
        if (p.fxT <= 0) {
          p.fxT = 2.4 + Math.random();
          c.twitch(1.4);
          this.fx.emit('spark', head.clone().setY(h * 1.05), 18, { speed: 1.8, up: 1.6, g: 2, life: 0.9, size: 1.1 });
          this.fx.emit('star', head.clone().setY(h * 1.15), 4, { speed: 0.6, up: 1, g: 0.5, life: 0.8 });
          if (loud) this.d.sfx.sneeze();
        }
        break;
      case 'fountain':
        // hiccups a little fountain of water
        if (p.fxT <= 0) {
          p.fxT = 1.9 + Math.random();
          c.twitch(1);
          this.fx.emit('bubble', head.clone().setY(h * 1.0), 14, { speed: 0.9, up: 3.2, g: 6, life: 1, size: 0.6 });
          if (loud) this.d.sfx.hiccup();
        }
        break;
      case 'drip':
        // its hat leaks: drops keep falling around it
        if (Math.random() < dt * 6) {
          const a = Math.random() * Math.PI * 2;
          this.fx.emit('bubble', c.root.position.clone().add(new THREE.Vector3(Math.cos(a) * 0.35, h * 0.95, Math.sin(a) * 0.35)), 1, { speed: 0.05, g: 5, life: 0.6, size: 0.45 });
        }
        if (p.fxT <= 0) { p.fxT = 3 + Math.random(); c.twitch(0.5); if (loud) this.d.sfx.shiver(); }
        break;
      case 'flicker':
        // its glow cuts in and out like a loose bulb
        c.setTint(Math.sin(this.t * 23) > 0.2 || Math.random() < 0.05 ? 0x6a6480 : 0xfff6c0);
        if (p.fxT <= 0) { p.fxT = 2.6 + Math.random(); c.twitch(0.6); this.fx.emit('dust', head.clone().setY(h * 0.6), 6, { speed: 0.6, up: 0.6, g: 1, life: 0.6 }); }
        break;
      case 'stone':
        // slowly turning to stone: stiff, grey, crumbling pebbles
        if (Math.random() < dt * 1.2) this.fx.emit('pebble', c.root.position.clone().setY(h * (0.3 + Math.random() * 0.5)), 1, { speed: 0.5, up: 0.3, g: 6, life: 1.2 });
        if (p.fxT <= 0) { p.fxT = 3.5 + Math.random(); c.twitch(0.3); if (loud) this.d.sfx.shiver(); }
        break;
    }
  }

  private onScreen(pos: THREE.Vector3, h: number) {
    const v = this.tmp.copy(pos).setY(h * 0.6).project(this.d.camera);
    return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
  }

  private deliver(v: THREE.Group, p: Patient) {
    p.state = 'incoming';
    p.c.walk = 0;
    this.fly(v, () => p.c.root.position.clone().setY(p.c.height * 0.8), 0.38, 0.9, () => {
      this.d.scene.remove(v);
      this.cure(p);
    });
  }

  private dropCoins(at: THREE.Vector3, n: number) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(coinGeo, coinMat);
      m.castShadow = true;
      m.position.copy(at);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * (0.5 + Math.random() * 0.6), 3.5 + Math.random() * 1.5, Math.sin(a) * (0.5 + Math.random() * 0.6));
      this.d.scene.add(m);
      this.ground.push({ m, v, t: 0, magnet: false });
    }
  }

  private cure(p: Patient) {
    p.state = 'cured';
    p.stateT = 0;
    p.c.setTint(p.sp.base ?? null);
    this.d.scene.remove(p.bubble);
    p.edge.remove();
    p.c.hop();
    this.d.sfx.heal();
    const at = p.c.root.position.clone().setY(p.c.height * 0.7);
    this.fx.emit('star', at, 26, { speed: 2.6, up: 2.2, life: 1.1 });
    this.dropCoins(at, p.sp.coins);
    if (this.step === 1) this.step = 2;
  }

  // ------------------------------------------------------------ residents

  /** a free bed, preferring lily pads for pond creatures and the pen for everyone else */
  private freeBed(pond = false): Bed | undefined {
    return this.beds.find((b) => !b.owner && b.pond === pond) ?? this.beds.find((b) => !b.owner);
  }

  /** a cured patient moves into the shelter: hand its creature over to a resident record */
  private admit(p: Patient, bed: Bed) {
    const r = this.makeResident(p.name, p.c, bed, 0);
    r.state = 'toBed';
    r.path = this.route(p.c.root.position, bed.pos.clone().add(new THREE.Vector3(0, 0, 0.75)));
    this.residents.push(r);
  }

  private async spawnResident(name: string, hearts: number) {
    const bed = this.freeBed(SPECIES[name].zone === 'pond');
    if (!bed) return;
    bed.owner = {} as Resident; // reserve while loading
    const c = await this.d.spawnCreature(SPECIES[name].model ?? name, SPECIES[name].height);
    c.setTint(SPECIES[name].base ?? null);
    c.root.position.copy(bed.pos).add(new THREE.Vector3(0, 0, 0.75));
    this.d.scene.add(c.root);
    const r = this.makeResident(name, c, bed, Math.min(MAX_HEARTS - 1, hearts));
    r.state = 'idle';
    this.residents.push(r);
  }

  private zone(v: THREE.Vector3): 'pen' | 'camp' | 'pond' {
    if (Math.hypot(v.x, v.z) < 3.6) return 'pen';
    return v.z < -9 ? 'pond' : 'camp';
  }

  /**
   * Waypoints from one place to another without walking through the fence or the brook:
   * the pen has a front gate (to the camp) and a back gate (toward the bridge and the pond).
   */
  private route(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
    const FO = V(0, 4.3), FI = V(0, 2.8), BI = V(0, -2.8), BO = V(0, -4.4), BS = V(0, -7.9), BN = V(0, -10.1);
    const zf = this.zone(from), zt = this.zone(to);
    const enterPen = (p: THREE.Vector3) => (p.z < 0 ? [BO, BI] : [FO, FI]);
    const leavePen = (p: THREE.Vector3) => (p.z < 0 ? [BI, BO] : [FI, FO]);
    let via: THREE.Vector3[] = [];
    if (zf === zt) {
      // camp to camp: go through the pen if the straight line would cross it
      if (zf === 'camp') {
        const d = new THREE.Vector3().subVectors(to, from);
        const t = Math.max(0, Math.min(1, -from.dot(d) / Math.max(1e-6, d.lengthSq())));
        const closest = from.clone().addScaledVector(d, t);
        if (Math.hypot(closest.x, closest.z) < 3.9) via = [...enterPen(from), ...leavePen(to)];
      }
    } else if (zf === 'camp' && zt === 'pen') via = enterPen(from);
    else if (zf === 'pen' && zt === 'camp') via = leavePen(to);
    else if (zf === 'pen' && zt === 'pond') via = [BI, BO, BS, BN];
    else if (zf === 'pond' && zt === 'pen') via = [BN, BS, BO, BI];
    else if (zf === 'camp' && zt === 'pond') via = from.z < -3 ? [BS, BN] : [FO, FI, BI, BO, BS, BN];
    else if (zf === 'pond' && zt === 'camp') via = to.z < -3 ? [BN, BS] : [BN, BS, BO, BI, FI, FO];
    return [...via, to.clone()];
  }

  /** walk along waypoints; true when the last one is reached */
  private follow(c: Creature, path: THREE.Vector3[], speed: number, dt: number) {
    if (!path.length) { c.walk = 0; return true; }
    if (this.walk(c, path[0], speed, dt)) path.shift();
    return path.length === 0;
  }

  /** give up a helping job and release anything it reserved */
  private dropJob(r: Resident) {
    if (!r.job) return;
    if (r.job.patient) r.job.patient.claimed = false;
    if (r.job.resident) r.job.resident.fedIncoming = false;
    if (r.job.item) {
      const it = r.job.item;
      this.fx.emit('dust', it.getWorldPosition(new THREE.Vector3()), 5, { speed: 0.6, up: 0.8, g: 2, life: 0.4 });
      it.parent?.remove(it);
    }
    r.job = null;
  }

  /** pick a helping job matching the species' skill, if there is something useful to do */
  private findJob(r: Resident): boolean {
    const skill = SPECIES[r.name].skill;
    const pos = r.c.root.position;
    const near = (list: Station[]) => list.sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0];
    if ('boost' in skill) {
      const st = near(this.stations.filter((s) => s.kind === skill.boost && s.boost <= 0 && s.tray.length < 6));
      if (!st) return false;
      r.job = { station: st };
    } else if (skill.carry === 'cure') {
      const p = this.patients.find((p) => (p.state === 'waiting' || p.state === 'arriving') && !p.claimed && this.stations.some((s) => s.kind === p.sp.cure && s.tray.length));
      if (!p) return false;
      p.claimed = true;
      r.job = { station: near(this.stations.filter((s) => s.kind === p.sp.cure && s.tray.length)), patient: p };
    } else {
      const other = this.residents.find((o) => o !== r && o.need === 'food' && !o.fedIncoming && o.state === 'idle');
      const st = near(this.stations.filter((s) => s.kind === 'berry' && s.tray.length));
      if (!other || !st) return false;
      other.fedIncoming = true;
      r.job = { station: st, resident: other };
    }
    const front = r.job.station.pos.clone().add(new THREE.Vector3(-0.2, 0, 0.8));
    r.path = this.route(pos, front);
    r.state = 'helpGo';
    return true;
  }

  private feed(r: Resident, v: THREE.Group) {
    r.fedIncoming = true;
    this.fly(v, () => r.c.root.position.clone().setY(r.c.height * 0.6), 0.35, 0.8, () => {
      this.d.scene.remove(v);
      r.fedIncoming = false;
      if (r.state === 'idle' && r.need === 'food') { r.state = 'eating'; r.stateT = 0; }
    });
  }

  private makeResident(name: string, c: Creature, bed: Bed, hearts: number): Resident {
    const canvas = document.createElement('canvas');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    bubble.scale.set(0.78, 0.94, 1);
    bubble.renderOrder = 10;
    this.d.scene.add(bubble);
    const edgeIcon = document.createElement('canvas');
    edgeIcon.width = edgeIcon.height = 80;
    const edge = this.makeEdge(edgeIcon);
    const r: Resident = {
      name, c, bed, hearts, need: null, needT: 4 + Math.random() * 4, state: 'idle', stateT: 0,
      target: bed.pos.clone().add(new THREE.Vector3(0, 0, 0.75)), wanderT: 2, canvas, tex, bubble, edge, edgeIcon, fedIncoming: false,
      path: [], helpT: 8 + Math.random() * 6, job: null,
    };
    bed.owner = r;
    this.drawNeed(r);
    return r;
  }

  private drawNeed(r: Resident) {
    needCanvas(r.canvas, r.need, r.hearts, MAX_HEARTS);
    r.tex.needsUpdate = true;
    const g = r.edgeIcon.getContext('2d')!;
    g.clearRect(0, 0, 80, 80);
    if (r.need === 'food') drawBerry(g, 40, 42, 26);
    else if (r.need === 'sleep') drawMoon(g, 40, 42, 28);
  }

  private addHeart(r: Resident) {
    r.hearts++;
    r.need = null;
    r.needT = 6 + Math.random() * 5;
    this.fx.emit('heart', r.c.root.position.clone().setY(r.c.height + 0.2), 8, { speed: 0.8, up: 1.2, g: -0.2, life: 1.4, size: 1.6 });
    this.d.sfx.pop(6);
    if (this.step === 2) this.step = 3;
    if (r.hearts >= MAX_HEARTS) this.adopt(r);
    this.drawNeed(r);
  }

  private adopt(r: Resident) {
    r.state = 'leaving';
    r.need = null;
    r.bed.owner = null;
    r.bed.ring.visible = false;
    r.c.eyesShut = undefined;
    r.c.hop();
    this.d.sfx.heal();
    this.d.sfx.build();
    const at = r.c.root.position.clone().setY(r.c.height * 0.7);
    this.fx.emit('heart', at, 30, { speed: 2.2, up: 2.5, g: 1, life: 1.6, size: 1.8 });
    this.fx.emit('star', at, 20, { speed: 2.4, up: 2, life: 1.1 });
    this.dropCoins(at, ADOPT_COINS);
    this.setHearts(this.hearts + 1);
    for (const sp of this.spots) this.drawSpot(sp);
    // off to a new home: out through the gate and down toward the edge of the meadow
    this.dropJob(r);
    r.path = this.route(r.c.root.position, r.bed.pond ? new THREE.Vector3(POND_C.x + (Math.random() - 0.5) * 6, 0, -24) : new THREE.Vector3((Math.random() - 0.5) * 4, 0, 13));
    this.save();
  }

  private updateResidents(dt: number) {
    const k = this.d.keeper.root.position;
    for (let i = this.residents.length - 1; i >= 0; i--) {
      const r = this.residents[i];
      const c = r.c, pos = c.root.position;
      c.update(dt);
      r.stateT += dt;
      const nearBed = r.bed.pos.clone().add(new THREE.Vector3(0, 0, 0.75));
      if (r.state === 'toBed') {
        if (this.follow(c, r.path, 1.6, dt)) { r.state = 'idle'; c.hop(); }
      } else if (r.state === 'idle') {
        // potter about next to its bed until it needs something
        r.wanderT -= dt;
        if (r.wanderT <= 0) {
          r.wanderT = 2.5 + Math.random() * 3;
          r.target = nearBed.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1, 0, (Math.random() - 0.5) * 0.6));
        }
        if (!this.walk(c, r.target, 0.6, dt)) { /* strolling */ } else if (pos.distanceTo(k) < 3) c.lookAt(k.x, k.z);
        // once it feels at home it helps out between its own needs
        // the rest after a job runs down even while it waits for food or sleep, so it helps right after being cared for
        if (r.hearts >= 1) {
          r.helpT -= dt;
          if (r.helpT <= 0 && !r.need) {
            r.helpT = 2; // nothing useful to do yet: look again soon
            if (this.findJob(r)) { r.helpT = 10 + Math.random() * 6; continue; }
          }
        }
        if (!r.need) {
          r.needT -= dt;
          if (r.needT <= 0) {
            r.need = Math.random() < 0.5 ? 'food' : 'sleep';
            c.twitch(0.6);
            this.drawNeed(r);
          }
        }
        // feeding: berries fly over when the keeper comes close
        if (r.need === 'food' && !r.fedIncoming && pos.distanceTo(k) < GIVE_R) {
          const v = this.takeFromArms('berry');
          if (v) this.feed(r, v);
        }
        // sleepy: stand on its bed for a moment to plump it up, then it goes to sleep
        if (r.need === 'sleep') {
          const on = Math.hypot(k.x - r.bed.pos.x, k.z - r.bed.pos.z) < 0.6;
          r.bed.fluff = on ? r.bed.fluff + dt : Math.max(0, r.bed.fluff - dt * 2);
          r.bed.mesh.scale.set(1 + Math.sin(this.t * 20) * 0.04 * (on ? 1 : 0), 1, 1);
          if (r.bed.fluff >= 1) {
            r.bed.fluff = 0;
            r.bed.mesh.scale.set(1, 1, 1);
            r.bed.ring.visible = false;
            this.fx.emit('dust', r.bed.pos.clone().setY(0.25), 12, { speed: 1, up: 1, g: 2, life: 0.6 });
            this.d.sfx.pop(2);
            r.state = 'toSleep';
            r.need = null;
            this.drawNeed(r);
          }
        }
      } else if (r.state === 'eating') {
        if (Math.floor(r.stateT * 5) !== Math.floor((r.stateT - dt) * 5)) {
          c.twitch(0.5);
          this.fx.emit('dust', pos.clone().setY(c.height * 0.5), 2, { speed: 0.6, up: 0.4, g: 4, life: 0.4, size: 0.6 });
        }
        if (r.stateT > 1.6) { r.state = 'idle'; this.addHeart(r); }
      } else if (r.state === 'toSleep') {
        if (this.walk(c, r.bed.pos, 1.2, dt)) { r.state = 'sleeping'; r.stateT = 0; c.eyesShut = 1; }
      } else if (r.state === 'sleeping') {
        if (Math.random() < dt * 1.2) this.fx.emit('zzz', pos.clone().setY(c.height + 0.1), 1, { speed: 0.2, up: 0.5, g: -0.1, life: 1.8, size: 1.6 });
        if (r.stateT > 5) { r.state = 'idle'; c.eyesShut = undefined; c.hop(); this.addHeart(r); }
      } else if (r.state === 'helpGo') {
        const job = r.job!;
        const lost = job.patient && (job.patient.state === 'cured' || job.patient.state === 'leaving' || job.patient.state === 'incoming');
        if (lost) { this.dropJob(r); r.state = 'helpBack'; r.path = this.route(pos, nearBed); }
        else if (this.follow(c, r.path, 1.9, dt)) {
          if ('boost' in SPECIES[r.name].skill) { r.state = 'helpWork'; r.stateT = 0; c.lookAt(job.station.pos.x, job.station.pos.z); }
          else if (job.station.tray.length) {
            // pick up one item and carry it on its head
            const v = job.station.tray.pop()!;
            const slot = new THREE.Object3D();
            slot.position.set(0, c.height + 0.05, 0);
            c.attach(slot);
            this.fly(v, () => slot.getWorldPosition(new THREE.Vector3()), 0.25, 0.5, () => {
              if (r.job?.item !== v) { this.d.scene.remove(v); return; }
              slot.add(v);
              v.position.set(0, 0, 0);
              v.rotation.set(0, 0, 0);
              v.scale.setScalar(1.6);
            });
            job.item = v;
            r.state = 'helpBring';
            r.path = [];
          } else { this.dropJob(r); r.state = 'helpBack'; r.path = this.route(pos, nearBed); }
        }
      } else if (r.state === 'helpWork') {
        // the species' own way of helping: rain on the bush, fire under the cauldron, magic, spores
        const st = r.job!.station;
        const kind = SPECIES[r.name].skill;
        if (Math.random() < dt * 8) {
          const at = st.pos.clone().setY(0.9);
          if ('boost' in kind && kind.boost === 'berry') this.fx.emit('bubble', at.clone().setY(1.6), 1, { speed: 0.3, g: 3, life: 0.7, size: 0.5 });
          else if ('boost' in kind && kind.boost === 'pink') this.fx.emit('spark', at.clone().setY(0.3), 2, { speed: 0.8, up: 1.2, g: 1, life: 0.6 });
          else if ('boost' in kind && kind.boost === 'green') this.fx.emit('spore', at, 2, { speed: 0.6, up: 0.6, g: 0.2, life: 1 });
          else this.fx.emit('star', at, 1, { speed: 0.8, up: 0.8, life: 0.7, size: 0.7 });
        }
        if (Math.floor(r.stateT * 2) !== Math.floor((r.stateT - dt) * 2)) c.twitch(0.5);
        if (r.stateT > 2.2) {
          st.boost = 15;
          this.fx.emit('star', st.pos.clone().setY(1.2), 14, { speed: 2, up: 1.5, life: 0.9 });
          this.dropJob(r);
          r.state = 'helpBack';
          r.path = this.route(pos, nearBed);
        }
      } else if (r.state === 'helpBring') {
        const job = r.job!;
        const tgt = job.patient ? job.patient.c : job.resident!.c;
        const gone = job.patient
          ? job.patient.state === 'cured' || job.patient.state === 'leaving' || job.patient.state === 'incoming'
          : !this.residents.includes(job.resident!) || job.resident!.need !== 'food';
        if (gone) { this.dropJob(r); r.state = 'helpBack'; r.path = this.route(pos, nearBed); }
        else {
          if (!r.path.length) r.path = this.route(pos, tgt.root.position);
          r.path[r.path.length - 1].copy(tgt.root.position);
          this.follow(c, r.path, 1.9, dt);
          if (pos.distanceTo(tgt.root.position) < 1.1 && job.item?.parent && job.item.parent !== this.d.scene) {
            const v = job.item;
            job.item = undefined;
            if (job.patient) { job.patient.claimed = false; this.deliver(v, job.patient); }
            else this.feed(job.resident!, v);
            r.job = null;
            r.state = 'helpBack';
            r.path = this.route(pos, nearBed);
          }
        }
      } else if (r.state === 'helpBack') {
        if (this.follow(c, r.path, 1.7, dt)) { r.state = 'idle'; r.wanderT = 0; }
      } else if (r.state === 'leaving') {
        if (Math.random() < dt * 4) this.fx.emit('heart', pos.clone().setY(c.height * 0.8), 1, { speed: 0.3, up: 0.6, g: -0.2, life: 1.2, size: 1.3 });
        if (this.follow(c, r.path, 2.0, dt)) {
          this.d.scene.remove(c.root, r.bubble);
          r.edge.remove();
          this.residents.splice(i, 1);
          continue;
        }
      }
      r.bed.ring.visible = r.need === 'sleep';
      if (r.bed.ring.visible) {
        (r.bed.ring.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(this.t * 5) * 0.3;
        r.bed.ring.scale.setScalar(1 + r.bed.fluff * 0.3);
      }
      r.bubble.visible = r.state !== 'leaving';
      const bubbleH = r.need ? 0.6 : 0.2;
      r.bubble.position.set(pos.x, c.height + bubbleH + Math.sin(this.t * 3 + i) * 0.04, pos.z);
      if (r.need) this.placeEdge(pos, c.height, r.edge);
      else r.edge.classList.remove('on');
    }
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

    if (this.shoes && keeper.walk > 0.3) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.07;
        this.fx.emit('dust', k.clone().setY(0.08), 1, { speed: 0.4, up: 0.5, g: 0.5, life: 0.5, size: 0.8 });
      }
    }

    // pick up from any station in reach, one at a time
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
    if (!this.spawning && active < this.maxPatients + (this.pondOpen ? 1 : 0) && this.spawnT <= 0) {
      this.spawnT = 3.5;
      void this.spawnPatient();
    }
    for (let i = this.patients.length - 1; i >= 0; i--) {
      const p = this.patients[i];
      const pos = p.c.root.position;
      p.stateT += dt;
      p.c.update(dt);
      if (p.state === 'arriving' || p.state === 'leaving') {
        if (this.walk(p.c, p.state === 'arriving' ? p.seat : p.exit, p.state === 'arriving' ? 1.7 : 2.2, dt)) {
          if (p.state === 'leaving') {
            this.d.scene.remove(p.c.root);
            this.patients.splice(i, 1);
            continue;
          }
          p.state = 'waiting';
        }
      }
      if (p.state === 'waiting' && pos.distanceTo(k) < 4) p.c.lookAt(k.x, k.z);
      if ((p.state === 'waiting' || p.state === 'arriving') && pos.distanceTo(k) < GIVE_R) {
        const v = this.takeFromArms(p.sp.cure);
        if (v) this.deliver(v, p);
      }
      if (p.state === 'arriving' || p.state === 'waiting' || p.state === 'incoming') {
        this.sickFx(p, dt);
        p.bubble.position.set(pos.x, p.c.height + 0.55 + Math.sin(this.t * 3 + i) * 0.05, pos.z);
        this.placeEdge(pos, p.c.height, p.edge);
      }
      if (p.state === 'cured') {
        if (p.stateT > 0.9 && p.stateT - dt <= 0.9) p.c.hop();
        if (p.stateT > 1.6) {
          // move into the shelter if there is a free bed, otherwise head home
          const bed = this.freeBed(p.sp.zone === 'pond');
          if (bed) {
            this.patients.splice(i, 1);
            this.admit(p, bed);
            continue;
          }
          p.state = 'leaving';
        }
      }
    }

    this.updateResidents(dt);
    this.updateHelpers(dt);

    // basket: standing next to it tips the pile in, top item first
    const b = this.basket.position;
    this.dropT -= dt;
    if (this.carry.length && Math.hypot(k.x - b.x, k.z - b.z) < 0.95 && this.dropT <= 0) {
      const v = this.carry[this.carry.length - 1];
      if (v.userData.landed) {
        this.carry.pop();
        this.dropT = 0.1;
        this.fly(v, () => b.clone().setY(0.35), 0.25, 0.6, () => {
          this.d.scene.remove(v);
          this.fx.emit('dust', b.clone().setY(0.5), 5, { speed: 0.8, up: 1, g: 2, life: 0.5 });
        });
        this.d.sfx.pop(-4);
      }
    }

    // coins
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

    // build spots
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i];
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(this.t * 3) * 0.2;
      const on = Math.hypot(k.x - s.pos.x, k.z - s.pos.z) < 0.9;
      s.payT -= dt;
      const next = s.index === this.bought && (s.def.hearts ?? 0) <= this.hearts;
      if (on && next && this.coins > 0 && s.paid < s.def.price) s.payAcc += dt * Math.max(12, s.def.price / 1.5);
      else s.payAcc = 0;
      const chunk = Math.min(this.coins, s.def.price - s.paid, Math.floor(s.payAcc));
      if (chunk > 0) {
        s.payAcc -= chunk;
        this.setCoins(this.coins - chunk);
        s.paid += chunk;
        if (s.payT <= 0) {
          s.payT = 0.06;
          const m = new THREE.Mesh(coinGeo, coinMat);
          m.position.copy(k).setY(1);
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
          if (this.step === 3) this.step = 4;
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

    // safety net: anything left lying around with no owner disappears in a puff
    this.strayT -= dt;
    if (this.strayT <= 0) {
      this.strayT = 1;
      for (const g of this.findStrays()) {
        this.fx.emit('dust', g.getWorldPosition(new THREE.Vector3()), 6, { speed: 0.8, up: 1, g: 2, life: 0.5 });
        if (location.search.includes('debug')) console.warn('stray item removed', g.userData.kind, g.parent?.type);
        g.parent?.remove(g);
      }
    }

    this.updateGuide();
    this.saveT += dt;
    if (this.saveT > 5) {
      this.saveT = 0;
      this.save();
    }
  }

  private updateHelpers(dt: number) {
    for (const h of this.helpers) {
      h.c.update(dt);
      const pos = h.c.root.position;
      const done = (p: Patient | null) => !p || p.state === 'cured' || p.state === 'leaving' || p.state === 'incoming';
      if (h.state === 'idle' && h.item) {
        const kind = h.item.userData.kind as Medicine;
        const p = this.patients.find((p) => (p.state === 'waiting' || p.state === 'arriving') && !p.claimed && p.sp.cure === kind);
        if (p) { p.claimed = true; h.patient = p; h.state = 'toPatient'; }
        else this.walk(h.c, h.home, 1.4, dt);
      } else if (h.state === 'idle') {
        const p = this.patients.find((p) => (p.state === 'waiting' || p.state === 'arriving') && !p.claimed && this.stations.some((s) => s.kind === p.sp.cure && s.tray.length));
        if (p) {
          const st = this.stations.filter((s) => s.kind === p.sp.cure && s.tray.length).sort((a, b) => a.pos.distanceTo(pos) - b.pos.distanceTo(pos))[0];
          p.claimed = true;
          h.patient = p;
          h.station = st;
          h.state = 'toStation';
        } else this.walk(h.c, h.home, 1.4, dt);
      } else if (h.state === 'toStation' && h.station) {
        const st = h.station;
        const p = h.patient!;
        if (done(p)) { p.claimed = false; h.state = 'idle'; continue; }
        if (this.walk(h.c, new THREE.Vector3(st.pos.x - 0.1, 0, st.pos.z + 0.75), 2.0, dt) || pos.distanceTo(st.pos) < 1.0) {
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
        if (done(p)) { h.patient = null; h.state = 'idle'; continue; }
        const pp = p.c.root.position;
        if (this.walk(h.c, pp, 2.0, dt) || pos.distanceTo(pp) < 1.1) {
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
    const first = this.stations[0];
    if (this.step === 0) target = first.pos.clone().setY(1.5);
    else if (this.step === 1) {
      const p = this.patients.find((p) => p.state === 'waiting' || p.state === 'arriving');
      if (p && this.carry.some((v) => v.userData.kind === p.sp.cure)) target = p.c.root.position.clone().setY(p.c.height + 1.3);
      else target = first.pos.clone().setY(1.5);
    } else if (this.step === 2) {
      const r = this.residents.find((r) => r.need);
      if (r?.need === 'food') {
        const berries = this.stations.find((s) => s.kind === 'berry')!;
        target = this.carry.some((v) => v.userData.kind === 'berry') ? r.c.root.position.clone().setY(r.c.height + 1.3) : berries.pos.clone().setY(1.4);
      } else if (r?.need === 'sleep') target = r.bed.pos.clone().setY(0.9);
    } else if (this.step === 3) {
      const s = this.spots.find((s) => s.index === this.bought);
      if (!this.ground.length && s && this.coins >= s.def.price) target = s.pos.clone().setY(1);
    }
    this.guide.visible = !!target;
    if (target) {
      this.guide.position.set(target.x, target.y + Math.abs(Math.sin(this.t * 4)) * 0.25, target.z);
      this.guide.rotation.y += 0.03;
    }
    // creatures that need the keeper already have their own edge arrows
    const atCreature = target && [...this.patients.map((p) => p.c), ...this.residents.map((r) => r.c)].some((c) => Math.hypot(c.root.position.x - target!.x, c.root.position.z - target!.z) < 0.01);
    if (target && !atCreature) this.placeEdge(target, target.y / 0.6, this.guideEdge);
    else this.guideEdge.classList.remove('on');
  }

  /** pin an arrow to the screen edge pointing at something that needs the keeper and is out of view */
  private placeEdge(pos: THREE.Vector3, h: number, el: HTMLDivElement) {
    const v = this.tmp.copy(pos).setY(h * 0.6).project(this.d.camera);
    const behind = v.z > 1;
    if (!behind && Math.abs(v.x) < 0.9 && Math.abs(v.y) < 0.88) {
      el.classList.remove('on');
      return;
    }
    let dx = v.x, dy = -v.y;
    if (behind) { dx = -dx; dy = -dy; }
    const W = window.innerWidth / 2, H = window.innerHeight / 2, m = 44;
    const sx = dx * W, sy = dy * H;
    const t = Math.min((W - m) / Math.max(1e-3, Math.abs(sx)), (H - m) / Math.max(1e-3, Math.abs(sy)));
    el.style.left = `${W + sx * t}px`;
    el.style.top = `${H + sy * t}px`;
    (el.firstChild as SVGElement).style.transform = `rotate(${Math.atan2(sy, sx)}rad)`;
    el.classList.add('on');
  }
}
