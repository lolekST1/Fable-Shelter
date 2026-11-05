// Hook PreToolUse (Read): nie wczytuj w całości dużych plików, czytaj sekcję.
// Plik powyżej LIMIT_LINES linii albo LIMIT_KB kilobajtów, czytany bez offset/limit, zostaje odrzucony,
// a w odpowiedzi Claude dostaje mapę pliku (nagłówki markdown albo deklaracje i metody TS/JS z numerami linii),
// żeby od razu przeczytać właściwy fragment (offset + limit) albo użyć Grep.
// Modele `.glb.txt` (base64) są odrzucane zawsze: ich czytanie nic nie daje, a zjada kontekst.
// Odczyt z offset albo limit zawsze przechodzi. Wyłączenie: FS_NO_READ_GUARD=1.
import fs from 'fs';
import path from 'path';

const LIMIT_LINES = 1200;
const LIMIT_KB = 60;
if (process.env.FS_NO_READ_GUARD) process.exit(0);
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const ti = input.tool_input ?? {};
const file = ti.file_path;
if (!file || ti.offset !== undefined || ti.limit !== undefined) process.exit(0);

const deny = (reason) => {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
  process.exit(0);
};

if (file.endsWith('.glb.txt')) deny('To model 3D zapisany jako base64, nie da się go sensownie przeczytać. Do podglądu: tools/viewer/preview.mjs, do sprawdzenia rozmiaru: ls -l.');
if (!/\.(md|ts|mjs|js|json|html|css|txt)$/.test(file)) process.exit(0);

let text;
try {
  const st = fs.statSync(file);
  if (!st.isFile()) process.exit(0);
  text = fs.readFileSync(file, 'utf8');
} catch { process.exit(0); }
const lines = text.split('\n');
const kb = Buffer.byteLength(text) / 1024;
if (lines.length <= LIMIT_LINES && kb <= LIMIT_KB) process.exit(0);

// mapa pliku
const map = [];
if (file.endsWith('.md')) {
  lines.forEach((l, i) => { if (/^#{1,4} /.test(l)) map.push(`${i + 1}: ${l}`); });
} else if (file.endsWith('.json')) {
  map.push('(JSON, bez mapy — przeczytaj fragment albo wyciągnij klucz przez node -e)');
} else {
  const top = /^(export\s+)?(default\s+)?(async\s+)?(function|class|const|let|interface|type|enum)\s+[\w$]+/;
  const member = /^  (static\s+|private\s+|public\s+|async\s+|get\s+|set\s+)*[A-Za-z_$][\w$]*\s*(<[^>]*>)?\(/;
  lines.forEach((l, i) => {
    if (top.test(l)) map.push(`${i + 1}: ${l.trim().slice(0, 100)}`);
    else if (member.test(l) && !/^\s+(if|for|while|switch|return|catch)\b/.test(l)) map.push(`${i + 1}:   ${l.trim().slice(0, 90)}`);
  });
}
const MAX = 220;
const shown = map.length > MAX ? [...map.slice(0, MAX), `… i ${map.length - MAX} kolejnych (użyj Grep)`] : map;
const name = path.basename(file);
deny(`${name} ma ${lines.length} linii (${Math.round(kb)} KB). Nie czytaj go w całości: przeczytaj potrzebny fragment ` +
  `(Read z offset i limit, np. 150 linii) albo znajdź miejsce przez Grep. Mapa pliku (linia: początek):\n` + (shown.join('\n') || '(brak nagłówków)'));
