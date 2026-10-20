/** Tiny synthesized sounds, plus the background music (the only audio files, loaded after the first tap). */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem('fable-shelter-muted') === '1'; } catch { /* ignore */ }
  }

  unlock() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** silent for a while without touching the player's own mute setting (an ad is playing) */
  private hushed = false;
  hush(on: boolean) {
    this.hushed = on;
    if (this.master) this.master.gain.value = this.muted || on ? 0 : 1;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m || this.hushed ? 0 : 1;
    try { localStorage.setItem('fable-shelter-muted', m ? '1' : '0'); } catch { /* ignore */ }
  }

  /** background music in two layers, day and night: each a list of tracks playing one after another in a
   *  crossfading loop. setMusicMix shifts from one layer to the other with the time of day; the night layer is only
   *  loaded the first time it is needed. Started once, after the first tap. */
  musicOn = false;
  private musicBus: GainNode[] = [];
  private musicVol = 0.3;
  private nightTracks: string[] = [];
  private nightOn = false;
  private musicMix = 0;
  music(day: string[], night: string[] = [], volume = 0.3) {
    const c = this.ctx;
    if (!c || this.musicOn || !day.length) return;
    this.musicOn = true;
    this.musicVol = volume;
    this.nightTracks = night;
    this.musicBus = [0, 1].map(() => { const g = c.createGain(); g.gain.value = 0; g.connect(this.out); return g; });
    this.playlist(day, this.musicBus[0]);
    this.setMusicMix(this.musicMix, true);
    // quiet while the game is hidden (another tab, phone locked)
    document.addEventListener('visibilitychange', () => { if (document.hidden) void c.suspend(); else void c.resume(); });
  }

  /** 0 day music .. 1 night music */
  setMusicMix(n: number, now = false) {
    if (!now && Math.abs(n - this.musicMix) < 0.01) return;
    this.musicMix = n;
    const [day, night] = this.musicBus;
    if (!day || !this.ctx) return;
    day.gain.value = this.musicVol * (1 - n);
    night.gain.value = this.musicVol * n;
    if (n > 0.02 && !this.nightOn && this.nightTracks.length) { this.nightOn = true; this.playlist(this.nightTracks, night); }
  }

  private playlist(urls: string[], bus: GainNode) {
    const c = this.ctx!;
    const bufs = new Map<string, Promise<AudioBuffer>>();
    const load = (u: string) => {
      if (!bufs.has(u)) bufs.set(u, fetch(u).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b)));
      return bufs.get(u)!;
    };
    const XF = 2.5;
    let i = 0;
    const play = async (at: number) => {
      let buf: AudioBuffer;
      try { buf = await load(urls[i++ % urls.length]); } catch { return; } // no music file: just the sounds
      const t0 = Math.max(at, c.currentTime + 0.05), end = t0 + buf.duration;
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(1, t0 + XF);
      g.gain.setValueAtTime(1, end - XF);
      g.gain.linearRampToValueAtTime(0.0001, end);
      src.connect(g).connect(bus);
      src.start(t0);
      src.stop(end);
      // load the next track early and start it as this one fades out
      void load(urls[i % urls.length]);
      window.setTimeout(() => void play(end - XF), Math.max(0, (end - XF - c.currentTime - 1) * 1000));
    };
    void play(c.currentTime);
  }

  /** everything plays through one master volume so muting is instant */
  private get out(): AudioNode {
    return this.master ?? this.ctx!.destination;
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
    o.connect(g).connect(this.out);
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
      o.connect(g).connect(this.out);
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
    o.connect(g).connect(this.out);
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
  /** a tiny wolf howl: up, hold, down */
  howl() {
    this.tone(420, 760, 0.25, 0.07, 'sine');
    this.tone(760, 520, 0.45, 0.06, 'sine', 0.25);
  }
  /** shrinking and popping back */
  squeak() {
    this.tone(1200, 1800, 0.08, 0.06, 'sine');
    this.tone(400, 300, 0.1, 0.06, 'triangle', 0.35);
  }
}
