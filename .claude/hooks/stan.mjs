// Hook SessionStart: przypomina punkt kontrolny długiej pracy z .claude/stan.md.
// Po kompakcji i wznowieniu sesji wkleja plik zawsze, przy zwykłym starcie tylko wtedy, gdy ma mniej niż 12 godzin
// (czyli praca z poprzedniej sesji pewnie trwa). Plik jest w .gitignore: to notatka robocza, nie dokumentacja.
import fs from 'fs';
import path from 'path';

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch {}
const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const file = path.join(root, '.claude', 'stan.md');
let st;
try { st = fs.statSync(file); } catch { process.exit(0); }
const ageH = (Date.now() - st.mtimeMs) / 3.6e6;
const src = input.source ?? 'startup';
if (src === 'clear') process.exit(0);
if (src === 'startup' && ageH > 12) process.exit(0);
const text = fs.readFileSync(file, 'utf8').trim();
if (!text) process.exit(0);
const when = ageH < 1 ? `${Math.round(ageH * 60)} min temu` : `${ageH.toFixed(1)} h temu`;
console.log(`Punkt kontrolny z .claude/stan.md (zmieniony ${when}). Zanim zaczniesz, sprawdź, czy to nadal aktualne, i trzymaj go na bieżąco:\n\n${text}`);
