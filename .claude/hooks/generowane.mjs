// Hook PreToolUse (Edit, Write, MultiEdit): nie edytuj ręcznie plików generowanych przez narzędzia.
// src/lids.json (powieki) powstaje z tools/viewer/eyes.mjs; ręczna zmiana zniknie przy następnym przebiegu
// albo rozjedzie się z modelem. Claude dostaje odmowę z poleceniem, które plik generuje.
import fs from 'fs';

const GENERATED = {
  'src/lids.json': 'node viewer/eyes.mjs <gatunek> (w katalogu tools, opis w docs/MODELE.md)',
};
let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const file = String(input.tool_input?.file_path ?? '').replace(/\\/g, '/');
for (const [rel, how] of Object.entries(GENERATED)) {
  if (file.endsWith('/' + rel) || file === rel) {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: `${rel} jest generowany, nie edytuj go ręcznie. Zmień dane wejściowe i uruchom: ${how}.` } }));
    process.exit(0);
  }
}
