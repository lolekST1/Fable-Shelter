import { t } from './i18n';
import { type Ailment, drawAilment, drawBerry, drawCoin, drawHeart } from './icons';

/** the shelter house's round door with a heart over it (a 68 px canvas): a new home */
export function drawHomeDoor(g: CanvasRenderingContext2D) {
  g.fillStyle = '#8a5a32';
  g.beginPath();
  g.moveTo(14, 64); g.lineTo(14, 34); g.arc(34, 34, 20, Math.PI, 0); g.lineTo(54, 64);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffd34d';
  g.beginPath(); g.arc(46, 48, 3, 0, Math.PI * 2); g.fill();
  drawHeart(g, 34, 30, 15, '#ff5f86');
}

/**
 * The request of the day: one small task a day, shown as a card under the hearts with icons and numbers only.
 * cure: cure N of one species (its portrait and ailment), goodbye: be by the house for N farewells (a heart),
 * feed: feed N residents yourself (berries). Picked from the date, so it changes at midnight; progress is saved.
 */

export type DailyKind = 'cure' | 'goodbye' | 'feed';
export interface DailyState { day: string; kind: DailyKind; name?: string; target: number; n: number; reward: number; paid?: boolean }

/** today's date as YYYY-MM-DD (local time); ?day=YYYY-MM-DD overrides it for tests */
export function today() {
  return new URLSearchParams(location.search).get('day') ?? new Date().toLocaleDateString('sv');
}

