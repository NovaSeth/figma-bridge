// Lokalny serwer mostu do Figmy. Słucha tylko na 127.0.0.1, każde żądanie wymaga tokenu z token.txt.
// Start: node server.mjs      Zadanie: node run.mjs skrypt.js
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 8765;
const tokenFile = join(here, 'token.txt');
if (!existsSync(tokenFile)) { writeFileSync(tokenFile, randomBytes(24).toString('hex')); chmodSync(tokenFile, 0o600); }
const TOKEN = readFileSync(tokenFile, 'utf8').trim();
writeFileSync(join(here, 'ui.html'), readFileSync(join(here, 'ui.template.html'), 'utf8').replace('__TOKEN__', TOKEN));
mkdirSync(join(here, 'out'), { recursive: true });

const queue = [], waiting = new Map();
// Zdarzenia dla Claude'a: nowe komentarze w pliku. Trwałe w events.jsonl do czasu odebrania.
const eventsFile = join(here, 'events.jsonl');
let events = existsSync(eventsFile) ? readFileSync(eventsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const planFile = join(here, 'plan.json');
// Plan jest per plik Figmy: każdy wpis ma fileKey, a okno wtyczki pokazuje tylko wpisy swojego pliku.
let plan = existsSync(planFile) ? JSON.parse(readFileSync(planFile, 'utf8')) : [];
const seenFile = join(here, 'seen-comments.json'), watchFile = join(here, 'watch.json');
{ // stare wpisy bez fileKey: wątki komentarzy przypisane po seen-comments.json, pozostałe bez pliku (nie pokazują się w żadnym oknie)
  const seen0 = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : {};
  for (const t of plan) if (!t.fileKey && t.commentId) { const k = Object.keys(seen0).find(k => seen0[k][t.commentId]); if (k) t.fileKey = k; }
}
const DONE_TTL = 10 * 1000; // odhaczone zadania znikają z listy po 10 sekundach
const savePlan = () => { const now = Date.now(); for (const t of plan) { if (t.state === 'done' && !t.doneAt) t.doneAt = now; if (t.state !== 'done') delete t.doneAt; } plan = plan.filter(t => !(t.state === 'done' && now - t.doneAt > DONE_TTL)); writeFileSync(planFile, JSON.stringify(plan)); };
setInterval(() => { if (plan.some(t => t.state === 'done')) savePlan(); }, 2000);
let eventWaiter = null, plugin = { fileKey: null, fileName: null };
// Okna wtyczki w różnych plikach: fileKey → { fileName, seen } (seen = ostatnie odpytanie /next z tego pliku)
const files = {};
const ACTIVE_MS = 60 * 1000;
const activeFiles = () => Object.entries(files).filter(([, f]) => Date.now() - f.seen < ACTIVE_MS).map(([k]) => k);
// plik z parametru: dokładny fileKey albo fragment nazwy pliku; bez parametru jedyny aktywny plik
const resolveFile = q => {
  if (q) { if (files[q] || q.length > 15 && /^[A-Za-z0-9]+$/.test(q)) return { key: q };
    const hit = Object.entries(files).filter(([, f]) => (f.fileName || '').toLowerCase().includes(String(q).toLowerCase()));
    return hit.length === 1 ? { key: hit[0][0] } : { error: hit.length ? 'kilka plików pasuje do „' + q + '”: ' + hit.map(([, f]) => f.fileName).join(', ') : 'nie znam pliku „' + q + '” (otwórz w nim wtyczkę albo podaj fileKey)' }; }
  const act = activeFiles();
  if (act.length === 1) return { key: act[0] };
  return { error: act.length ? 'wtyczka działa w kilku plikach (' + act.map(k => files[k].fileName).join(', ') + '): podaj --file' : 'żadne okno wtyczki nie jest aktywne: podaj --file' };
};
const forFile = key => plan.filter(t => t.fileKey === key);
const saveEvents = () => writeFileSync(eventsFile, events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''));
const deliver = () => { if (eventWaiter && events.length) { const { res, timer } = eventWaiter; eventWaiter = null; clearTimeout(timer); const out = events; events = []; saveEvents(); send(res, 200, out); } };
const pushEvent = e => { events.push({ at: new Date().toISOString(), ...e }); saveEvents(); deliver(); };
let poller = null, lastPoll = 0, seq = 0;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Bridge-Token, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const send = (res, code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const readBody = req => new Promise((ok, fail) => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { fail(e); } }); });
const handOut = () => { if (poller && queue.length) { const { res, timer } = poller; poller = null; clearTimeout(timer); send(res, 200, queue.shift()); } };

