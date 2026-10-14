/**
 * Floating joystick: press anywhere and drag, the stick appears under the finger.
 * A press that barely moves stays a tap and is reported through onTap.
 */
export class Joystick {
  /** current direction in screen space, length 0..1 (x right, y down) */
  x = 0;
  y = 0;
  active = false;
  onTap?: (clientX: number, clientY: number) => void;
  onStart?: () => void;

  private base: HTMLDivElement;
  private knob: HTMLDivElement;
  private id = -1;
  private ox = 0;
  private oy = 0;
  private t0 = 0;
  private readonly maxR = 52;

  constructor(el: HTMLElement) {
    const css = document.createElement('style');
    css.textContent = `
      .joy { position: fixed; width: 112px; height: 112px; margin: -56px 0 0 -56px; border-radius: 50%;
        background: rgba(255,255,255,.22); border: 3px solid rgba(255,255,255,.55); box-shadow: 0 4px 14px rgba(40,70,60,.18);
        pointer-events: none; opacity: 0; transform: scale(.8); transition: opacity .15s, transform .15s; }
      .joy.on { opacity: 1; transform: scale(1); }
      .joy-knob { position: absolute; left: 50%; top: 50%; width: 50px; height: 50px; margin: -25px 0 0 -25px; border-radius: 50%;
        background: #fff; box-shadow: 0 3px 8px rgba(40,70,60,.3); }`;
    document.head.appendChild(css);
    this.base = document.createElement('div');
    this.base.className = 'joy';
    this.knob = document.createElement('div');
    this.knob.className = 'joy-knob';
    this.base.appendChild(this.knob);
    document.body.appendChild(this.base);

    el.addEventListener('pointerdown', (e) => {
      if (this.id !== -1) return;
      this.id = e.pointerId;
      this.ox = e.clientX;
      this.oy = e.clientY;
      this.t0 = performance.now();
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.id) return;
      const dx = e.clientX - this.ox, dy = e.clientY - this.oy;
      const d = Math.hypot(dx, dy);
      if (!this.active && d > 12) {
        this.active = true;
        this.base.style.left = `${this.ox}px`;
        this.base.style.top = `${this.oy}px`;
        this.base.classList.add('on');
        this.onStart?.();
      }
      if (!this.active) return;
      const k = Math.min(1, d / this.maxR);
      this.x = d > 0 ? (dx / d) * k : 0;
      this.y = d > 0 ? (dy / d) * k : 0;
      this.knob.style.transform = `translate(${this.x * this.maxR}px, ${this.y * this.maxR}px)`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.id) return;
      if (!this.active && performance.now() - this.t0 < 450) this.onTap?.(e.clientX, e.clientY);
      this.id = -1;
      this.active = false;
      this.x = this.y = 0;
      this.base.classList.remove('on');
      this.knob.style.transform = '';
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
}
