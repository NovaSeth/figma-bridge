// Czeka na zdarzenie z Figmy (nowy komentarz), wypisuje je i kończy działanie.
// Uruchomione w tle przez Claude'a budzi sesję w chwili, gdy coś przyjdzie.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const H = { 'X-Bridge-Token': readFileSync(join(here, 'token.txt'), 'utf8').trim() };
for (;;) {
  try {
    const r = await fetch('http://127.0.0.1:8765/events', { headers: H });
    if (r.status === 200) { console.log(JSON.stringify(await r.json(), null, 1)); process.exit(0); }
    if (r.status !== 204) { console.error('most: HTTP ' + r.status); process.exit(1); }
  } catch (e) { await new Promise(ok => setTimeout(ok, 3000)); }
}
