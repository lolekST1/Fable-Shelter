import { type Ailment, type Medicine, drawAilment, drawBerry, drawBridge, drawHeart, drawMedicine, drawMoon, drawPumpkin, drawVial } from './icons';
import { NAMES } from './album';
import { drawHomeDoor } from './daily';

/**
 * Short picture cards that say what the game is about: the goal at the very first start (cure, care, 4 hearts,
 * a new home) and what hearts are for. Big pictures in a row, two or three words under each, one button to go on.
 */

type Draw = (g: CanvasRenderingContext2D) => void;
/** a picture: drawn on a canvas, or an image (a creature's portrait) */
interface Panel { draw?: Draw; img?: Promise<string>; label: string }

const css = `
  #story { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; background: rgba(40,70,60,.5); padding: 16px; }
  #story .box { width: 100%; max-width: 420px; background: #fff8ec; border-radius: 24px; box-shadow: 0 8px 30px rgba(40,70,60,.35); padding: 18px 14px 16px; box-sizing: border-box; text-align: center; animation: storyIn .35s ease-out; }
  #story h2 { margin: 0 0 14px; font: 900 21px system-ui, sans-serif; color: #8a5a32; }
  #story .row { display: flex; align-items: flex-start; justify-content: center; gap: 2px; margin-bottom: 12px; }
  #story .p { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; font: 800 13px system-ui, sans-serif; color: #5b4a1a; opacity: 0; animation: storyIn .4s ease-out forwards; }
  #story .p canvas, #story .p img { width: 64px; height: 64px; border-radius: 50%; background: #fdf0d8; object-fit: contain; }
  #story .p img.big { width: 96px; height: 96px; }
  #story.low { place-items: end center; background: rgba(40,70,60,.15); padding-bottom: calc(24px + env(safe-area-inset-bottom)); }
  #story .arrow { flex: 0 0 auto; margin-top: 22px; font: 900 18px system-ui, sans-serif; color: #e0b060; }
  #story button { margin-top: 4px; width: 72px; height: 72px; border: 0; border-radius: 50%; background: #ffc21a; box-shadow: 0 4px 0 #d99a00; display: inline-grid; place-items: center; animation: storyPulse 1.2s ease-in-out infinite; }
  @keyframes storyIn { from { opacity: 0; transform: translateY(10px) scale(.95); } to { opacity: 1; transform: none; } }
  @keyframes storyPulse { 50% { transform: scale(1.1); } }`;

function canvas(draw: Draw) {
  const c = document.createElement('canvas');
  c.width = c.height = 68;
  draw(c.getContext('2d')!);
  return c;
}

let queue = Promise.resolve();
/** show cards one after another (a new patient may turn up while the goal card is still open) */
export function nextCard(show: () => Promise<void>) {
  queue = queue.then(show, show);
  return queue;
}

/** show a card with rows of pictures; resolves when it is closed */
export function story(title: string, rows: Panel[][], low = false, joint = '➜'): Promise<void> {
  if (!document.getElementById('storyCss')) {
    const s = document.createElement('style');
    s.id = 'storyCss';
    s.textContent = css;
    document.head.appendChild(s);
  }
  const wrap = document.createElement('div');
  wrap.id = 'story';
  if (low) wrap.className = 'low'; // at the bottom: the creature the camera looks at stays in view
  const box = document.createElement('div');
  box.className = 'box';
  const h = document.createElement('h2');
  h.textContent = title;
  box.appendChild(h);
  let n = 0;
  for (const row of rows) {
    const r = document.createElement('div');
    r.className = 'row';
    row.forEach((p, i) => {
      if (i) {
        const a = document.createElement('div');
        a.className = 'arrow';
        a.textContent = joint;
        r.appendChild(a);
      }
      const el = document.createElement('div');
      el.className = 'p';
      el.style.animationDelay = `${0.25 + n++ * 0.35}s`; // one after another, like a little comic
      if (p.img) {
        const im = document.createElement('img');
        im.alt = '';
        if (row.length === 1) im.className = 'big';
        p.img.then((u) => { im.src = u; }, () => { /* no portrait */ });
        el.append(im, p.label);
      } else el.append(canvas(p.draw!), p.label);
      r.appendChild(el);
    });
    box.appendChild(r);
  }
  const go = document.createElement('button');
  go.innerHTML = '<svg viewBox="0 0 24 24" width="34" height="34"><path d="M8 5l11 7-11 7z" fill="#fff"/></svg>';
  box.appendChild(go);
  wrap.appendChild(box);
  // nothing reaches the game underneath while the card is up
  wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.appendChild(wrap);
  return new Promise((done) => go.addEventListener('click', () => { wrap.remove(); done(); }));
}

