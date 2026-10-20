import { t } from './i18n';
import { type Ailment, drawAilment, drawCoin, drawHeart, drawSpotIcon, type SpotIcon } from './icons';

/**
 * The adoption album: a sticker book with a card for every species, one page per area.
 * A species not met yet is a question mark, one met as a patient is a dark silhouette, and once
 * one of its kind has been adopted its card turns to a colour portrait with a heart count.
 * A page with every card filled pays a reward once. Icons and numbers only, no words.
 */

/** `rare`: a colour variant's card; it shows only once adopted and is not needed to fill the page */
export interface AlbumSpecies { name: string; ailment: Ailment; page: number; rare?: boolean }
/** `hidden`: a seasonal page, shown only while its event lasts or once something on it was adopted */
export interface AlbumPage { icon: SpotIcon; reward: number; hidden?: () => boolean }

/** names under the cards (a rare variant, `name*`, shows its species' name) */
export const NAMES: Record<string, string> = {
  chmurnik: 'Chmurnik', feniks: 'Feniks', smok: 'Smok', gryf: 'Gryf', grzybolak: 'Grzybołak', kraken: 'Kraken', jednorozec: 'Jednorożec',
  bazyliszek: 'Bazyliszek', zabiksiaze: 'Żabi książę', nessie: 'Nessie', swietlik: 'Świetlik', wodnik: 'Wodnik', leszy: 'Leszy',
  wilkolaczek: 'Wilkołaczek', skrzat: 'Skrzat', sowka: 'Sówka', yeti: 'Yeti', renifer: 'Renifer', balwanek: 'Bałwanek',
  pingwinek: 'Pingwinek', krabik: 'Krabik', foczka: 'Foczka', zolwik: 'Żółwik', syrenka: 'Syrenka',
  nietoperek: 'Nietoperek', kret: 'Kret', zuczek: 'Żuczek', golemik: 'Golemik',
  dyniak: 'Dyniak', duszek: 'Duszek',
};

export class Album {
  /** adoptions per species */
  counts: Record<string, number> = {};
  /** pages whose reward has been paid */
  paid: number[] = [];
  private btn: HTMLButtonElement;
  private dot: HTMLDivElement;
  private panel: HTMLDivElement;
  private grid: HTMLDivElement;
  /** species adopted for the first time since the album was last opened (their cards sparkle) */
  private fresh = new Set<string>();
  private pics = new Map<string, Promise<string>>();