/** a small stable number from a string (the day picks its task with it) */
function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export class Daily {
  state: DailyState | null = null;
  private card: HTMLDivElement;
  private icon: HTMLDivElement;
  private count: HTMLSpanElement;
  private reward: HTMLSpanElement;
  private bar: HTMLElement;
  private justDone = false;

  constructor(
    private portrait: (name: string) => Promise<string>,
    private ailment: (name: string) => Ailment,
  ) {
    const css = document.createElement('style');
    css.textContent = `
      #daily { position: fixed; left: calc(14px + env(safe-area-inset-left)); top: calc(118px + env(safe-area-inset-top)); display: flex; align-items: center; gap: 8px;
        padding: 14px 12px 6px 6px; border-radius: 22px; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2);
        font: 800 18px system-ui, sans-serif; color: #5b4a1a; pointer-events: none; transition: transform .15s; }
      #daily.bump { transform: scale(1.15); }
      #daily .tag { position: absolute; left: 8px; top: -9px; display: flex; align-items: center; gap: 3px; padding: 1px 7px 1px 3px; border-radius: 10px;
        background: #ffc21a; color: #fff; font: 900 11px system-ui, sans-serif; letter-spacing: .3px; box-shadow: 0 2px 4px rgba(120,90,40,.25); }
      #daily .mid { display: flex; flex-direction: column; gap: 3px; min-width: 52px; }
      #daily .bar { height: 7px; border-radius: 4px; background: #f1e3c4; overflow: hidden; }
      #daily .bar i { display: block; height: 100%; width: 0; background: #3aa65a; border-radius: 4px; transition: width .3s; }
      #daily.gone { opacity: 0; transform: translateX(-30px); transition: opacity .6s, transform .6s; }
      #daily.done { background: #fff1b8; box-shadow: inset 0 0 0 3px #ffc21a, 0 3px 10px rgba(40,70,60,.2); }
      #daily .ic { position: relative; width: 46px; height: 46px; border-radius: 50%; background: #fdf0d8; display: grid; place-items: center; overflow: hidden; }
      #daily .ic img { width: 46px; height: 46px; object-fit: contain; }
      #daily .ic canvas.badge { position: absolute; right: -2px; bottom: -2px; width: 20px; height: 20px; }
      #daily canvas.coin { width: 22px; height: 22px; }
      #daily .rw { display: flex; align-items: center; gap: 3px; font-size: 16px; }
      #daily .check { display: none; }
      #daily.done .check { display: block; }
      #daily.done .rw { display: none; }`;
    document.head.appendChild(css);
    this.card = document.createElement('div');
    this.card.id = 'daily';
    this.icon = document.createElement('div');
    this.icon.className = 'ic';
    this.count = document.createElement('span');
    this.reward = document.createElement('span');
    this.reward.className = 'rw';
    const coin = document.createElement('canvas');
    coin.className = 'coin';
    coin.width = coin.height = 68;
    drawCoin(coin.getContext('2d')!, 34, 34, 28);
    this.reward.append(coin);
    const amount = document.createElement('span');
    this.reward.append(amount);
    const check = document.createElement('span');
    check.className = 'check';
    check.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 12.5l5 5L20 6" fill="none" stroke="#3aa65a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13"><rect x="2" y="3" width="12" height="11" rx="2" fill="#fff"/><rect x="2" y="3" width="12" height="3.5" rx="1.5" fill="#e8604c"/><path d="M8 7.6l1 2 2.2.3-1.6 1.5.4 2.2L8 12.5l-2 1.1.4-2.2-1.6-1.5 2.2-.3z" fill="#ffc21a"/></svg>' + t('Dziś');
    const mid = document.createElement('span');
    mid.className = 'mid';
    this.bar = document.createElement('i');
    const track = document.createElement('span');
    track.className = 'bar';
    track.appendChild(this.bar);
    mid.append(this.count, track);
    this.card.append(tag, this.icon, mid, this.reward, check);
    this.card.style.display = 'none';
    document.body.appendChild(this.card);
  }

  /** keep today's task (from the save or a new one for a new day) */
  ensure(saved: DailyState | undefined, pool: string[], reward: number) {
    const day = today();
    if (saved && saved.day === day) this.state = saved;
    else if (pool.length) {
      const h = hash(day);
      const kind = (['cure', 'goodbye', 'feed'] as const)[h % 3];
      this.state = kind === 'cure' ? { day, kind, name: pool[(h >>> 4) % pool.length], target: 3 + ((h >>> 8) % 3), n: 0, reward }
        : kind === 'goodbye' ? { day, kind, target: 3 + ((h >>> 8) % 3), n: 0, reward }
          : { day, kind, target: 5 + ((h >>> 8) % 4), n: 0, reward };
    }
    this.draw();
  }

  /** something happened; returns true when this finished the task (the reward is due) */
  hit(kind: DailyKind, name?: string): boolean {
    const s = this.state;
    if (!s || s.paid || s.kind !== kind || (s.name && s.name !== name)) return false;
    s.n = Math.min(s.target, s.n + 1);
    if (s.n >= s.target) s.paid = this.justDone = true;
    this.draw();
    // done: the tick shows for a moment, then the card slides away until tomorrow's task
    if (s.paid) window.setTimeout(() => this.card.classList.add('gone'), 2500);
    this.card.classList.add('bump');
    window.setTimeout(() => this.card.classList.remove('bump'), 160);
    return !!s.paid;
  }

  /** the card, for coins flying from it */
  get element() { return this.card; }

  private draw() {
    const s = this.state;
    this.card.style.display = s ? 'flex' : 'none';
    if (!s) return;
    this.card.classList.toggle('gone', !!s.paid && !this.justDone); // a task finished before: no card
    this.icon.innerHTML = '';
    const cv = (size: number, f: (g: CanvasRenderingContext2D) => void) => {
      const c = document.createElement('canvas');
      c.width = c.height = 68;
      c.style.width = c.style.height = `${size}px`;
      f(c.getContext('2d')!);
      return c;
    };
    if (s.kind === 'cure' && s.name) {
      const img = document.createElement('img');
      img.alt = '';
      this.portrait(s.name).then((u) => { img.src = u; }, () => { /* no portrait: the ailment badge still says who */ });
      const badge = cv(20, (g) => drawAilment(g, this.ailment(s.name!), 34, 34, 26));
      badge.className = 'badge';
      this.icon.append(img, badge);
    } else if (s.kind === 'goodbye') {
      // a heart over the shelter house's round door: say goodbye there
      this.icon.append(cv(34, (g) => drawHomeDoor(g)));
    }
    else this.icon.append(cv(30, (g) => drawBerry(g, 34, 36, 26)));
    this.count.textContent = `${s.n}/${s.target}`;
    this.bar.style.width = `${(100 * s.n) / s.target}%`;
    (this.reward.lastChild as HTMLSpanElement).textContent = String(s.reward);
    this.card.classList.toggle('done', !!s.paid);
  }
}