const hearts4: Draw = (g) => {
  drawHeart(g, 22, 24, 9, '#ff5f86'); drawHeart(g, 46, 24, 9, '#ff5f86');
  drawHeart(g, 22, 46, 9, '#ff5f86'); drawHeart(g, 46, 46, 9, '#ff5f86');
};
const heart: Draw = (g) => drawHeart(g, 34, 36, 18, '#ff5f86');

/** the goal of the game, at the very first start */
export const introStory = () => story('Schronisko dla bajkowych stworków', [
  [
    { draw: (g) => drawVial(g, 34, 36, 24), label: 'Wylecz' },
    { draw: (g) => { drawBerry(g, 24, 40, 15); drawMoon(g, 44, 28, 13); }, label: 'Nakarm i połóż spać' },
  ],
  [
    { draw: hearts4, label: '4 serduszka' },
    { draw: drawHomeDoor, label: 'Nowy dom' },
  ],
]);

/** what each illness looks like, in a few words */
const AILMENT_TEXT: Record<Ailment, string> = {
  snow: 'Sypie śniegiem', smoke: 'Zgasł mu płomień', sparks: 'Kicha iskrami', feathers: 'Gubi pióra', spores: 'Pyli zarodnikami',
  bubbles: 'Czka bańkami', confetti: 'Kicha konfetti', crown: 'Kicha, aż spada korona', fountain: 'Tryska wodą', drip: 'Cieknie mu z kapelusza',
  flicker: 'Gaśnie mu światełko', stone: 'Kamienieje', leaves: 'Gubi liście', howl: 'Wyje do księżyca', shrink: 'Kurczy się',
  dizzy: 'Kręci mu się w głowie', snowball: 'Czka śnieżkami', nose: 'Miga mu nos', melt: 'Topnieje', slide: 'Kręci się w kółko',
  pinch: 'Szczypie się w nos', sand: 'Kicha piaskiem', hide: 'Chowa się w skorupę', tangle: 'Plącze się w wodorostach',
  seeds: 'Kicha pestkami', fade: 'Znika co chwilę',
};
const CURE_TEXT: Record<Medicine, string> = {
  pink: 'Eliksir z kociołka', blue: 'Woda ze źródełka', green: 'Zioła', purple: 'Nektar z lilii', gold: 'Złoty miód',
  cocoa: 'Kakao z ogniska', pearl: 'Perła z muszli', berry: 'Jagody',
};

/** the first time a species turns up: who it is, what is wrong with it and what helps */
export const meetStory = (name: string, ailment: Ailment, cure: Medicine, portrait: Promise<string>) => story(NAMES[name] ?? name, [
  [{ img: portrait, label: 'Nowy pacjent' }],
  [
    { draw: (g) => drawAilment(g, ailment, 34, 34, 26), label: AILMENT_TEXT[ailment] ?? '' },
    { draw: (g) => drawMedicine(g, cure, 34, 36, 22), label: CURE_TEXT[cure] },
  ],
], true);

/** the first visit while Halloween lasts: who comes and what there is to get */
export const halloweenStory = (portrait: (name: string) => Promise<string>) => story('Halloween w schronisku!', [
  [
    { img: portrait('dyniak'), label: 'Dyniak' },
    { img: portrait('duszek'), label: 'Duszek' },
  ],
  [
    { draw: (g) => drawPumpkin(g, 34, 36, 24), label: 'Nowa strona albumu' },
    { draw: (g) => drawWitchHat(g), label: 'Kapelusz w szafie' },
  ],
], false, '+');

/** a witch hat (68 px canvas) */
function drawWitchHat(g: CanvasRenderingContext2D) {
  g.fillStyle = '#4a2f6a';
  g.beginPath(); g.ellipse(34, 50, 26, 6, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(20, 50); g.lineTo(38, 14); g.lineTo(50, 22); g.lineTo(46, 50); g.closePath(); g.fill();
  g.fillStyle = '#f08a24'; g.fillRect(21, 42, 25, 5);
}

/** what hearts are for: after the first adoption, or a tap on the hearts counter */
export const heartsStory = () => story('Serduszka', [
  [
    { draw: drawHomeDoor, label: 'Adopcja' },
    { draw: heart, label: '+1' },
  ],
  [
    { draw: heart, label: 'Serduszka' },
    { draw: (g) => drawBridge(g, 34, 36, 26), label: 'Nowe tereny' },
  ],
]);
