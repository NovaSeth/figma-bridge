// Plan pracy w oknie wtyczki, osobno dla każdego pliku Figmy (okno pokazuje tylko plan swojego pliku).
//   node plan.mjs [--file <fileKey|fragment nazwy>] "x:zrobione" ">:w toku" "-:do zrobienia"   ustawia plan pliku (wątki komentarzy zostają)
//   node plan.mjs [--file …] --add "tekst"      dodaje zadanie w toku
//   node plan.mjs [--file …] --active "#47" / --done "#47" / --done "początek tekstu"
//   node plan.mjs [--file …] --clear-done      usuwa odhaczone
// Bez --file: plik jedynego aktywnego okna wtyczki; gdy wtyczka działa w kilku plikach, trzeba podać --file.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const H = { 'X-Bridge-Token': readFileSync(join(here, 'token.txt'), 'utf8').trim(), 'Content-Type': 'application/json' };
let a = process.argv.slice(2), file = process.env.FIGMA_FILE || undefined;
const fi = a.indexOf('--file'); if (fi >= 0) { file = a[fi + 1]; a = a.filter((_, i) => i !== fi && i !== fi + 1); }
let body;
if (a[0] === '--add') body = { add: a[1], state: 'active' };
else if (a[0] === '--active') body = { mark: a[1], state: 'active' };
else if (a[0] === '--done') body = { mark: a[1], state: 'done' };
else if (a[0] === '--clear-done') body = { clearDone: true };
else { const STATE = { x: 'done', '>': 'active', '-': 'todo' }; body = { tasks: a.map(s => ({ state: STATE[s[0]] || 'todo', text: s.replace(/^[x>-]:/, '') })) }; }
if (file) body.file = file;
const res = await fetch('http://127.0.0.1:8765/plan', { method: 'POST', headers: H, body: JSON.stringify(body) });
const r = await res.json();
if (!res.ok) { console.error('plan: ' + r.error); process.exit(1); }
console.log(r.tasks.filter(t => t.state === 'done').length + ' z ' + r.tasks.length + (r.fileName || r.file ? ' · ' + (r.fileName || r.file) : ''));
