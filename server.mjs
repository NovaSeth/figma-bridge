// Lokalny serwer mostu do Figmy. Słucha tylko na 127.0.0.1, każde żądanie wymaga tokenu z token.txt.
// Start: node server.mjs      Zadanie: node run.mjs skrypt.js
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
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
let plan = existsSync(planFile) ? JSON.parse(readFileSync(planFile, 'utf8')) : [];
const DONE_TTL = 10 * 1000; // odhaczone zadania znikają z listy po 10 sekundach
const savePlan = () => { const now = Date.now(); for (const t of plan) { if (t.state === 'done' && !t.doneAt) t.doneAt = now; if (t.state !== 'done') delete t.doneAt; } plan = plan.filter(t => !(t.state === 'done' && now - t.doneAt > DONE_TTL)); writeFileSync(planFile, JSON.stringify(plan)); };
setInterval(() => { if (plan.some(t => t.state === 'done')) savePlan(); }, 2000);
let eventWaiter = null, plugin = { fileKey: null, fileName: null };
const saveEvents = () => writeFileSync(eventsFile, events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''));
const deliver = () => { if (eventWaiter && events.length) { const { res, timer } = eventWaiter; eventWaiter = null; clearTimeout(timer); const out = events; events = []; saveEvents(); send(res, 200, out); } };
const pushEvent = e => { events.push({ at: new Date().toISOString(), ...e }); saveEvents(); deliver(); };
let poller = null, lastPoll = 0, seq = 0;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Bridge-Token, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const send = (res, code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
const readBody = req => new Promise((ok, fail) => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { fail(e); } }); });
const handOut = () => { if (poller && queue.length) { const { res, timer } = poller; poller = null; clearTimeout(timer); send(res, 200, queue.shift()); } };

// Komentarze: Plugin API ich nie widzi, więc czytamy je oficjalnym REST API (token osobisty w figma-token.txt, zakres file_comments:read).
const patFile = join(here, 'figma-token.txt'), seenFile = join(here, 'seen-comments.json'), watchFile = join(here, 'watch.json');
let commentsError = null, commentsCheckedAt = null;
const commentsState = () => !existsSync(patFile) ? 'wyłączone (brak figma-token.txt)' : commentsError ? 'błąd: ' + commentsError : commentsCheckedAt ? 'działa' : 'startuje';
async function pollComments() {
  if (!existsSync(patFile)) return;
  const keys = new Set(existsSync(watchFile) ? JSON.parse(readFileSync(watchFile, 'utf8')).fileKeys || [] : []);
  if (plugin.fileKey) keys.add(plugin.fileKey);
  const seen = existsSync(seenFile) ? JSON.parse(readFileSync(seenFile, 'utf8')) : {};
  for (const key of keys) {
    try {
      const r = await fetch('https://api.figma.com/v1/files/' + key + '/comments', { headers: { 'X-Figma-Token': readFileSync(patFile, 'utf8').trim() } });
      if (!r.ok) { commentsError = 'HTTP ' + r.status + (r.status === 403 ? ' (token bez zakresu file_comments:read albo bez dostępu do pliku)' : r.status === 429 ? ' (limit zapytań)' : ''); continue; }
      const list = (await r.json()).comments || [], first = !seen[key];
      seen[key] = seen[key] || {};
      for (const c of list) {
        if (seen[key][c.id]) continue;
        seen[key][c.id] = 1;
        if (first || c.resolved_at) continue; // pierwsze uruchomienie tylko zapamiętuje stan
        if (!c.parent_id) { plan.push({ text: '#' + c.order_id + ' ' + String(c.message).replace(/\s+/g, ' ').slice(0, 70), state: 'todo', commentId: c.id, number: c.order_id }); savePlan(); }
        pushEvent({ type: 'comment', fileKey: key, id: c.id, number: c.order_id || null, replyTo: c.parent_id || null, author: c.user && c.user.handle, text: c.message, nodeId: c.client_meta && c.client_meta.node_id || null, offset: c.client_meta && c.client_meta.node_offset || null });
      }
      // wątek zamknięty w Figmie → zadanie z planu odhaczone
      let dirty = false; for (const t of plan) if (t.commentId && t.state !== 'done') { const c = list.find(x => x.id === t.commentId); if (c && c.resolved_at) { t.state = 'done'; dirty = true; } } if (dirty) savePlan();
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
    if (req.method === 'GET' && req.url === '/next') {
      lastPoll = Date.now();
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
    if (req.method === 'POST' && req.url === '/hello') { plugin = { ...plugin, ...(await readBody(req)) }; return send(res, 200, { ok: true, comments: commentsState() }); }
    // Plan pracy pokazywany w oknie wtyczki: [{ text, state: 'done' | 'active' | 'todo' }]
    if (req.url === '/plan') {
      if (req.method === 'POST') { const m = await readBody(req);
        if (m.tasks) plan = m.tasks.concat(plan.filter(t => t.commentId && !m.tasks.some(x => x.commentId === t.commentId)).filter(t => m.keepComments !== false && t.state !== 'done'));
        if (m.add) plan.push({ text: String(m.add), state: m.state || 'active' });
        if (m.mark) for (const t of plan) if (t.text.startsWith(m.mark) || (t.commentId && ('#' + t.number) === m.mark)) t.state = m.state || 'done';
        if (m.clearDone) plan = plan.filter(t => t.state !== 'done');
        savePlan(); }
      return send(res, 200, { tasks: plan }); }
    if (req.method === 'GET' && req.url === '/events') {
      if (eventWaiter) { clearTimeout(eventWaiter.timer); send(eventWaiter.res, 204); }
      eventWaiter = { res, timer: setTimeout(() => { if (eventWaiter && eventWaiter.res === res) { eventWaiter = null; send(res, 204); } }, 25000) };
      req.on('close', () => { if (eventWaiter && eventWaiter.res === res) { clearTimeout(eventWaiter.timer); eventWaiter = null; } });
      return deliver();
    }
    if (req.method === 'GET' && req.url === '/status') return send(res, 200, { pluginSeenMsAgo: lastPoll ? Date.now() - lastPoll : null, queued: queue.length, pendingEvents: events.length, file: plugin, comments: commentsState() });
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => console.log('Figma bridge: http://127.0.0.1:' + PORT));