// Komentarze: Plugin API ich nie widzi, więc czytamy je oficjalnym REST API (tokeny osobiste w figma-token*.txt, zakres file_comments:read).
// Kilka tokenów = kilka kont: dla każdego pliku próbujemy po kolei i zapamiętujemy ten, który ma do niego dostęp.
const patFiles = () => readdirSync(here).filter(f => /^figma-token.*\.txt$/.test(f)).sort();
const patFor = {};
let commentsError = null, commentsCheckedAt = null;
const commentsState = () => !patFiles().length ? 'wyłączone (brak figma-token*.txt)' : commentsError ? 'błąd: ' + commentsError : commentsCheckedAt ? 'działa' : 'startuje';
async function fetchComments(key) {
  const files = patFiles(), order = patFor[key] ? [patFor[key], ...files.filter(f => f !== patFor[key])] : files;
  let r;
  for (const f of order) {
    r = await fetch('https://api.figma.com/v1/files/' + key + '/comments', { headers: { 'X-Figma-Token': readFileSync(join(here, f), 'utf8').trim() } });
    if (r.ok) { patFor[key] = f; return r; }
    if (r.status === 429) return r;
  }
  return r;
}
async function pollComments() {
  if (!patFiles().length) return;
  const keys = new Set(existsSync(watchFile) ? JSON.parse(readFileSync(watchFile, 'utf8')).fileKeys || [] : []);
  if (plugin.fileKey) keys.add(plugin.fileKey);
  // pliki z oknem wtyczki aktywnym w ostatnich 30 min (nie tylko ostatni /hello): otwarcie wtyczki w innym pliku nie zatrzymuje odpytywania poprzedniego
  for (const [k, f] of Object.entries(files)) if (Date.now() - f.seen < 30 * 60 * 1000) keys.add(k);
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : {};
  for (const key of keys) {
    try {
      const r = await fetchComments(key);
      if (!r.ok) { commentsError = key + ': HTTP ' + r.status + (r.status === 403 || r.status === 404 ? ' (żaden token nie ma zakresu file_comments:read albo dostępu do pliku)' : r.status === 429 ? ' (limit zapytań)' : ''); continue; }
      const list = (await r.json()).comments || [], first = !seen[key];
      seen[key] = seen[key] || {};
      for (const c of list) {
        if (seen[key][c.id]) continue;
        seen[key][c.id] = 1;
        if (c.resolved_at) continue;
        // pierwsze odpytanie pliku: otwarte wątki trafiają do planu, ale bez zdarzeń (żeby nie budzić Claude'a starymi komentarzami)
        if (first) { if (!c.parent_id && !plan.some(t => t.commentId === c.id)) { plan.push({ text: '#' + c.order_id + ' ' + String(c.message).replace(/\s+/g, ' ').slice(0, 70), state: 'todo', commentId: c.id, number: c.order_id, fileKey: key }); savePlan(); } continue; }
        if (!c.parent_id) { plan.push({ text: '#' + c.order_id + ' ' + String(c.message).replace(/\s+/g, ' ').slice(0, 70), state: 'todo', commentId: c.id, number: c.order_id, fileKey: key }); savePlan(); }
        pushEvent({ type: 'comment', fileKey: key, id: c.id, number: c.order_id || null, replyTo: c.parent_id || null, author: c.user && c.user.handle, text: c.message, nodeId: c.client_meta && c.client_meta.node_id || null, offset: c.client_meta && c.client_meta.node_offset || null });
      }
      // wątek zamknięty w Figmie → zadanie z planu odhaczone
      let dirty = false; for (const t of plan) if (t.commentId && t.fileKey === key && t.state !== 'done') { const c = list.find(x => x.id === t.commentId); if (c && c.resolved_at) { t.state = 'done'; dirty = true; } } if (dirty) savePlan();
      commentsError = null; commentsCheckedAt = Date.now();
    } catch (e) { commentsError = String(e.message || e); }
  }
  writeFileSync(seenFile, JSON.stringify(seen));
}
setInterval(pollComments, 15000); setTimeout(pollComments, 1500);

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  if (req.headers['x-bridge-token'] !== TOKEN) return send(res, 401, { error: 'bad token' });
  try {
    const url = new URL(req.url, 'http://x'), qFile = url.searchParams.get('file');
    if (req.method === 'GET' && url.pathname === '/next') {
      lastPoll = Date.now();
      if (qFile) files[qFile] = { ...(files[qFile] || {}), seen: Date.now() };
      if (poller) { clearTimeout(poller.timer); send(poller.res, 204); }
      poller = { res, timer: setTimeout(() => { if (poller && poller.res === res) { poller = null; send(res, 204); } }, 25000) };
      req.on('close', () => { if (poller && poller.res === res) { clearTimeout(poller.timer); poller = null; } });
      return handOut();
    }
    if (req.method === 'POST' && req.url === '/result') {
      const m = await readBody(req), w = waiting.get(m.id);
      if (w) {
        waiting.delete(m.id); clearTimeout(w.timer);
        const images = (m.images || []).map(i => { const p = join(here, 'out', i.name.replace(/[^\w.-]/g, '_') + '.png'); writeFileSync(p, Buffer.from(i.b64, 'base64')); return p; });
        send(w.res, 200, { ok: m.ok, result: m.result, error: m.error, images });
      }
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && req.url === '/job') {
      const m = await readBody(req), id = 'j' + (++seq) + '-' + Date.now();
      const timer = setTimeout(() => { if (waiting.delete(id)) send(res, 504, { ok: false, error: 'timeout: wtyczka nie odesłała wyniku (czy okno Claude Bridge jest otwarte?)' }); }, m.timeoutMs || 120000);
      waiting.set(id, { res, timer });
      queue.push({ id, code: String(m.code || ''), label: String(m.label || '').slice(0, 60) });
      return handOut();
    }
    if (req.method === 'POST' && req.url === '/hello') { const m = await readBody(req); plugin = { ...plugin, ...m };
      if (m.fileKey) files[m.fileKey] = { ...(files[m.fileKey] || {}), fileName: m.fileName, seen: Date.now() };
      return send(res, 200, { ok: true, comments: commentsState() }); }
    // Plan pracy pokazywany w oknie wtyczki: [{ text, state: 'done' | 'active' | 'todo' }]
    // Plan pokazywany w oknie wtyczki, per plik: GET /plan?file=<fileKey> zwraca tylko wpisy tego pliku.
    // POST: tasks (zastępuje plan pliku; otwarte wątki komentarzy pliku zostają, chyba że keepComments: false), add, mark, clearDone; file = fileKey albo fragment nazwy.
    if (url.pathname === '/plan') {
      if (req.method === 'POST') { const m = await readBody(req);
        const needFile = m.tasks || m.add;
        const f = needFile || m.file ? resolveFile(m.file) : { key: null };
        if (f.error) return send(res, 400, { error: f.error });
        const key = f.key;
        if (m.tasks) {
          const mine = m.tasks.map(t => ({ ...t, fileKey: key }));
          const keepC = forFile(key).filter(t => t.commentId && !m.tasks.some(x => x.commentId === t.commentId)).filter(t => m.keepComments !== false && t.state !== 'done');
          plan = plan.filter(t => t.fileKey !== key).concat(mine, keepC);
        }
        if (m.add) plan.push({ text: String(m.add), state: m.state || 'active', fileKey: key });
        if (m.mark) for (const t of plan) if ((!key || t.fileKey === key) && (t.text.startsWith(m.mark) || (t.commentId && ('#' + t.number) === m.mark))) t.state = m.state || 'done';
        if (m.clearDone) plan = plan.filter(t => t.state !== 'done' || (key && t.fileKey !== key));
        savePlan();
        return send(res, 200, { file: key, fileName: key && files[key] ? files[key].fileName : null, tasks: key ? forFile(key) : plan }); }
      return send(res, 200, { tasks: qFile ? forFile(qFile) : plan }); }
    if (req.method === 'GET' && req.url === '/events') {
      if (eventWaiter) { clearTimeout(eventWaiter.timer); send(eventWaiter.res, 204); }
      eventWaiter = { res, timer: setTimeout(() => { if (eventWaiter && eventWaiter.res === res) { eventWaiter = null; send(res, 204); } }, 25000) };
      req.on('close', () => { if (eventWaiter && eventWaiter.res === res) { clearTimeout(eventWaiter.timer); eventWaiter = null; } });
      return deliver();
    }
    if (req.method === 'GET' && url.pathname === '/status') return send(res, 200, { pluginSeenMsAgo: lastPoll ? Date.now() - lastPoll : null, queued: queue.length, pendingEvents: events.length, file: plugin, files: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { fileName: f.fileName, seenMsAgo: f.seen ? Date.now() - f.seen : null, tasks: forFile(k).length }])), comments: commentsState() });
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => console.log('Figma bridge: http://127.0.0.1:' + PORT));
