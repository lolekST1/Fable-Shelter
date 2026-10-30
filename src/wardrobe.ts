import * as THREE from 'three';
import { drawCoin, drawHeart } from './icons';
import { halloween } from './halloween';

/**
 * The wardrobe in the shelter house: things for the keeper to wear, bought once with coins and then put on or
 * taken off at will. One thing per slot: on the hat, round the neck, and a trail left behind when walking.
 * It opens when the keeper stands at the house door. Icons and numbers only, no words.
 */

export type Slot = 'head' | 'neck' | 'trail';
/** `seasonal`: sold only while Halloween lasts (see halloween.ts); once bought it stays */
export interface Item { id: string; slot: Slot; price: number; seasonal?: boolean }
export const ITEMS: Item[] = [
  { id: 'flower', slot: 'head', price: 150 },
  { id: 'feather', slot: 'head', price: 350 },
  { id: 'ears', slot: 'head', price: 700 },
  { id: 'crown', slot: 'head', price: 4000 },
  { id: 'witch', slot: 'head', price: 600, seasonal: true },
  { id: 'scarf', slot: 'neck', price: 200 },
  { id: 'stripes', slot: 'neck', price: 450 },
  { id: 'bow', slot: 'neck', price: 800 },
  { id: 'lei', slot: 'neck', price: 1200 },
  { id: 'hearts', slot: 'trail', price: 900 },
  { id: 'bubbles', slot: 'trail', price: 3500 },
  { id: 'stars', slot: 'trail', price: 8000 },
  { id: 'embers', slot: 'trail', price: 1100, seasonal: true },
];
export interface WardrobeState { owned: string[]; worn: Partial<Record<Slot, string>> }

const mat = (color: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

/** the 3D thing to wear, in the keeper's body space (the keeper is 1.4 tall, the hat top about 1.36 up) */
export function itemMesh(id: string): THREE.Group | null {
  const g = new THREE.Group();
  const HAT = 1.36, NECK = 0.66;
  if (id === 'flower') {
    const petal = mat(0xff8ac0);
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), petal);
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07);
      p.scale.set(1, 0.5, 1);
      g.add(p);
    }
    const mid = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0xffd34d));
    mid.position.y = 0.02;
    g.add(mid);
    g.position.set(0.16, HAT - 0.06, 0.12);
    g.rotation.set(0.5, 0, -0.3);
  } else if (id === 'feather') {
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0x6fc3ff));
    f.scale.set(0.6, 3.2, 0.25);
    f.position.y = 0.17;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0xffffff));
    tip.position.y = 0.36;
    g.add(f, tip);
    g.position.set(-0.17, HAT - 0.1, -0.02);
    g.rotation.z = 0.35;
  } else if (id === 'ears') {
    const fur = mat(0xffffff), pink = mat(0xffb3cc);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), fur);
      ear.scale.set(0.7, 2.6, 0.45);
      ear.position.set(s * 0.12, HAT + 0.14, -0.02);
      ear.rotation.z = -s * 0.2;
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pink);
      inner.scale.set(0.6, 2.4, 0.3);
      inner.position.set(s * 0.12, HAT + 0.14, 0.015);
      inner.rotation.z = -s * 0.2;
      g.add(ear, inner);
    }
  } else if (id === 'crown') {
    // a gold band hugging the top of the hat (seen from both sides, so its back shows too), five points growing out of
    // its top edge with a pearl on each tip, one point facing the front, and gems set in the band between the points
    const goldM = mat(0xffcf4a, { metalness: 0.6, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.25, side: THREE.DoubleSide });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.07, 28, 1, true), goldM);
    band.position.y = HAT;
    g.add(band);
    const pearl = mat(0xfff6f8, { roughness: 0.2, emissive: 0xffe8f0, emissiveIntensity: 0.2 });
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.12, 4), goldM);
      point.position.set(Math.cos(a) * 0.155, HAT + 0.09, Math.sin(a) * 0.155);
      point.rotation.y = -a + Math.PI / 4;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), pearl);
      tip.position.set(Math.cos(a) * 0.155, HAT + 0.155, Math.sin(a) * 0.155);
      const b = a + Math.PI / 5;
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat(i % 2 ? 0xff5f86 : 0x6fc3ff, { roughness: 0.15, metalness: 0.2 }));
      gem.scale.set(1, 1, 0.5);
      gem.position.set(Math.cos(b) * 0.158, HAT, Math.sin(b) * 0.158);
      gem.rotation.y = -b + Math.PI / 2;
      g.add(point, tip, gem);
    }
  } else if (id === 'witch') {
    const cloth = mat(0x4a2f6a, { roughness: 0.85 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 24), cloth);
    brim.position.y = HAT;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 20), cloth);
    cone.position.set(0, HAT + 0.17, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), cloth);
    tip.position.set(0.05, HAT + 0.36, 0);
    tip.rotation.z = -0.7; // the tip flops over
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.138, 0.05, 20), mat(0xf08a24));
    band.position.y = HAT + 0.04;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.01), mat(0xffd34d, { metalness: 0.5, roughness: 0.3 }));
    buckle.position.set(0, HAT + 0.04, 0.135);
    g.add(brim, cone, tip, band, buckle);
    g.rotation.z = 0.12;
  } else if (id === 'scarf' || id === 'stripes') {
    const a = mat(id === 'scarf' ? 0xe8435a : 0x59c25a), b = mat(id === 'scarf' ? 0xe8435a : 0xffffff);
    for (let i = 0; i < 12; i++) {
      const t = (i / 12) * Math.PI * 2;
      const seg = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), i % 2 ? a : b);
      seg.position.set(Math.cos(t) * 0.2, NECK, Math.sin(t) * 0.17);
      g.add(seg);
    }
    for (let i = 0; i < 3; i++) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.06), i % 2 ? b : a);
      tail.position.set(0.1 + i * 0.015, NECK - 0.09 - i * 0.1, 0.18);
      tail.rotation.z = 0.15;
      g.add(tail);
    }
  } else if (id === 'bow') {
    const red = mat(0xe8435a);
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), red);
      wing.rotation.z = s * Math.PI / 2;
      wing.position.set(s * 0.075, NECK, 0.2);
      g.add(wing);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), red);
    knot.position.set(0, NECK, 0.21);
    g.add(knot);
  } else if (id === 'lei') {
    const cols = [0xff8ac0, 0xffd34d, 0xffffff, 0xb8a4ff];
    for (let i = 0; i < 14; i++) {
      const t = (i / 14) * Math.PI * 2;
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat(cols[i % 4]));
      fl.position.set(Math.cos(t) * 0.21, NECK - 0.02 + (Math.sin(t) > 0 ? -0.06 * Math.sin(t) : 0), Math.sin(t) * 0.18);
      g.add(fl);
    }
  } else return null; // trails have no mesh: the game leaves particles behind
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  // the keeper's hat is big and the camera looks down on it: grow the things round where they sit
  const slot = ITEMS.find((i) => i.id === id)!.slot;
  const at = slot === 'head' ? HAT : NECK, k = slot === 'head' ? 2 : 1.3;
  const w = new THREE.Group();
  g.position.y -= at;
  w.add(g);
  w.position.y = at;
  w.scale.setScalar(k);
  return w;
}

