/** Tiny synthesized sounds, no audio files to download. */
export class Sfx {
  private ctx: AudioContext | null = null;

  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  boing() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(260, t);
    o.frequency.exponentialRampToValueAtTime(620, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.4);
  }

  drizzle() {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime;
    for (let i = 0; i < 9; i++) {
      const t = t0 + 0.12 + i * 0.17 + Math.random() * 0.08;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      const f = 900 + Math.random() * 700;
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 0.08);
    }
  }

  /** one short tone with a pitch glide; the building block for the little game sounds */
  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0) {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** a potion lands on the keeper's stack */
  pop(n = 0) {
    this.tone(520 + n * 60, 900 + n * 80, 0.09, 0.12, 'triangle');
  }

  /** a patient is cured: rising three-note chime */
  heal() {
    [660, 830, 990, 1320].forEach((f, i) => this.tone(f, f * 1.01, 0.32, 0.12, 'sine', i * 0.09));
  }

  /** a coin is picked up */
  coin(n = 0) {
    const f = 1250 + (n % 5) * 90;
    this.tone(f, f, 0.05, 0.07, 'square');
    this.tone(f * 1.5, f * 1.5, 0.12, 0.06, 'square', 0.05);
  }

  /** a coin goes into a build spot */
  pay() {
    this.tone(900, 700, 0.05, 0.05, 'triangle');
  }

  /** something new appears */
  build() {
    this.tone(220, 880, 0.35, 0.15, 'triangle');
    [880, 1100, 1320].forEach((f, i) => this.tone(f, f, 0.2, 0.08, 'sine', 0.3 + i * 0.07));
  }

  /** sick sounds: a sneeze, a hiccup, a shiver */
  sneeze() {
    this.tone(700, 300, 0.18, 0.08, 'sawtooth');
  }
  hiccup() {
    this.tone(500, 1000, 0.07, 0.1, 'sine');
  }
  shiver() {
    for (let i = 0; i < 4; i++) this.tone(320, 300, 0.05, 0.04, 'triangle', i * 0.06);
  }
}
