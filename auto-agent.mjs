// Auto-agent: nasłuchuje zdarzeń mostu i przy nowym komentarzu uruchamia Claude Code w trybie bezinteraktywnym.
// Uruchomienie: node auto-agent.mjs            Zatrzymanie: Ctrl+C
// Wymaga: działającego server.mjs, otwartego okna wtyczki w Figmie, zalogowanego `claude` w CLI.
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TOKEN = readFileSync(join(here, 'token.txt'), 'utf8').trim();
const FIGMA = existsSync(join(here, 'figma-token.txt')) ? readFileSync(join(here, 'figma-token.txt'), 'utf8').trim() : null;
const LOG = join(here, 'out', 'auto-agent.log');
const H = { 'X-Bridge-Token': TOKEN, 'Content-Type': 'application/json' };
const MAX_PER_HOUR = Number(process.env.MAX_PER_HOUR || 6);
const TIMEOUT_MS = Number(process.env.AGENT_TIMEOUT_MS || 15 * 60 * 1000);
const runs = [];

const log = line => { const s = new Date().toISOString() + '  ' + line; console.log(s); try { appendFileSync(LOG, s + '\n'); } catch (e) {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Odpowiedź w wątku: REST Figmy nie umie zamykać komentarzy, więc zostawiamy ślad, że praca jest zrobiona.
const reply = async (fileKey, commentId, text) => {
  if (!FIGMA) return;
  try {
    const r = await fetch(`https://api.figma.com/v1/files/${fileKey}/comments`, { method: 'POST', headers: { 'X-Figma-Token': FIGMA, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, comment_id: commentId }) });
    log('odpowiedź w wątku: HTTP ' + r.status);
  } catch (e) { log('odpowiedź nieudana: ' + e.message); }
};

const runAgent = prompt => new Promise(resolve => {
  const args = ['-p', prompt, '--output-format', 'json', '--permission-mode', 'dontAsk',
    '--allowedTools', 'Bash(node run.mjs:*),Bash(node plan.mjs:*),Read,Write,Edit,Glob,Grep'];
  const child = execFile('claude', args, { cwd: here, timeout: TIMEOUT_MS, maxBuffer: 5e7 }, (err, stdout, stderr) => {
    if (err) { log('agent: błąd ' + (err.killed ? 'timeout' : err.message)); if (stderr) log('stderr: ' + String(stderr).slice(0, 500)); return resolve(null); }
    try { const j = JSON.parse(stdout); log('agent: gotowe, koszt $' + (j.total_cost_usd || 0).toFixed(3) + ', sesja ' + (j.session_id || '?')); resolve(j); }
    catch (e) { log('agent: nieczytelna odpowiedź'); resolve(null); }
  });
  child.stdin && child.stdin.end();
});

const prompt = e => `Nowy komentarz w Figmie do pliku „FLibrus — mockupy aplikacji" (fileKey ${e.fileKey}).

Komentarz #${e.number} od ${e.author}:
"${e.text}"
Przypięty do węzła ${e.nodeId || '—'}${e.offset ? ` w punkcie ${Math.round(e.offset.x)},${Math.round(e.offset.y)}` : ''}.

Pracujesz w katalogu mostu do Figmy. Zadania do Figmy wysyłasz komendą: node run.mjs <plik-zadania.js> <timeout-ms>
W skrypcie zadania masz globalne: figma (Plugin API), shot(node, {name, scale}) i progress(0..1, opis).
Zasady: skrypty pisz idempotentnie i z try/catch na każdy ekran; po zmianie zrób zrzut i obejrzyj go; makiety są zbudowane z instancji komponentów ze strony „Design System" — poprawiaj komponent, nie pojedyncze instancje, jeśli zmiana dotyczy wzorca; ciemne ekrany wiążą się z kolekcją „Color Dark".
Wykonaj to, o co prosi komentarz. Na końcu napisz jednym zdaniem, co zrobiłeś.`;

log(`start: nasłuch zdarzeń, limit ${MAX_PER_HOUR}/h, timeout ${Math.round(TIMEOUT_MS / 60000)} min`);
for (;;) {
  try {
    const r = await fetch('http://127.0.0.1:8765/events', { headers: H });
    if (r.status !== 200) { if (r.status !== 204) await sleep(3000); continue; }
    const events = await r.json();
    for (const e of events.filter(x => x.type === 'comment' && !x.replyTo)) {
      const now = Date.now(); while (runs.length && now - runs[0] > 3600e3) runs.shift();
      if (runs.length >= MAX_PER_HOUR) { log(`pominięto #${e.number}: limit ${MAX_PER_HOUR}/h`); continue; }
      runs.push(now);
      log(`komentarz #${e.number}: ${String(e.text).slice(0, 80)}`);
      const out = await runAgent(prompt(e));
      if (out) await reply(e.fileKey, e.id, 'Zrobione przez Claude Code (automat). ' + String(out.result || '').slice(0, 400) + '\n\nSprawdź i zamknij wątek, jeśli się zgadza.');
    }
  } catch (err) { await sleep(2000); }
}