/** the item as a flat icon for the wardrobe cards */
export function drawItem(g: CanvasRenderingContext2D, id: string, x: number, y: number, r: number) {
  g.save();
  const dot = (dx: number, dy: number, rr: number, c: string) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); g.fill(); };
  if (id === 'flower') {
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; dot(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.34, '#ff8ac0'); }
    dot(0, 0, 0.26, '#ffd34d');
  } else if (id === 'feather') {
    g.fillStyle = '#6fc3ff';
    g.beginPath(); g.ellipse(x, y, r * 0.25, r * 0.85, 0.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffffff'; g.lineWidth = r * 0.08;
    g.beginPath(); g.moveTo(x - r * 0.35, y + r * 0.8); g.lineTo(x + r * 0.3, y - r * 0.7); g.stroke();
  } else if (id === 'ears') {
    for (const s of [-1, 1]) {
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + s * r * 0.35, y, r * 0.25, r * 0.75, s * 0.2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#e0d6d6'; g.lineWidth = r * 0.05; g.stroke();
      g.fillStyle = '#ffb3cc'; g.beginPath(); g.ellipse(x + s * r * 0.35, y + r * 0.05, r * 0.12, r * 0.5, s * 0.2, 0, Math.PI * 2); g.fill();
    }
  } else if (id === 'crown') {
    g.fillStyle = '#ffc21a';
    g.beginPath();
    g.moveTo(x - r * 0.8, y + r * 0.55); g.lineTo(x - r * 0.8, y - r * 0.4); g.lineTo(x - r * 0.4, y); g.lineTo(x, y - r * 0.7);
    g.lineTo(x + r * 0.4, y); g.lineTo(x + r * 0.8, y - r * 0.4); g.lineTo(x + r * 0.8, y + r * 0.55);
    g.closePath(); g.fill();
    dot(-0.4, 0.3, 0.12, '#ff5f86'); dot(0, 0.3, 0.12, '#6fc3ff'); dot(0.4, 0.3, 0.12, '#ff5f86');
  } else if (id === 'witch') {
    g.fillStyle = '#4a2f6a';
    g.beginPath(); g.ellipse(x, y + r * 0.45, r * 0.9, r * 0.18, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(x - r * 0.45, y + r * 0.45); g.lineTo(x + r * 0.2, y - r * 0.6); g.lineTo(x + r * 0.62, y - r * 0.38); g.lineTo(x + r * 0.45, y + r * 0.45); g.closePath(); g.fill();
    g.fillStyle = '#f08a24'; g.fillRect(x - r * 0.42, y + r * 0.2, r * 0.86, r * 0.16);
    g.fillStyle = '#ffd34d'; g.fillRect(x - r * 0.07, y + r * 0.18, r * 0.14, r * 0.2);
  } else if (id === 'scarf' || id === 'stripes') {
    const a = id === 'scarf' ? '#e8435a' : '#59c25a', b = id === 'scarf' ? '#c8304a' : '#ffffff';
    g.lineWidth = r * 0.36; g.lineCap = 'round';
    g.strokeStyle = a; g.beginPath(); g.ellipse(x, y - r * 0.2, r * 0.6, r * 0.32, 0, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(x + r * 0.15, y + r * (0.05 + i * 0.25), r * 0.32, r * 0.25); }
  } else if (id === 'bow') {
    g.fillStyle = '#e8435a';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * r * 0.85, y - r * 0.5); g.lineTo(x + s * r * 0.85, y + r * 0.5); g.closePath(); g.fill(); }
    dot(0, 0, 0.22, '#c8304a');
  } else if (id === 'lei') {
    const cols = ['#ff8ac0', '#ffd34d', '#ffffff', '#b8a4ff'];
    for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2; dot(Math.cos(t) * 0.6, Math.sin(t) * 0.45, 0.2, cols[i % 4]); }
  } else if (id === 'hearts') {
    drawHeart(g, x - r * 0.35, y + r * 0.25, r * 0.3, '#ff5f86');
    drawHeart(g, x + r * 0.3, y - r * 0.25, r * 0.4, '#ff8ac0');
  } else if (id === 'bubbles') {
    g.strokeStyle = '#6fc3ff'; g.lineWidth = r * 0.1;
    for (const [dx, dy, rr] of [[-0.35, 0.3, 0.3], [0.3, -0.1, 0.38], [-0.05, -0.6, 0.2]]) { g.beginPath(); g.arc(x + dx * r, y + dy * r, rr * r, 0, Math.PI * 2); g.stroke(); }
  } else if (id === 'embers') {
    for (const [dx, dy, s, c] of [[-0.4, 0.35, 0.3, '#ff8a3d'], [0.3, -0.2, 0.42, '#ffe066'], [-0.05, -0.62, 0.22, '#ff8a3d'], [0.45, 0.5, 0.2, '#ffe066']] as const) {
      g.fillStyle = c;
      g.beginPath(); g.moveTo(x + dx * r, y + (dy - s) * r); g.lineTo(x + (dx + s * 0.7) * r, y + dy * r); g.lineTo(x + dx * r, y + (dy + s) * r); g.lineTo(x + (dx - s * 0.7) * r, y + dy * r); g.closePath(); g.fill();
    }
  } else if (id === 'stars') {
    for (const [dx, dy, s] of [[-0.35, 0.3, 0.45], [0.35, -0.3, 0.55]]) {
      g.fillStyle = '#ffc21a';
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = (k % 2 ? 0.4 : 1) * s * r; g.lineTo(x + dx * r + Math.cos(a) * rr, y + dy * r + Math.sin(a) * rr); }
      g.fill();
    }
  }
  g.restore();
}