  constructor(
    private species: AlbumSpecies[],
    private pages: AlbumPage[],
    /** species that can show up by now (met cards show as silhouettes) */
    private met: () => string[],
    /** a portrait of the species as an image URL */
    private portrait: (name: string) => Promise<string>,
  ) {
    const css = document.createElement('style');
    css.textContent = `
      #albumBtn { position: fixed; right: calc(14px + env(safe-area-inset-right)); top: calc(70px + env(safe-area-inset-top)); width: 48px; height: 48px;
        border: 0; border-radius: 50%; background: rgba(255,255,255,.85); box-shadow: 0 3px 10px rgba(40,70,60,.2); display: grid; place-items: center; padding: 0; transition: transform .15s; }
      #albumBtn.bump { transform: scale(1.25) rotate(-8deg); }
      #albumBtn .dot { position: absolute; right: 2px; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: #ff5f86; border: 2px solid #fff; display: none; }
      #albumBtn .dot.on { display: block; animation: edgepulse 1s ease-in-out infinite; }
      #album { position: fixed; inset: 0; display: none; background: rgba(40,70,60,.45); z-index: 20; }
      #album.on { display: block; }
      #album .book { position: absolute; left: 12px; right: 12px; top: calc(12px + env(safe-area-inset-top)); bottom: calc(12px + env(safe-area-inset-bottom));
        max-width: 480px; margin: 0 auto; background: #fff8ec; border-radius: 22px; box-shadow: 0 8px 30px rgba(40,70,60,.35); overflow-y: auto; padding: 14px 12px 20px; box-sizing: border-box; }
      #album .close { position: sticky; top: 0; float: right; width: 44px; height: 44px; border: 0; border-radius: 50%; background: #ffe3d6; display: grid; place-items: center; padding: 0; z-index: 1; }
      #album .page { clear: both; margin: 4px 0 16px; padding: 10px; border-radius: 16px; background: #fdf0d8; }
      #album .page.full { background: #fff1b8; box-shadow: inset 0 0 0 3px #ffc21a; }
      #album .head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font: 800 18px system-ui, sans-serif; color: #8a6a2a; }
      #album .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      #album .card { position: relative; aspect-ratio: 0.8; border-radius: 14px; background: #fff; box-shadow: 0 2px 6px rgba(120,90,40,.18); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
      #album .card img { width: 84%; aspect-ratio: 1; object-fit: contain; }
      #album .card .nm { font: 800 12px system-ui, sans-serif; color: #6a5a3a; margin-top: -2px; max-width: 96%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #album .card.met .nm { color: #b0a080; }
      #album .card img:not([src]) { visibility: hidden; }
      #album .card.met img { filter: brightness(0) opacity(.28); }
      #album .card.rare { background: radial-gradient(circle at 50% 40%, #fffbe0, #ffe9a8); box-shadow: 0 0 0 3px #ffd34d, 0 2px 6px rgba(120,90,40,.18); }
      #album .card.unknown { background: #efe6d6; box-shadow: none; }
      #album .card .q { font: 900 40px system-ui, sans-serif; color: #d8c8a8; }
      #album .card .ail { position: absolute; left: 4px; top: 4px; width: 28px; height: 28px; }
      #album .card .n { position: absolute; right: 5px; top: 4px; display: flex; align-items: center; gap: 2px; font: 800 15px system-ui, sans-serif; color: #8a2a44; }
      #album .card .n canvas { width: 18px; height: 18px; }
      #album .card.fresh { animation: fresh 1s ease-in-out 3; box-shadow: 0 0 0 3px #ffc21a, 0 2px 6px rgba(120,90,40,.18); }
      @keyframes fresh { 50% { transform: scale(1.06) rotate(-2deg); } }`;
    document.head.appendChild(css);

    this.btn = document.createElement('button');
    this.btn.id = 'albumBtn';
    this.btn.appendChild(bookIcon(30));
    this.dot = document.createElement('div');
    this.dot.className = 'dot';
    this.btn.appendChild(this.dot);
    this.btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.btn.addEventListener('click', () => this.open());
    document.body.appendChild(this.btn);

    this.panel = document.createElement('div');
    this.panel.id = 'album';
    const book = document.createElement('div');
    book.className = 'book';
    const close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 5l14 14M19 5L5 19" stroke="#c0583e" stroke-width="3.5" stroke-linecap="round"/></svg>';
    close.addEventListener('click', () => this.close());
    this.grid = document.createElement('div');
    book.append(close, this.grid);
    this.panel.appendChild(book);
    this.book = book;
    // tapping the dimmed edge closes it too; nothing reaches the game underneath
    this.panel.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (e.target === this.panel) this.close(); });
    document.body.appendChild(this.panel);
  }

  private book!: HTMLDivElement;
  private footer?: HTMLElement & { refresh?: () => void };

  /** a box under the last page (the save backup); refreshed whenever the album opens */
  addFooter(el: HTMLElement & { refresh?: () => void }) {
    this.footer = el;
    this.book.appendChild(el);
  }

  /** restore from a save */
  load(counts: Record<string, number> | undefined, paid: number[] | undefined) {
    for (const [k, v] of Object.entries(counts ?? {})) if (this.species.some((s) => s.name === k)) this.counts[k] = Math.max(0, v | 0);
    this.paid = (paid ?? []).filter((p) => p >= 0 && p < this.pages.length);
  }

  /** one more of this species adopted; returns the pages that just became complete (their reward is due) */
  add(name: string): number[] {
    const first = !this.counts[name];
    this.counts[name] = (this.counts[name] ?? 0) + 1;
    if (first) {
      this.fresh.add(name);
      this.dot.classList.add('on');
      this.btn.classList.add('bump');
      window.setTimeout(() => this.btn.classList.remove('bump'), 260);
    }
    const done: number[] = [];
    this.pages.forEach((_, i) => {
      if (this.paid.includes(i)) return;
      const list = this.species.filter((s) => s.page === i && !s.rare);
      if (list.length && list.every((s) => this.counts[s.name])) { this.paid.push(i); done.push(i); }
    });
    if (this.panel.classList.contains('on')) this.render();
    return done;
  }

  /** where the button is on screen, for coins or stickers flying to it */
  get button() { return this.btn; }

  /** called once when the album is closed next (the first adoption tells about hearts after it) */
  onClose?: () => void;

  /** called on every open (true) and close (false): gameplay pauses meanwhile */
  onToggle?: (open: boolean) => void;

  private close() {
    this.panel.classList.remove('on');
    this.onToggle?.(false);
    const f = this.onClose;
    this.onClose = undefined;
    f?.();
  }

  open() {
    this.render();
    this.footer?.refresh?.();
    this.panel.classList.add('on');
    this.dot.classList.remove('on');
    this.onToggle?.(true);
  }

  private render() {
    const met = new Set(this.met());
    this.grid.innerHTML = '';
    this.pages.forEach((page, i) => {
      const list = this.species.filter((s) => s.page === i && !s.rare);
      const rares = this.species.filter((s) => s.page === i && s.rare && this.counts[s.name]);
      if (!list.length) return;
      if (page.hidden?.() && !list.some((s) => this.counts[s.name])) return;
      const box = document.createElement('div');
      box.className = 'page' + (this.paid.includes(i) ? ' full' : '');
      const head = document.createElement('div');
      head.className = 'head';
      head.appendChild(iconCanvas(34, (g) => drawSpotIcon(g, page.icon, 34, 34, 28)));
      const got = list.filter((s) => this.counts[s.name]).length;
      head.append(`${got} / ${list.length}`);
      // the page reward: a coin with its amount while still to earn, a heart once paid
      head.appendChild(iconCanvas(26, (g) => (this.paid.includes(i) ? drawHeart(g, 34, 36, 18, '#ff5f86') : drawCoin(g, 34, 34, 26))));
      if (!this.paid.includes(i)) head.append(String(page.reward));
      const cards = document.createElement('div');
      cards.className = 'cards';
      for (const s of [...list, ...rares]) {
        const card = document.createElement('div');
        const n = this.counts[s.name] ?? 0;
        if (!n && !met.has(s.name)) {
          card.className = 'card unknown';
          card.innerHTML = '<span class="q">?</span>';
        } else {
          card.className = 'card' + (n ? '' : ' met') + (s.rare ? ' rare' : '') + (this.fresh.has(s.name) ? ' fresh' : '');
          const img = document.createElement('img');
          img.alt = '';
          this.pic(s.name).then((url) => { img.src = url; }, () => { /* no portrait: the card stays plain */ });
          const ail = iconCanvas(28, (g) => drawAilment(g, s.ailment, 34, 34, 26));
          ail.className = 'ail';
          const nm = document.createElement('div');
          nm.className = 'nm';
          nm.textContent = t(NAMES[s.name.replace('*', '')] ?? s.name);
          card.append(img, nm, ail);
          if (n) {
            const c = document.createElement('div');
            c.className = 'n';
            c.append(iconCanvas(18, (g) => drawHeart(g, 34, 36, 20, '#ff5f86')), String(n));
            card.appendChild(c);
          }
        }
        cards.appendChild(card);
      }
      box.append(head, cards);
      this.grid.appendChild(box);
    });
    this.fresh.clear();
  }

  private pic(name: string) {
    if (!this.pics.has(name)) this.pics.set(name, this.portrait(name));
    return this.pics.get(name)!;
  }
}

function iconCanvas(size: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = 68;
  c.style.width = c.style.height = `${size}px`;
  draw(c.getContext('2d')!);
  return c;
}

/** an open sticker book with a heart on the page */
function bookIcon(size: number) {
  return iconCanvas(size, (g) => {
    g.lineJoin = 'round';
    g.fillStyle = '#b8794a';
    g.beginPath();
    g.moveTo(6, 16); g.lineTo(34, 22); g.lineTo(62, 16); g.lineTo(62, 56); g.lineTo(34, 62); g.lineTo(6, 56);
    g.closePath();
    g.fill();
    g.fillStyle = '#fff8ec';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(34, 20); g.lineTo(34 + s * 24, 13); g.lineTo(34 + s * 24, 51); g.lineTo(34, 57);
      g.closePath();
      g.fill();
    }
    g.strokeStyle = '#d9b48a';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(34, 20); g.lineTo(34, 57); g.stroke();
    drawHeart(g, 21, 35, 9, '#ff5f86');
    g.fillStyle = '#9fd3a0';
    g.beginPath(); g.arc(47, 33, 7, 0, Math.PI * 2); g.fill();
  });
}
