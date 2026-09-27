// Plan pracy w oknie wtyczki.
//   node plan.mjs "x:zrobione" ">:w toku" "-:do zrobienia"   ustawia plan (wpisy z komentarzy zostają)
//   node plan.mjs --add "tekst"        dodaje zadanie w toku      node plan.mjs --active "#47" / --done "#47" / --done "początek tekstu"
//   node plan.mjs --clear-done         usuwa odhaczone
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const H = { 'X-Bridge-Token': readFileSync(join(here, 'token.txt'), 'utf8').trim(), 'Content-Type': 'application/json' };
const a = process.argv.slice(2); let body;
if (a[0] === '--add') body = { add: a[1], state: 'active' };
else if (a[0] === '--active') body = { mark: a[1], state: 'active' };
else if (a[0] === '--done') body = { mark: a[1], state: 'done' };
else if (a[0] === '--clear-done') body = { clearDone: true };
else { const STATE = { x: 'done', '>': 'active', '-': 'todo' }; body = { tasks: a.map(s => ({ state: STATE[s[0]] || 'todo', text: s.replace(/^[x>-]:/, '') })) }; }
const r = await (await fetch('http://127.0.0.1:8765/plan', { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
console.log(r.tasks.filter(t => t.state === 'done').length + ' z ' + r.tasks.length);