/** a coat hanger: the wardrobe button over the house door */
export function drawHanger(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.strokeStyle = '#8a5a32';
  g.lineWidth = r * 0.12;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.arc(x, y - r * 0.55, r * 0.18, Math.PI, Math.PI * 2.4);
  g.moveTo(x, y - r * 0.3);
  g.lineTo(x - r * 0.85, y + r * 0.35);
  g.lineTo(x + r * 0.85, y + r * 0.35);
  g.closePath();
  g.stroke();
  g.fillStyle = '#e8435a';
  g.fillRect(x - r * 0.55, y + r * 0.35, r * 1.1, r * 0.4);
  g.restore();
}

export class Wardrobe {
  state: WardrobeState = { owned: [], worn: {} };
  private panel: HTMLDivElement;
  private grid: HTMLDivElement;

  constructor(
    /** pay for an item; false when there are not enough coins */
    private pay: (price: number) => boolean,
    /** what is worn changed: put the things on the keeper */
    private dress: (worn: WardrobeState['worn']) => void,
    private coins: () => number,
  ) {
    const css = document.createElement('style');
    css.textContent = `
      #wardrobe { position: fixed; inset: 0; display: none; background: rgba(40,70,60,.45); z-index: 20; }
      #wardrobe.on { display: block; }
      #wardrobe .book { position: absolute; left: 12px; right: 12px; bottom: calc(12px + env(safe-area-inset-bottom)); max-width: 480px; margin: 0 auto;
        background: #fff8ec; border-radius: 22px; box-shadow: 0 8px 30px rgba(40,70,60,.35); padding: 12px; box-sizing: border-box; }
      #wardrobe .close { float: right; width: 44px; height: 44px; border: 0; border-radius: 50%; background: #ffe3d6; display: grid; place-items: center; padding: 0; }
      #wardrobe .row { clear: both; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 6px 0 10px; }
      #wardrobe .card { position: relative; min-width: 0; aspect-ratio: 0.9; border: 0; border-radius: 14px; background: #fff; box-shadow: 0 2px 6px rgba(120,90,40,.18);
        display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2px; font: 800 14px system-ui, sans-serif; color: #5b4a1a; }
      #wardrobe .card canvas.ic { width: 70%; aspect-ratio: 1; }
      #wardrobe .card .price { display: flex; align-items: center; gap: 2px; }
      #wardrobe .card .price canvas { width: 16px; height: 16px; }
      #wardrobe .card.poor { opacity: .45; }
      #wardrobe .card.worn { background: #fff1b8; box-shadow: inset 0 0 0 3px #ffc21a, 0 2px 6px rgba(120,90,40,.18); }
      #wardrobe .card .tick { position: absolute; right: 4px; top: 4px; display: none; }
      #wardrobe .card.worn .tick { display: block; }`;
    document.head.appendChild(css);
    this.panel = document.createElement('div');
    this.panel.id = 'wardrobe';
    const book = document.createElement('div');
    book.className = 'book';
    const close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" stroke="#c0583e" stroke-width="3.5" stroke-linecap="round"/></svg>';
    close.addEventListener('click', () => this.close());
    this.grid = document.createElement('div');
    book.append(close, this.grid);
    this.panel.appendChild(book);
    this.panel.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === this.panel) this.close(); });
    document.body.appendChild(this.panel);
  }

  get isOpen() { return this.panel.classList.contains('on'); }

  load(s: WardrobeState | undefined) {
    if (!s) return;
    this.state.owned = (s.owned ?? []).filter((id) => ITEMS.some((i) => i.id === id));
    for (const [slot, id] of Object.entries(s.worn ?? {})) if (id && this.state.owned.includes(id)) this.state.worn[slot as Slot] = id;
    this.dress(this.state.worn);
  }

  /** called on every open (true) and close (false): gameplay pauses meanwhile */
  onToggle?: (open: boolean) => void;

  open() {
    this.render();
    this.panel.classList.add('on');
    this.onToggle?.(true);
  }

  close() {
    if (!this.isOpen) return;
    this.panel.classList.remove('on');
    this.onToggle?.(false);
  }

  /** tap a card: buy it if not owned yet (and put it on), else put it on or take it off */
  tap(id: string) {
    const item = ITEMS.find((i) => i.id === id)!;
    if (!this.state.owned.includes(id)) {
      if (!this.pay(item.price)) return false;
      this.state.owned.push(id);
      this.state.worn[item.slot] = id;
    } else this.state.worn[item.slot] = this.state.worn[item.slot] === id ? undefined : id;
    this.dress(this.state.worn);
    this.render();
    return true;
  }

  private render() {
    this.grid.innerHTML = '';
    for (const slot of ['head', 'neck', 'trail'] as Slot[]) {
      const row = document.createElement('div');
      row.className = 'row';
      for (const item of ITEMS.filter((i) => i.slot === slot && (!i.seasonal || halloween() || this.state.owned.includes(i.id)))) {
        const owned = this.state.owned.includes(item.id);
        const card = document.createElement('button');
        card.className = 'card' + (this.state.worn[slot] === item.id ? ' worn' : '') + (!owned && this.coins() < item.price ? ' poor' : '');
        card.dataset.id = item.id;
        const ic = document.createElement('canvas');
        ic.className = 'ic';
        ic.width = ic.height = 96;
        drawItem(ic.getContext('2d')!, item.id, 48, 48, 36);
        card.appendChild(ic);
        if (!owned) {
          const price = document.createElement('span');
          price.className = 'price';
          const coin = document.createElement('canvas');
          coin.width = coin.height = 68;
          drawCoin(coin.getContext('2d')!, 34, 34, 28);
          price.append(coin, String(item.price));
          card.appendChild(price);
        }
        const tick = document.createElement('span');
        tick.className = 'tick';
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12.5l5 5L20 6" fill="none" stroke="#3aa65a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        card.addEventListener('click', () => this.tap(item.id));
        row.appendChild(card);
      }
      this.grid.appendChild(row);
    }
  }
}
