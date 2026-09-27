// node run.mjs skrypt.js [timeoutMs] [--krok "tekst kroku planu"]   (albo: node run.mjs --status)
//
// --krok wiąże zadanie z pozycją planu: przed startem oznacza ją jako w toku,
// po udanym przebiegu jako zrobioną. Dzięki temu okno wtyczki pokazuje stan
// faktyczny, a nie to, co pamiętam o odhaczeniu.
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = readFileSync(join(here, 'token.txt'), 'utf8').trim();
const H = { 'X-Bridge-Token': TOKEN, 'Content-Type': 'application/json' };
const BASE = 'http://127.0.0.1:8765';
const argv = process.argv.slice(2);
const arg = argv[0];
if (!arg) { console.error('użycie: node run.mjs skrypt.js [timeoutMs] [--krok "tekst"] | --status'); process.exit(2); }
if (arg === '--status') { console.log(await (await fetch(BASE + '/status', { headers: H })).text()); process.exit(0); }
const iKrok = argv.indexOf('--krok');
const krok = iKrok >= 0 ? argv[iKrok + 1] : null;
const timeoutMs = Number(argv.find((v, i) => i > 0 && /^\d+$/.test(v))) || 120000;
const oznacz = async (mark, state) => {
  if (!krok) return;
  try { await fetch(BASE + '/plan', { method: 'POST', headers: H, body: JSON.stringify({ mark, state }) }); } catch (e) {}
};
// Etykieta do okna wtyczki: linia "//# opis" w skrypcie, inaczej nazwa pliku.
const code = readFileSync(arg, 'utf8');
const label = (code.match(/^\/\/#\s*(.+)$/m) || [])[1] || basename(arg).replace(/\.js$/, '');
await oznacz(krok, 'active');
const r = await fetch(BASE + '/job', { method: 'POST', headers: H, body: JSON.stringify({ code, label, timeoutMs }) });
const out = await r.json();
console.log(JSON.stringify(out, null, 1));
// Krok zostaje w toku, gdy zadanie padło — plan ma mówić prawdę, a nie pocieszać.
await oznacz(krok, out.ok ? 'done' : 'active');
process.exit(out.ok ? 0 : 1);
