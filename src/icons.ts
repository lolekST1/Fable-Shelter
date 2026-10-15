/** Small hand-drawn canvas icons, so nothing in the game depends on text or emoji fonts. */

export type Ailment = 'snow' | 'smoke' | 'sparks' | 'spores' | 'feathers' | 'bubbles' | 'confetti' | 'stone' | 'crown' | 'fountain' | 'drip' | 'flicker' | 'leaves' | 'shrink' | 'howl' | 'dizzy' | 'snowball' | 'nose' | 'melt' | 'slide';

/** a musical note (for howling) */
function note(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.beginPath();
  g.ellipse(x, y, r * 0.32, r * 0.24, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillRect(x + r * 0.22, y - r * 1.1, r * 0.12, r * 1.1);
  g.beginPath();
  g.moveTo(x + r * 0.34, y - r * 1.1);
  g.quadraticCurveTo(x + r * 0.8, y - r * 0.8, x + r * 0.62, y - r * 0.45);
  g.lineWidth = r * 0.12;
  g.stroke();
}

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
  } else if (kind === 'smoke') {
    // a flame gone out: grey puffs above a little dark wick
    g.fillStyle = '#9aa0a8';
    for (const [dx, dy, s2] of [[-0.25, 0.1, 0.38], [0.2, -0.1, 0.42], [-0.05, -0.5, 0.32]]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, s2 * r, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ff9a3d';
    g.beginPath();
    g.ellipse(x, y + r * 0.62, r * 0.14, r * 0.24, 0, 0, Math.PI * 2);
    g.globalAlpha = 0.5;
    g.fill();
    g.globalAlpha = 1;
  } else if (kind === 'spores') {
    g.fillStyle = '#e8c84a';
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4, rr = r * (0.2 + (i % 3) * 0.25);
      g.beginPath();
      g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * (0.12 + (i % 2) * 0.06), 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#c9a42a';
    g.beginPath();
    g.arc(x, y, r * 0.16, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'feathers') {
    for (const [dx, a] of [[-0.3, -0.5], [0.3, 0.45]] as [number, number][]) {
      g.save();
      g.translate(x + dx * r, y);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, r * 0.75);
      g.quadraticCurveTo(r * 0.42, 0, 0, -r * 0.75);
      g.quadraticCurveTo(-r * 0.42, 0, 0, r * 0.75);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = r * 0.07;
      g.strokeStyle = '#b9a58a';
      g.stroke();
      g.beginPath();
      g.moveTo(0, r * 0.85);
      g.lineTo(0, -r * 0.6);
      g.stroke();
      g.restore();
    }
  } else if (kind === 'confetti') {
    const cols = ['#ff6f91', '#ffd34d', '#59c25a', '#4fb4ff', '#a99bf0'];
    for (let i = 0; i < 5; i++) {
      g.strokeStyle = cols[i];
      g.lineWidth = r * 0.13;
      g.beginPath();
      g.arc(x, y + r * 0.45, r * (0.85 - i * 0.14), Math.PI, 0);
      g.stroke();
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = cols[i % 5];
      g.fillRect(x - r * 0.7 + i * r * 0.28, y + r * 0.55 + (i % 2) * r * 0.18, r * 0.14, r * 0.14);
    }
  } else if (kind === 'crown') {
    // a wobbly golden crown with a sneeze burst
    g.fillStyle = '#ffc93d';
    g.beginPath();
    g.moveTo(x - r * 0.7, y + r * 0.45);
    g.lineTo(x - r * 0.7, y - r * 0.3);
    g.lineTo(x - r * 0.35, y + r * 0.05);
    g.lineTo(x, y - r * 0.55);
    g.lineTo(x + r * 0.35, y + r * 0.05);
    g.lineTo(x + r * 0.7, y - r * 0.3);
    g.lineTo(x + r * 0.7, y + r * 0.45);
    g.closePath();
    g.fill();
    g.strokeStyle = '#d99a12';
    g.lineWidth = r * 0.08;
    g.stroke();
    g.fillStyle = '#ff6f91';
    g.beginPath();
    g.arc(x, y + r * 0.2, r * 0.12, 0, Math.PI * 2);
    g.fill();
    star(g, x + r * 0.75, y - r * 0.7, r * 0.22, 4, 0.4);
    g.fillStyle = '#ffe066';
    g.fill();
  } else if (kind === 'fountain') {
    // water shooting up and falling over
    g.strokeStyle = '#4fb4ff';
    g.lineWidth = r * 0.16;
    for (const s2 of [-1, 1]) {
      g.beginPath();
      g.moveTo(x, y + r * 0.55);
      g.quadraticCurveTo(x + s2 * r * 0.1, y - r * 0.9, x + s2 * r * 0.7, y + r * 0.2);
      g.stroke();
    }
    g.fillStyle = '#9ad6ff';
    for (const [dx, dy] of [[-0.75, 0.45], [0.75, 0.45], [0, -0.75]]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, r * 0.12, 0, Math.PI * 2);
      g.fill();
    }
  } else if (kind === 'drip') {
    // a lily-pad hat dripping water
    g.fillStyle = '#59c25a';
    g.beginPath();
    g.ellipse(x, y - r * 0.35, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#4fb4ff';
    for (const [dx, dy, s2] of [[-0.45, 0.2, 0.16], [0.1, 0.45, 0.2], [0.55, 0.15, 0.14]]) {
      g.beginPath();
      g.moveTo(x + dx * r, y + (dy - s2 * 1.6) * r);
      g.arc(x + dx * r, y + dy * r, s2 * r, -0.3, Math.PI + 0.3, false);
      g.closePath();
      g.fill();
    }
  } else if (kind === 'flicker') {
    // a light bulb with a zig-zag: the glow keeps cutting out
    g.fillStyle = '#fff3b0';
    g.beginPath();
    g.arc(x, y - r * 0.12, r * 0.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#9aa0a8';
    g.fillRect(x - r * 0.22, y + r * 0.32, r * 0.44, r * 0.3);
    g.strokeStyle = '#e8a83a';
    g.lineWidth = r * 0.1;
    g.beginPath();
    g.moveTo(x - r * 0.25, y - r * 0.2);
    g.lineTo(x - r * 0.05, y - r * 0.02);
    g.lineTo(x + r * 0.05, y - r * 0.28);
    g.lineTo(x + r * 0.25, y - r * 0.08);
    g.stroke();
    g.strokeStyle = '#ffd34d';
    g.lineWidth = r * 0.08;
    for (const a of [-2.4, -1.57, -0.74]) {
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r * 0.65, y - r * 0.12 + Math.sin(a) * r * 0.65);
      g.lineTo(x + Math.cos(a) * r * 0.85, y - r * 0.12 + Math.sin(a) * r * 0.85);
      g.stroke();
    }
  } else if (kind === 'stone') {
    g.fillStyle = '#9aa3ad';
    g.beginPath();
    g.moveTo(x - r * 0.75, y + r * 0.45);
    g.lineTo(x - r * 0.55, y - r * 0.3);
    g.lineTo(x - r * 0.05, y - r * 0.62);
    g.lineTo(x + r * 0.6, y - r * 0.35);
    g.lineTo(x + r * 0.78, y + r * 0.45);
    g.closePath();
    g.fill();
    g.strokeStyle = '#6f7880';
    g.lineWidth = r * 0.08;
    g.stroke();
    g.beginPath();
    g.moveTo(x - r * 0.1, y - r * 0.3);
    g.lineTo(x + r * 0.05, y + r * 0.05);
    g.lineTo(x - r * 0.15, y + r * 0.3);
    g.stroke();
  } else if (kind === 'leaves') {
    // shedding autumn leaves
    for (const [dx, dy, a, col] of [[-0.3, -0.25, -0.6, '#ff9a3d'], [0.3, 0.2, 0.7, '#ffcf4d'], [-0.15, 0.55, 0.2, '#e8643a']] as [number, number, number, string][]) {
      g.save();
      g.translate(x + dx * r, y + dy * r);
      g.rotate(a);
      g.beginPath();
      g.moveTo(0, r * 0.38);
      g.quadraticCurveTo(r * 0.36, 0, 0, -r * 0.42);
      g.quadraticCurveTo(-r * 0.36, 0, 0, r * 0.38);
      g.fillStyle = col;
      g.fill();
      g.strokeStyle = '#a0522d';
      g.lineWidth = r * 0.06;
      g.beginPath();
      g.moveTo(0, r * 0.36);
      g.lineTo(0, -r * 0.3);
      g.stroke();
      g.restore();
    }
  } else if (kind === 'shrink') {
    // shrinking: two arrows squeezing a little dot
    g.fillStyle = '#7fd36a';
    g.beginPath();
    g.arc(x, y, r * 0.2, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#3c8f4a';
    g.lineWidth = r * 0.16;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + s * r * 0.9, y - s * r * 0.9);
      g.lineTo(x + s * r * 0.38, y - s * r * 0.38);
      g.stroke();
      g.beginPath();
      g.moveTo(x + s * r * 0.38, y - s * r * 0.72);
      g.lineTo(x + s * r * 0.38, y - s * r * 0.38);
      g.lineTo(x + s * r * 0.72, y - s * r * 0.38);
      g.stroke();
    }
  } else if (kind === 'howl') {
    // howling at the moon: a crescent and two notes
    g.fillStyle = '#ffe58a';
    g.beginPath();
    g.arc(x - r * 0.25, y - r * 0.2, r * 0.55, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(x - r * 0.02, y - r * 0.38, r * 0.45, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#6a5acd';
    g.strokeStyle = '#6a5acd';
    note(g, x + r * 0.25, y + r * 0.75, r * 0.55);
    note(g, x + r * 0.62, y + r * 0.25, r * 0.4);
  } else if (kind === 'dizzy') {
    // dizzy: a spiral with little stars
    g.strokeStyle = '#8a6cff';
    g.lineWidth = r * 0.12;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.42, rr = r * 0.06 + i * r * 0.017;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.stroke();
    g.fillStyle = '#ffd34d';
    for (const [dx, dy] of [[-0.75, -0.6], [0.78, -0.4]]) {
      star(g, x + dx * r, y + dy * r, r * 0.22, 5, 0.45);
      g.fill();
    }
  } else if (kind === 'snowball') {
    // hiccups snowballs: three white balls flying up
    for (const [dx, dy, s] of [[-0.35, 0.35, 0.42], [0.35, -0.05, 0.32], [-0.05, -0.6, 0.24]]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, s * r, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = r * 0.08;
      g.strokeStyle = '#8fc4f0';
      g.stroke();
    }
  } else if (kind === 'nose') {
    // a nose blinking red like a lamp
    g.strokeStyle = '#ffd34d';
    g.lineWidth = r * 0.1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
      g.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
      g.stroke();
    }
    g.beginPath();
    g.arc(x, y, r * 0.48, 0, Math.PI * 2);
    g.fillStyle = '#ff3b3b';
    g.fill();
    g.beginPath();
    g.arc(x - r * 0.15, y - r * 0.16, r * 0.13, 0, Math.PI * 2);
    g.fillStyle = '#ffd0d0';
    g.fill();
  } else if (kind === 'melt') {
    // melting: a snowball sagging into a puddle with drips
    g.fillStyle = '#8fd0ff';
    g.beginPath();
    g.ellipse(x, y + r * 0.62, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(x - r * 0.55, y + r * 0.55);
    g.quadraticCurveTo(x - r * 0.6, y - r * 0.55, x, y - r * 0.55);
    g.quadraticCurveTo(x + r * 0.6, y - r * 0.55, x + r * 0.55, y + r * 0.55);
    g.closePath();
    g.fill();
    g.lineWidth = r * 0.07;
    g.strokeStyle = '#8fc4f0';
    g.stroke();
    g.fillStyle = '#4fb4ff';
    for (const [dx, dy] of [[-0.75, 0.05], [0.78, -0.15]]) {
      g.beginPath();
      g.arc(x + dx * r, y + dy * r, r * 0.11, 0, Math.PI * 2);
      g.moveTo(x + dx * r - r * 0.1, y + dy * r);
      g.lineTo(x + dx * r, y + dy * r - r * 0.25);
      g.lineTo(x + dx * r + r * 0.1, y + dy * r);
      g.fill();
    }
  } else if (kind === 'slide') {
    // slipping round and round: a curved arrow on ice
    g.fillStyle = '#d6ecff';
    g.beginPath();
    g.ellipse(x, y + r * 0.55, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#4a8ad8';
    g.lineWidth = r * 0.16;
    g.beginPath();
    g.arc(x, y - r * 0.05, r * 0.55, -Math.PI * 0.1, Math.PI * 1.45);
    g.stroke();
    const a = -Math.PI * 0.1, ax = x + Math.cos(a) * r * 0.55, ay = y - r * 0.05 + Math.sin(a) * r * 0.55;
    g.fillStyle = '#4a8ad8';
    g.beginPath();
    g.moveTo(ax + r * 0.25, ay + r * 0.05);
    g.lineTo(ax - r * 0.2, ay - r * 0.12);
    g.lineTo(ax + r * 0.02, ay + r * 0.32);
    g.fill();
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

/** things the keeper can carry: three medicines and berries for the residents */
export type Medicine = 'pink' | 'blue' | 'green' | 'berry' | 'purple' | 'gold' | 'cocoa';

/** hot cocoa: a mug with steam and a marshmallow */
export function drawCocoa(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = r * 0.1;
  g.lineCap = 'round';
  for (const dx of [-0.2, 0.15]) {
    g.beginPath();
    g.moveTo(x + dx * r, y - r * 0.45);
    g.quadraticCurveTo(x + dx * r - r * 0.15, y - r * 0.65, x + dx * r, y - r * 0.85);
    g.stroke();
  }
  g.lineWidth = r * 0.12;
  g.strokeStyle = '#e8dcc8';
  g.beginPath();
  g.arc(x + r * 0.5, y + r * 0.1, r * 0.22, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  g.fillStyle = '#f2ead8';
  g.beginPath();
  g.roundRect(x - r * 0.5, y - r * 0.35, r * 0.95, r * 0.95, r * 0.18);
  g.fill();
  g.fillStyle = '#e8435a';
  g.fillRect(x - r * 0.5, y + r * 0.1, r * 0.95, r * 0.14);
  g.fillStyle = '#8a4f2a';
  g.beginPath();
  g.ellipse(x - r * 0.03, y - r * 0.33, r * 0.42, r * 0.1, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.fillRect(x - r * 0.12, y - r * 0.45, r * 0.2, r * 0.14);
  g.restore();
}

/** golden honey: a little jar with a drip */
export function drawHoney(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#f5b301';
  g.beginPath();
  g.roundRect(x - r * 0.55, y - r * 0.35, r * 1.1, r * 0.95, r * 0.25);
  g.fill();
  g.strokeStyle = '#b97a00';
  g.lineWidth = r * 0.08;
  g.stroke();
  g.fillStyle = '#c98a4a';
  g.fillRect(x - r * 0.62, y - r * 0.6, r * 1.24, r * 0.28);
  g.fillStyle = '#f5b301';
  g.beginPath();
  g.moveTo(x - r * 0.1, y - r * 0.35);
  g.quadraticCurveTo(x, y + r * 0.1, x + r * 0.1, y - r * 0.35);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.6)';
  g.beginPath();
  g.ellipse(x - r * 0.3, y, r * 0.08, r * 0.2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** berries: food for the residents */
export function drawBerry(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  for (const [dx, dy] of [[-0.28, 0.18], [0.28, 0.18], [0, -0.22]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, r * 0.36, 0, Math.PI * 2);
    g.fillStyle = '#e8435a';
    g.fill();
    g.beginPath();
    g.arc(x + dx * r - r * 0.12, y + dy * r - r * 0.12, r * 0.09, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
  }
  g.fillStyle = '#59c25a';
  g.beginPath();
  g.ellipse(x + r * 0.18, y - r * 0.62, r * 0.28, r * 0.12, -0.5, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** a crescent moon with little z's: sleepy */
export function drawMoon(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.beginPath();
  g.arc(x - r * 0.1, y + r * 0.1, r * 0.62, 0, Math.PI * 2);
  g.fillStyle = '#ffd34d';
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(x + r * 0.18, y - r * 0.12, r * 0.52, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#6f7bd8';
  g.lineWidth = r * 0.1;
  g.lineJoin = 'round';
  for (const [zx, zy, zs] of [[0.45, -0.25, 0.3], [0.72, -0.72, 0.2]]) {
    const s = zs * r, px = x + zx * r, py = y + zy * r;
    g.beginPath();
    g.moveTo(px - s, py - s);
    g.lineTo(px + s, py - s);
    g.lineTo(px - s, py + s);
    g.lineTo(px + s, py + s);
    g.stroke();
  }
  g.restore();
}

/** a round cushion bed */
export function drawBed(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#c98fd6';
  g.beginPath();
  g.ellipse(x, y + r * 0.2, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f3dcf7';
  g.beginPath();
  g.ellipse(x, y + r * 0.12, r * 0.62, r * 0.3, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - r * 0.25, y - r * 0.05, r * 0.3, r * 0.16, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export function drawHeart(g: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string) {
  g.beginPath();
  g.moveTo(x, y + s);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.4, x, y - s * 0.5);
  g.bezierCurveTo(x + s * 0.6, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s);
  g.fillStyle = fill;
  g.fill();
}

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
  else if (m === 'green') drawLeaf(g, x, y, r);
  else if (m === 'purple') drawVial(g, x, y, r, '#a46cff');
  else if (m === 'gold') drawHoney(g, x, y, r);
  else if (m === 'cocoa') drawCocoa(g, x, y, r);
  else drawBerry(g, x, y, r);
}
export const MED_COLOR: Record<Medicine, string> = { pink: '#ff5fa8', blue: '#4fb4ff', green: '#59c25a', berry: '#e8435a', purple: '#a46cff', gold: '#f5b301', cocoa: '#9a5b34' };

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

/** wooden footbridge */
export function drawBridge(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.strokeStyle = '#a87c52';
  g.lineWidth = r * 0.18;
  g.beginPath();
  g.arc(x, y + r * 0.9, r * 0.95, Math.PI * 1.15, Math.PI * 1.85);
  g.stroke();
  g.lineWidth = r * 0.08;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(x + i * r * 0.32, y + r * 0.9 - Math.sqrt(Math.max(0, 0.9 - (i * 0.32) ** 2)) * r * 0.95);
    g.lineTo(x + i * r * 0.32, y + r * 0.35 - Math.sqrt(Math.max(0, 0.9 - (i * 0.32) ** 2)) * r * 0.6);
    g.stroke();
  }
  g.fillStyle = '#4fb4ff';
  g.fillRect(x - r * 0.95, y + r * 0.55, r * 1.9, r * 0.22);
  g.restore();
}

/** a water lily with glowing nectar */
export function drawLily(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#59c25a';
  g.beginPath();
  g.ellipse(x, y + r * 0.35, r * 0.9, r * 0.32, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c9a2ff';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.45;
    g.save();
    g.translate(x, y + r * 0.2);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.ellipse(0, -r * 0.42, r * 0.17, r * 0.42, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.fillStyle = '#a46cff';
  g.beginPath();
  g.arc(x, y + r * 0.1, r * 0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** a lily-pad bed */
export function drawLilyBed(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#59c25a';
  g.beginPath();
  g.ellipse(x, y + r * 0.2, r * 0.9, r * 0.5, 0, 0.15, Math.PI * 2 - 0.15);
  g.lineTo(x, y + r * 0.2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - r * 0.2, y + r * 0.05, r * 0.32, r * 0.16, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** a little glowing lantern: more patients find the pond */
export function drawLantern(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#a87c52';
  g.fillRect(x - r * 0.06, y - r * 0.2, r * 0.12, r * 1.0);
  g.fillStyle = '#fff3b0';
  g.beginPath();
  g.roundRect(x - r * 0.32, y - r * 0.8, r * 0.64, r * 0.62, r * 0.12);
  g.fill();
  g.strokeStyle = '#7a5a3a';
  g.lineWidth = r * 0.08;
  g.stroke();
  g.restore();
}

/** a wooden arch gate in the hedge: the heather glade opens */
export function drawGate(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#4f9e45';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(x + s * r * 0.72, y + r * 0.3, r * 0.32, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#a87c52';
  g.lineWidth = r * 0.16;
  g.beginPath();
  g.moveTo(x - r * 0.4, y + r * 0.7);
  g.lineTo(x - r * 0.4, y - r * 0.2);
  g.arc(x, y - r * 0.2, r * 0.4, Math.PI, 0);
  g.lineTo(x + r * 0.4, y + r * 0.7);
  g.stroke();
  g.fillStyle = '#c084e8';
  for (const [dx, dy] of [[-0.25, -0.55], [0.15, -0.65], [0.35, -0.35]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, r * 0.09, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** a round moss bed */
export function drawMossBed(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#6aa84f';
  g.beginPath();
  g.ellipse(x, y + r * 0.25, r * 0.88, r * 0.45, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#8fcf6a';
  g.beginPath();
  g.ellipse(x, y + r * 0.15, r * 0.6, r * 0.27, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - r * 0.15, y + r * 0.05, r * 0.28, r * 0.13, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** a glowing mushroom lamp: more patients find the glade */
export function drawMushroom(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#fff3d6';
  g.fillRect(x - r * 0.14, y - r * 0.1, r * 0.28, r * 0.8);
  g.fillStyle = '#ff7a59';
  g.beginPath();
  g.ellipse(x, y - r * 0.15, r * 0.7, r * 0.5, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#fff9c4';
  for (const [dx, dy] of [[-0.35, -0.35], [0.1, -0.5], [0.4, -0.28]]) {
    g.beginPath();
    g.arc(x + dx * r, y + dy * r, r * 0.09, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** the keeper's apprentice in a sun hat: hire a helper for this area */
export function drawHelper(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#8fc9e8';
  g.beginPath();
  g.ellipse(x, y + r * 0.55, r * 0.42, r * 0.38, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#ffd9b8';
  g.beginPath();
  g.arc(x, y + r * 0.02, r * 0.34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f2d39b';
  g.beginPath();
  g.ellipse(x, y - r * 0.22, r * 0.62, r * 0.16, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(x, y - r * 0.32, r * 0.34, r * 0.24, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#3a2a20';
  for (const dx of [-0.13, 0.13]) {
    g.beginPath();
    g.arc(x + dx * r, y + r * 0.05, r * 0.05, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/** a shovel stuck in a snowdrift: dig through to the snowy hill */
export function drawShovel(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x, y + r * 0.5, r * 0.9, r * 0.38, 0, Math.PI, 0);
  g.fill();
  g.strokeStyle = '#a87c52';
  g.lineWidth = r * 0.14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x + r * 0.15, y + r * 0.2);
  g.lineTo(x + r * 0.45, y - r * 0.7);
  g.stroke();
  g.beginPath();
  g.moveTo(x + r * 0.28, y - r * 0.75);
  g.lineTo(x + r * 0.62, y - r * 0.65);
  g.stroke();
  g.fillStyle = '#e8435a';
  g.beginPath();
  g.moveTo(x - r * 0.1, y + r * 0.1);
  g.lineTo(x + r * 0.32, y + r * 0.24);
  g.lineTo(x + r * 0.12, y + r * 0.62);
  g.lineTo(x - r * 0.28, y + r * 0.45);
  g.closePath();
  g.fill();
  g.restore();
}

/** a warm knitted blanket nest for the snowy hill residents */
export function drawSnowBed(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.fillStyle = '#e8435a';
  g.beginPath();
  g.ellipse(x, y + r * 0.25, r * 0.88, r * 0.45, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x, y + r * 0.25, r * 0.7, r * 0.33, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f2d39b';
  g.beginPath();
  g.ellipse(x, y + r * 0.18, r * 0.55, r * 0.24, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - r * 0.15, y + r * 0.08, r * 0.26, r * 0.12, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

/** a bonfire: more patients find their way up the snowy hill */
export function drawBonfire(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.save();
  g.strokeStyle = '#8a5a32';
  g.lineWidth = r * 0.18;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(x - s * r * 0.65, y + r * 0.7);
    g.lineTo(x + s * r * 0.55, y + r * 0.35);
    g.stroke();
  }
  g.fillStyle = '#ff7a2a';
  g.beginPath();
  g.moveTo(x - r * 0.45, y + r * 0.45);
  g.quadraticCurveTo(x - r * 0.55, y - r * 0.2, x - r * 0.1, y - r * 0.8);
  g.quadraticCurveTo(x, y - r * 0.3, x + r * 0.2, y - r * 0.55);
  g.quadraticCurveTo(x + r * 0.6, y - r * 0.1, x + r * 0.45, y + r * 0.45);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffd34d';
  g.beginPath();
  g.ellipse(x, y + r * 0.2, r * 0.22, r * 0.32, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

export type SpotIcon = 'cauldron' | 'spring' | 'herbs' | 'backpack' | 'shoes' | 'sign' | 'bed' | 'berry' | 'bridge' | 'lily' | 'lilybed' | 'lantern' | 'gate' | 'mossbed' | 'mushroom' | 'helper' | 'shovel' | 'snowbed' | 'bonfire';
export function drawSpotIcon(g: CanvasRenderingContext2D, icon: SpotIcon, x: number, y: number, r: number) {
  ({ cauldron: drawCauldron, spring: drawSpring, herbs: drawHerbs, backpack: drawBackpack, shoes: drawShoe, sign: drawSign, bed: drawBed, berry: drawBerry, bridge: drawBridge, lily: drawLily, lilybed: drawLilyBed, lantern: drawLantern, gate: drawGate, mossbed: drawMossBed, mushroom: drawMushroom, helper: drawHelper, shovel: drawShovel, snowbed: drawSnowBed, bonfire: drawBonfire })[icon](g, x, y, r);
}

function bubbleBase(g: CanvasRenderingContext2D) {
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(90, 86, 72, 0, Math.PI * 2);
  g.moveTo(72, 150);
  g.lineTo(90, 188);
  g.lineTo(108, 150);
  g.fill();
}

/** speech bubble over a patient: what is wrong, and in a badge what will help */
export function bubbleCanvas(kind: Ailment, cure: Medicine): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 196;
  const g = c.getContext('2d')!;
  bubbleBase(g);
  drawAilment(g, kind, 84, 90, 48);
  g.beginPath();
  g.arc(158, 46, 38, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = MED_COLOR[cure];
  g.stroke();
  drawMedicine(g, cure, 158, 48, 28);
  return c;
}

/** bubble over a resident: what it needs now, with its heart progress below */
export function needCanvas(c: HTMLCanvasElement, need: 'food' | 'sleep' | null, hearts: number, max: number) {
  c.width = 200;
  c.height = 240;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 200, 240);
  if (need) {
    bubbleBase(g);
    if (need === 'food') drawBerry(g, 90, 88, 52);
    else drawMoon(g, 90, 90, 56);
  }
  // heart row
  const w = 34, x0 = 100 - ((max - 1) * w) / 2;
  for (let i = 0; i < max; i++) drawHeart(g, x0 + i * w, 216, 12, i < hearts ? '#ff5f86' : 'rgba(255,255,255,0.75)');
}
