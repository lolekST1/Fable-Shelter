// Hook Stop: zmiana, którą widzi gracz, nie jest skończona bez obejrzanego zrzutu ekranu.
// Jeśli w drzewie roboczym są zmienione pliki gry (src/, index.html, public/), a w tools/out/ nie ma zrzutu .png
// nowszego niż te zmiany, zatrzymuje zakończenie pracy JEDEN raz na paczkę zmian i prosi o zrzut.
// Claude może odpowiedzieć, że zmiana nie jest widoczna (np. sama logika sprawdzona testem), i wtedy kończy.
// Wyłączenie: FS_NO_SHOT=1 w środowisku albo usunięcie wpisu Stop z .claude/settings.json.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

if (process.env.FS_NO_SHOT) process.exit(0);
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
if (input.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
let changed = [];
try {
  changed = execSync('git status --porcelain --untracked-files=all', { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop())
    .filter((f) => /^(src\/|public\/|index\.html$)/.test(f));
} catch { process.exit(0); }
if (!changed.length) process.exit(0);

const mtime = (f) => { try { return fs.statSync(path.join(root, f)).mtimeMs; } catch { return 0; } };
const newestChange = Math.max(...changed.map(mtime));
const out = path.join(root, 'tools', 'out');
let newestShot = 0;
try { for (const f of fs.readdirSync(out)) if (f.endsWith('.png') || f === '.zrzut-pytano') newestShot = Math.max(newestShot, mtime(path.join('tools', 'out', f))); } catch {}
if (newestShot >= newestChange) process.exit(0);

// zapamiętaj, że już pytaliśmy o tę paczkę zmian, żeby nie pytać przy każdym kolejnym zakończeniu
try { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, '.zrzut-pytano'), new Date().toISOString()); } catch {}

const list = changed.slice(0, 8).join(', ') + (changed.length > 8 ? ` i ${changed.length - 8} innych` : '');
const reason = `Zmienione pliki gry (${list}) nie mają zrzutu ekranu nowszego niż zmiany. ` +
  'Jeśli zmiana jest widoczna dla gracza: zbuduj (npm run build), uruchom podgląd (npx vite preview --port 4173), ' +
  'zrób zrzut (cd tools; NAME=... SAVE=nowy|pelny Q=... AT=x,z node tests/shot.mjs albo właściwy test z tools/tests), ' +
  'OBEJRZYJ go narzędziem Read i dopiero wtedy kończ. Jeśli zmiana nie jest widoczna (sama logika sprawdzona testem, ' +
  'dokumentacja, narzędzia), napisz to jednym zdaniem i zakończ.';
console.log(JSON.stringify({ decision: 'block', reason }));
