/**
 * Boosters for a rewarded video (see platform.ts): the player chooses to watch an ad for a short help with what
 * really slows the game down: coins for the next purchase, plumping beds and saying goodbye.
 * Poki rules followed here: the plain choice is always shown next to the ad one and is at least as big; the ad
 * button is not green and carries the 🎬 sign; no timers until the next ad, no nagging (the player opens the menu).
 */
import { drawCoin } from './icons';

export type Booster = 'gold' | 'volunteer';
export const BOOST_TIME = 180; // seconds a booster lasts

const css = `
  #boostBtn { position: fixed; right: calc(14px + env(safe-area-inset-right)); top: calc(126px + env(safe-area-inset-top)); width: 48px; height: 48px;
    border: 0; border-radius: 50%; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2); display: none; place-items: center; padding: 0; }
  #boostBtn.on { display: grid; }
  #boostBtn .t { position: absolute; left: 50%; bottom: -14px; transform: translateX(-50%); padding: 1px 6px; border-radius: 9px; background: #ffc21a;
    font: 800 11px system-ui, sans-serif; color: #5b4a1a; display: none; white-space: nowrap; }
  #boostBtn .t.on { display: block; }
  #boost { position: fixed; inset: 0; z-index: 30; display: none; place-items: center; background: rgba(40,70,60,.5); padding: 16px; }
  #boost.on { display: grid; }
  #boost .card { box-sizing: border-box; width: min(360px, 100%); padding: 16px; border-radius: 24px; background: #fff8ec; text-align: center;
    font: 700 15px system-ui, sans-serif; color: #6a5a3a; box-shadow: 0 8px 30px rgba(40,70,60,.35); }
  #boost h2 { margin: 0 0 10px; font: 800 20px system-ui, sans-serif; color: #7a4a2a; }
  #boost .offer { display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 8px; border-radius: 16px; background: #f4ecdc; text-align: left; }
  #boost .offer canvas { flex: none; width: 48px; height: 48px; }
  #boost .offer span { flex: 1; min-width: 0; }
  #boost .offer.off { opacity: .5; }
  #boost button { border: 0; border-radius: 14px; font: 800 15px system-ui, sans-serif; padding: 12px 10px; }
  #boost .ad { flex: none; background: #9a6cf0; color: #fff; }
  #boost .plain { display: block; width: 100%; margin-top: 10px; padding: 16px; background: #ffc21a; color: #5b4a1a; font-size: 17px; }`;

function icon(draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  draw(c.getContext('2d')!);
  return c;
}
/** a coin with ×2 */
const goldIcon = () => icon((g) => {
  drawCoin(g, 40, 48, 32);
  g.fillStyle = '#c0583e';
  g.font = '900 30px system-ui, sans-serif';
  g.fillText('×2', 56, 84);
});
/** a little helper with a heart */
const volunteerIcon = () => icon((g) => {
  g.fillStyle = '#8fd0ff';
  g.beginPath(); g.arc(48, 34, 18, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(48, 74, 24, 20, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#ff5f86';
  g.beginPath(); g.moveTo(78, 30); g.bezierCurveTo(62, 18, 70, 6, 78, 16); g.bezierCurveTo(86, 6, 94, 18, 78, 30); g.fill();
});

export class Boosters {
  private btn: HTMLButtonElement;
  private timer: HTMLDivElement;
  private panel: HTMLDivElement;
  private body: HTMLDivElement;
  /** game time when each booster runs out */
  until: Record<Booster, number> = { gold: 0, volunteer: 0 };

  constructor(
    /** play the ad; resolves true when the reward is earned */
    private watch: () => Promise<boolean>,
    /** give the booster (start it in the game) */
    private grant: (b: Booster) => void,
    private now: () => number,
    private onToggle: (open: boolean) => void,
  ) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    this.btn = document.createElement('button');
    this.btn.id = 'boostBtn';
    this.btn.innerHTML = '<span style="font-size:26px;line-height:1">🎬</span>';
    this.timer = document.createElement('div');
    this.timer.className = 't';
    this.btn.appendChild(this.timer);
    this.btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.btn.addEventListener('click', () => this.open());
    document.body.appendChild(this.btn);
    this.panel = document.createElement('div');
    this.panel.id = 'boost';
    this.panel.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === this.panel) this.close(); });
    this.body = document.createElement('div');
    this.body.className = 'card';
    this.panel.appendChild(this.body);
    document.body.appendChild(this.panel);
  }

  /** the button shows once the tutorial is over and ads can be offered */
  show(on: boolean) { this.btn.classList.toggle('on', on); }

  active(b: Booster) { return this.now() < this.until[b]; }

  /** the time left of the running booster(s) under the button */
  tick() {
    const left = Math.max(this.until.gold, this.until.volunteer) - this.now();
    this.timer.classList.toggle('on', left > 0);
    if (left > 0) this.timer.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  }

  private open() {
    this.body.innerHTML = '<h2>Pomoc dla schroniska</h2>';
    const offer = (b: Booster, img: HTMLCanvasElement, text: string) => {
      const row = document.createElement('div');
      row.className = 'offer' + (this.active(b) ? ' off' : '');
      const label = document.createElement('span');
      label.textContent = text;
      const ad = document.createElement('button');
      ad.className = 'ad';
      ad.textContent = '🎬 Obejrzyj';
      ad.disabled = this.active(b);
      ad.addEventListener('click', async () => {
        ad.disabled = true; // one video per reward
        const ok = await this.watch();
        this.close();
        if (ok) { this.until[b] = this.now() + BOOST_TIME; this.grant(b); }
      });
      row.append(img, label, ad);
      this.body.appendChild(row);
    };
    offer('gold', goldIcon(), 'Monety ×2 przez 3 minuty');
    offer('volunteer', volunteerIcon(), 'Ochotnik ściele łóżka i karmi przez 3 minuty');
    const plain = document.createElement('button');
    plain.className = 'plain';
    plain.textContent = 'Nie, dziękuję';
    plain.addEventListener('click', () => this.close());
    this.body.appendChild(plain);
    this.panel.classList.add('on');
    this.onToggle(true);
  }

  /** what closing without a choice means (the chest card: just take the coins) */
  private dismiss?: () => void;

  private close() {
    if (!this.panel.classList.contains('on')) return;
    this.panel.classList.remove('on');
    const d = this.dismiss;
    this.dismiss = undefined;
    d?.();
    this.onToggle(false);
  }

  /** the offline chest: take the coins, or watch an ad for twice as many. Resolves with the multiplier. */
  chest(coins: number): Promise<1 | 2> {
    return new Promise((done) => {
      this.body.innerHTML = '<h2>Skrzynka z monetami</h2>';
      const row = document.createElement('div');
      row.className = 'offer';
      const label = document.createElement('span');
      label.textContent = `${coins} → ${coins * 2}`;
      const ad = document.createElement('button');
      ad.className = 'ad';
      ad.textContent = '🎬 ×2';
      row.append(goldIcon(), label, ad);
      const plain = document.createElement('button');
      plain.className = 'plain';
      plain.textContent = 'Odbierz';
      this.body.append(row, plain);
      let left = false;
      const finish = (m: 1 | 2) => { if (left) return; left = true; this.dismiss = undefined; this.close(); done(m); };
      this.dismiss = () => finish(1);
      plain.addEventListener('click', () => finish(1));
      ad.addEventListener('click', async () => {
        ad.disabled = true;
        plain.disabled = true;
        finish((await this.watch()) ? 2 : 1);
      });
      this.panel.classList.add('on');
      this.onToggle(true);
    });
  }
}
