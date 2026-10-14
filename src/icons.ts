/** Small hand-drawn canvas icons, so nothing in the game depends on text or emoji fonts. */

export type Ailment = 'sparks' | 'snow' | 'bubbles';

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, points: number, inner: number) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
}

/** draws the ailment symbol centred at (x, y) with radius r */
export function drawAilment(g: CanvasRenderingContext2D, kind: Ailment, x: number, y: number, r: number) {
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (kind === 'sparks') {
    // a sneeze of sparks: big orange burst with a yellow heart and two little sparks
    star(g, x - r * 0.12, y + r * 0.08, r * 0.78, 8, 0.5);
    g.fillStyle = '#ff8a3d';
    g.fill();
    star(g, x - r * 0.12, y + r * 0.08, r * 0.42, 8, 0.55);
    g.fillStyle = '#ffe066';
    g.fill();
    for (const [dx, dy, s] of [[0.68, -0.58, 0.26], [0.78, 0.2, 0.18]]) {
      star(g, x + dx * r, y + dy * r, s * r, 4, 0.4);
      g.fillStyle = '#ffb347';
      g.fill();
    }
  } else if (kind === 'snow') {
    g.strokeStyle = '#6fb6ff';
    g.lineWidth = r * 0.16;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const ex = x + Math.cos(a) * r * 0.85, ey = y + Math.sin(a) * r * 0.85;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(ex, ey);
      g.stroke();
      const bx = x + Math.cos(a) * r * 0.5, by = y + Math.sin(a) * r * 0.5;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(bx, by);
        g.lineTo(bx + Math.cos(a + s * 0.8) * r * 0.28, by + Math.sin(a + s * 0.8) * r * 0.28);
        g.stroke();
      }
    }
  } else {
    // hiccup bubbles
    for (const [dx, dy, s] of [[-0.3, 0.3, 0.5], [0.42, -0.05, 0.36], [0.05, -0.62, 0.26]]) {
      const cx = x + dx * r, cy = y + dy * r, rr = s * r;
      g.beginPath();
      g.arc(cx, cy, rr, 0, Math.PI * 2);
      g.fillStyle = 'rgba(143,211,255,0.55)';
      g.fill();
      g.lineWidth = r * 0.08;
      g.strokeStyle = '#4aa8e8';
      g.stroke();
      g.beginPath();
      g.arc(cx - rr * 0.35, cy - rr * 0.35, rr * 0.22, 0, Math.PI * 2);
      g.fillStyle = '#fff';
      g.fill();
    }
  }
  g.restore();
}

export function drawCoin(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = '#f2a91d';
  g.fill();
  g.beginPath();
  g.arc(x, y, r * 0.78, 0, Math.PI * 2);
  g.fillStyle = '#ffd34d';
  g.fill();
  star(g, x, y, r * 0.42, 5, 0.45);
  g.fillStyle = '#f2a91d';
  g.fill();
  g.restore();
}

export type Medicine = 'pink' | 'blue' | 'green';
/** which medicine cures which ailment: a warm brew for chills, spring water for fiery sneezes, herbs for hiccups */
export const CURE: Record<Ailment, Medicine> = { snow: 'pink', sparks: 'blue', bubbles: 'green' };

