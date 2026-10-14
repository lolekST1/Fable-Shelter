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

export function drawVial(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  const cy = y + r * 0.3, br = r * 0.5;
  // glass: round flask with a neck
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.fillRect(x - r * 0.17, y - r * 0.72, r * 0.34, r * 0.62);
  g.beginPath();
  g.arc(x, cy, br, 0, Math.PI * 2);
  g.fill();
  // pink potion in the lower part of the flask
  g.save();
  g.beginPath();
  g.rect(x - r, cy - br * 0.25, r * 2, r * 2);
  g.clip();
  g.beginPath();
  g.arc(x, cy, br * 0.84, 0, Math.PI * 2);
  g.fillStyle = '#ff5fa8';
  g.fill();
  g.restore();
  // cork and outline
  g.fillStyle = '#b07a4a';
  g.fillRect(x - r * 0.21, y - r * 0.92, r * 0.42, r * 0.24);
  g.lineWidth = r * 0.09;
  g.strokeStyle = '#5b7f73';
  g.beginPath();
  g.arc(x, cy, br, 0, Math.PI * 2);
  g.stroke();
  g.restore();
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

/** a stack of potions with a plus: carry more */
export function drawStack(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  for (let i = 0; i < 3; i++) drawVial(g, x - r * 0.25, y + r * 0.55 - i * r * 0.5, r * 0.42);
  g.save();
  g.fillStyle = '#5fbf5a';
  g.fillRect(x + r * 0.3, y - r * 0.08, r * 0.56, r * 0.16);
  g.fillRect(x + r * 0.5, y - r * 0.28, r * 0.16, r * 0.56);
  g.restore();
}

/** speech-bubble texture showing what is wrong with a patient */
export function bubbleCanvas(kind: Ailment): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 184;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.strokeStyle = 'rgba(70,100,90,0.35)';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(80, 80, 70, 0, Math.PI * 2);
  g.moveTo(62, 145);
  g.lineTo(80, 178);
  g.lineTo(98, 145);
  g.fill();
  g.beginPath();
  g.arc(80, 80, 70, 0.62 * Math.PI, 0.38 * Math.PI + 2 * Math.PI);
  g.stroke();
  drawAilment(g, kind, 80, 82, 50);
  return c;
}
