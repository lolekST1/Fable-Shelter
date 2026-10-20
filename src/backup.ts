/**
 * A copy of the save as a code the player can keep (a note, a message to themselves) and paste back on another
 * phone or after the browser data was wiped: in an idle game losing hours of progress loses the player for good.
 * The code is the save JSON in base64 with a short checksum, so a half-copied code is refused instead of loaded.
 */

import { track } from './platform';

const PREFIX = 'FS1-';

const sum = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h & 0xffff).toString(16).padStart(4, '0');
};

export function encodeSave(json: string): string {
  const b64 = btoa(Array.from(new TextEncoder().encode(json), (b) => String.fromCharCode(b)).join(''));
  return PREFIX + b64 + '-' + sum(b64);
}

/** the save JSON, or null when the code is not a whole, valid one */
export function decodeSave(code: string): string | null {
  const c = code.replace(/\s+/g, '');
  if (!c.startsWith(PREFIX)) return null;
  const body = c.slice(PREFIX.length);
  const cut = body.lastIndexOf('-');
  if (cut < 0) return null;
  const b64 = body.slice(0, cut);
  if (sum(b64) !== body.slice(cut + 1)) return null;
  try {
    const json = new TextDecoder().decode(Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)));
    const data = JSON.parse(json);
    return data && typeof data === 'object' && typeof data.bought === 'number' ? json : null;
  } catch {
    return null;
  }
}

/** ask the browser not to clear the game's storage when space runs low (a quiet no where unsupported) */
export function keepStorage() {
  try { void navigator.storage?.persist?.(); } catch { /* not supported */ }
}

/** the backup box at the end of the album: copy the code, or paste one and load it (a second tap confirms) */
export function backupBox(current: () => string, load: (json: string) => void): HTMLElement & { refresh: () => void } {
  const css = document.createElement('style');
  css.textContent = `
    #backup { clear: both; margin: 4px 0 8px; padding: 10px; border-radius: 16px; background: #f4ecdc; font: 700 14px system-ui, sans-serif; color: #6a5a3a; }
    #backup h3 { margin: 0 0 8px; font: 800 16px system-ui, sans-serif; }
    #backup textarea { box-sizing: border-box; width: 100%; max-width: 100%; height: 64px; border: 0; border-radius: 10px; padding: 6px; font: 12px monospace; resize: none; }
    #backup .row { display: flex; gap: 8px; margin: 6px 0 10px; }
    #backup button { flex: 1; min-width: 0; padding: 10px 6px; border: 0; border-radius: 12px; background: #ffc21a; font: 800 14px system-ui, sans-serif; color: #5b4a1a; }
    #backup button.warn { background: #ff8a6a; color: #fff; }
    #backup .msg { min-height: 1.2em; }`;
  document.head.appendChild(css);
  const box = document.createElement('div');
  box.id = 'backup';
  const h = document.createElement('h3');
  h.textContent = 'Kopia zapisu';
  const out = document.createElement('textarea');
  out.readOnly = true;
  const copy = document.createElement('button');
  copy.textContent = 'Kopiuj';
  const inp = document.createElement('textarea');
  inp.placeholder = 'Wklej kod kopii';
  const loadBtn = document.createElement('button');
  loadBtn.textContent = 'Wczytaj';
  const msg = document.createElement('div');
  msg.className = 'msg';
  const row1 = document.createElement('div');
  row1.className = 'row';
  row1.append(copy);
  const row2 = document.createElement('div');
  row2.className = 'row';
  row2.append(loadBtn);
  box.append(h, out, row1, inp, row2, msg);

  const refresh = () => { out.value = encodeSave(current()); };
  copy.addEventListener('click', async () => {
    refresh();
    track('backup', 'save', 'copy');
    try { await navigator.clipboard.writeText(out.value); msg.textContent = 'Skopiowano'; }
    catch { out.select(); msg.textContent = 'Zaznacz i skopiuj'; }
  });
  let armed = false;
  inp.addEventListener('input', () => { armed = false; loadBtn.textContent = 'Wczytaj'; loadBtn.classList.remove('warn'); msg.textContent = ''; });
  loadBtn.addEventListener('click', () => {
    const json = decodeSave(inp.value);
    if (!json) { msg.textContent = 'To nie jest cały kod kopii'; return; }
    // loading replaces the current game: the first tap asks, the second one loads
    if (!armed) { armed = true; loadBtn.textContent = 'Na pewno? Obecny postęp zniknie'; loadBtn.classList.add('warn'); return; }
    load(json);
  });
  return Object.assign(box, { refresh });
}