/** pink warm brew: round flask */
export function drawVial(g: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#ff5fa8') {
  g.save();
  const cy = y + r * 0.3, br = r * 0.5;
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillRect(x - r * 0.17, y - r * 0.72, r * 0.34, r * 0.62);
  g.beginPath();
  g.arc(x, cy, br, 0, Math.PI * 2);
  g.fill();
  g.save();
  g.beginPath();
  g.rect(x - r, cy - br * 0.25, r * 2, r * 2);
  g.clip();
  g.beginPath();
  g.arc(x, cy, br * 0.84, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
  g.restore();
  g.fillStyle = '#b07a4a';
  g.fillRect(x - r * 0.21, y - r * 0.92, r * 0.42, r * 0.24);
  g.lineWidth = r * 0.09;
  g.strokeStyle = '#5b7f73';
  g.beginPath();
  g.arc(x, cy, br, 0, Math.PI * 2);
  g.stroke();
  g.restore();
}

/** blue spring water: a big drop */
export function drawDrop(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.beginPath();
  g.moveTo(x, y - r * 0.85);
  g.bezierCurveTo(x + r * 0.2, y - r * 0.45, x + r * 0.62, y - r * 0.05, x + r * 0.62, y + r * 0.32);
  g.arc(x, y + r * 0.32, r * 0.62, 0, Math.PI, false);
  g.bezierCurveTo(x - r * 0.62, y - r * 0.05, x - r * 0.2, y - r * 0.45, x, y - r * 0.85);
  g.fillStyle = '#4fb4ff';
  g.fill();
  g.lineWidth = r * 0.09;
  g.strokeStyle = '#2a78c0';
  g.stroke();
  g.beginPath();
  g.ellipse(x - r * 0.24, y + r * 0.2, r * 0.12, r * 0.22, -0.4, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}

/** green herbs: a pair of leaves */
export function drawLeaf(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  for (const [a, dx] of [[-0.5, -0.18], [0.45, 0.2]] as [number, number][]) {
    g.save();
    g.translate(x + dx * r, y + r * 0.1);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, r * 0.6);
    g.quadraticCurveTo(r * 0.55, 0, 0, -r * 0.75);
    g.quadraticCurveTo(-r * 0.55, 0, 0, r * 0.6);
    g.fillStyle = '#59c25a';
    g.fill();
    g.lineWidth = r * 0.08;
    g.strokeStyle = '#2f8a3a';
    g.stroke();
    g.beginPath();
    g.moveTo(0, r * 0.55);
    g.lineTo(0, -r * 0.6);
    g.stroke();
    g.restore();
  }
  g.restore();
}

export function drawMedicine(g: CanvasRenderingContext2D, m: Medicine, x: number, y: number, r: number) {
  if (m === 'pink') drawVial(g, x, y, r);
  else if (m === 'blue') drawDrop(g, x, y, r);
  else drawLeaf(g, x, y, r);
}

/** a cauldron silhouette, for the build spot that makes one */
export function drawCauldron(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#4b4560';
  g.beginPath();
  g.ellipse(x, y + r * 0.1, r * 0.8, r * 0.62, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a3550';
  g.fillRect(x - r * 0.88, y - r * 0.45, r * 1.76, r * 0.22);
  g.fillStyle = '#ff5fa8';
  g.beginPath();
  g.ellipse(x, y - r * 0.38, r * 0.72, r * 0.12, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffd1e8';
  for (const [dx, dy, s] of [[-0.2, -0.62, 0.12], [0.18, -0.78, 0.09], [0.02, -0.98, 0.07]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** stone basin with blue water */
export function drawSpring(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#9aa3ad';
  g.beginPath();
  g.ellipse(x, y + r * 0.15, r * 0.9, r * 0.55, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4fb4ff';
  g.beginPath();
  g.ellipse(x, y, r * 0.65, r * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  drawDrop(g, x, y - r * 0.6, r * 0.45);
}

/** planter box with sprouts */
export function drawHerbs(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#b07a4a';
  g.fillRect(x - r * 0.9, y + r * 0.1, r * 1.8, r * 0.55);
  g.fillStyle = '#6b4a2e';
  g.fillRect(x - r * 0.8, y + r * 0.05, r * 1.6, r * 0.14);
  g.restore();
  for (const dx of [-0.5, 0, 0.5]) drawLeaf(g, x + dx * r, y - r * 0.3, r * 0.42);
}

/** a backpack: carry more */
export function drawBackpack(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#c47a3a';
  g.beginPath();
  g.roundRect(x - r * 0.55, y - r * 0.5, r * 1.1, r * 1.2, r * 0.3);
  g.fill();
  g.fillStyle = '#a65f28';
  g.beginPath();
  g.roundRect(x - r * 0.4, y + r * 0.05, r * 0.8, r * 0.45, r * 0.12);
  g.fill();
  g.strokeStyle = '#a65f28';
  g.lineWidth = r * 0.14;
  g.beginPath();
  g.arc(x, y - r * 0.5, r * 0.28, Math.PI, 0);
  g.stroke();
  g.fillStyle = '#5fbf5a';
  g.fillRect(x + r * 0.5, y - r * 0.75, r * 0.5, r * 0.15);
  g.fillRect(x + r * 0.675, y - r * 0.925, r * 0.15, r * 0.5);
  g.restore();
}

/** a shoe with a little wing: walk faster */
export function drawShoe(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#7a5a3a';
  g.beginPath();
  g.moveTo(x - r * 0.7, y + r * 0.35);
  g.lineTo(x - r * 0.7, y - r * 0.25);
  g.quadraticCurveTo(x - r * 0.3, y - r * 0.4, x - r * 0.1, y - r * 0.05);
  g.quadraticCurveTo(x + r * 0.7, y + r * 0.02, x + r * 0.75, y + r * 0.35);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#8fb8d8';
  g.lineWidth = r * 0.06;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(x - r * 0.75 - i * r * 0.05, y - r * 0.45 + i * r * 0.18, r * 0.42 - i * r * 0.08, r * 0.1, -0.5, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}

/** a signpost with a heart: more patients find the shelter */
export function drawSign(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#a87c52';
  g.fillRect(x - r * 0.07, y - r * 0.2, r * 0.14, r * 1.0);
  g.fillStyle = '#d9a86c';
  g.beginPath();
  g.moveTo(x - r * 0.7, y - r * 0.75);
  g.lineTo(x + r * 0.55, y - r * 0.75);
  g.lineTo(x + r * 0.85, y - r * 0.45);
  g.lineTo(x + r * 0.55, y - r * 0.15);
  g.lineTo(x - r * 0.7, y - r * 0.15);
  g.closePath();
  g.fill();
  const hx = x - r * 0.05, hy = y - r * 0.47, s = r * 0.2;
  g.fillStyle = '#ff6f91';
  g.beginPath();
  g.moveTo(hx, hy + s);
  g.bezierCurveTo(hx - s * 1.6, hy - s * 0.2, hx - s * 0.6, hy - s * 1.4, hx, hy - s * 0.5);
  g.bezierCurveTo(hx + s * 0.6, hy - s * 1.4, hx + s * 1.6, hy - s * 0.2, hx, hy + s);
  g.fill();
  g.restore();
}

/** a little octopus face: a helper */
export function drawHelper(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#a99bf0';
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(x - r * 0.6 + i * r * 0.3, y + r * 0.45, r * 0.12, r * 0.3, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(x, y - r * 0.05, r * 0.62, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#2a2140';
  for (const dx of [-0.22, 0.22]) {
    g.beginPath();
    g.arc(x + dx * r, y - r * 0.02, r * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#2a2140';
  g.lineWidth = r * 0.06;
  g.beginPath();
  g.arc(x, y + r * 0.12, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.restore();
}

export type SpotIcon = 'cauldron' | 'spring' | 'herbs' | 'backpack' | 'shoes' | 'sign' | 'helper';
export function drawSpotIcon(g: CanvasRenderingContext2D, icon: SpotIcon, x: number, y: number, r: number) {
  ({ cauldron: drawCauldron, spring: drawSpring, herbs: drawHerbs, backpack: drawBackpack, shoes: drawShoe, sign: drawSign, helper: drawHelper })[icon](g, x, y, r);
}

/** speech bubble over a patient: what is wrong, and in a badge what will help */
export function bubbleCanvas(kind: Ailment): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 196;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.strokeStyle = 'rgba(70,100,90,0.35)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(90, 86, 72, 0, Math.PI * 2);
  g.moveTo(72, 150);
  g.lineTo(90, 188);
  g.lineTo(108, 150);
  g.fill();
  drawAilment(g, kind, 84, 90, 48);
  // badge with the medicine
  g.beginPath();
  g.arc(158, 46, 38, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = CURE[kind] === 'pink' ? '#ff5fa8' : CURE[kind] === 'blue' ? '#4fb4ff' : '#59c25a';
  g.stroke();
  drawMedicine(g, CURE[kind], 158, 48, 28);
  return c;
}
