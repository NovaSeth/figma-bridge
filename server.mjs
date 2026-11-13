// Local server of the Figma bridge. Listens on 127.0.0.1 only; every request needs the token from data/token.txt.
// Hands jobs to the plugin window (long poll /next), reads Figma comments over REST and, while the plugin is
// connected and its "Claude słucha komentarzy" toggle is on, gives new comments in the plugin's file to agent.mjs.
// Start: node server.mjs (install.mjs installs a LaunchAgent that keeps it running).
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDir, codeDir, dataDir, port as defaultPort } from './paths.mjs';
import { createAgent } from './agent.mjs';
import { buildPrelude, listProjects, projectFiles, projectForFile } from './project.mjs';

export function ensureToken(dir = dataDir()) {
  const file = join(dir, 'token.txt');
  if (!existsSync(file)) { mkdirSync(dir, { recursive: true }); writeFileSync(file, randomBytes(24).toString('hex'), { mode: 0o600 }); }
  return readFileSync(file, 'utf8').trim();
}
// ui.html carries the token, so it is private like token.txt. It sits next to manifest.json, which names it, and
// comes from the template of that copy: a server run from the repo must not pair its window with the installed code.js.
export function writeUi(token, port, dir = appDir(), templateDir = existsSync(join(dir, 'ui.template.html')) ? dir : codeDir) {
  const file = join(dir, 'ui.html');
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, readFileSync(join(templateDir, 'ui.template.html'), 'utf8').replace('__TOKEN__', token).replace('__PORT__', String(port)));
  chmodSync(file, 0o600);
}

// State files are read on start. One that is missing, cut off by a crash or of the wrong shape gives the
// fallback: the server must come up, since launchd would only restart it into the same file again.
const readJson = (file, fallback) => {
  try { const v = JSON.parse(readFileSync(file, 'utf8')); return v && typeof v === 'object' && Array.isArray(v) === Array.isArray(fallback) ? v : fallback; }
  catch (e) { return fallback; }
};
const readLines = file => { try { return readFileSync(file, 'utf8').split('\n').flatMap(l => { try { const v = JSON.parse(l); return v && typeof v === 'object' ? [v] : []; } catch (e) { return []; } }); } catch (e) { return []; } };
const STATES = ['todo', 'active', 'done'];
const excerpt = text => String(text).replace(/\s+/g, ' ').slice(0, 70);
const log = (...a) => console.log(new Date().toISOString(), ...a);

// options are for tests: port 0 picks a free one, figmaFetch replaces the REST client, agent the comment agent.
export function startServer({ port = defaultPort(), pollMs = 15000, connectedMs = 40000, goneMs = 5000, activeMs = 30 * 60e3, clockSlackMs = 10e3,
  headersAfterMs = 240e3, beatMs = 60e3, backoffMs = 60e3, figmaApi = process.env.BRIDGE_FIGMA_API || 'https://api.figma.com', figmaFetch = (...a) => fetch(...a), agent: agentOverride = null, agentOptions = {} } = {}) {
  const data = dataDir(), file = name => join(data, name);
  mkdirSync(file('out'), { recursive: true });
  const TOKEN = ensureToken(data);

  const queue = [], waiting = new Map();
  let seq = 0;

  // Plugin windows: one per file the plugin is open in (the same file in two tabs gives two). A window long-polls
  // /next under its own id (?win=) and names its file (?file=, /hello), so each waits on its own and a job can be
  // sent to the window of one file. A window from before window ids polls without parameters: its id is ''.
  const windows = new Map(); // id → { id, fileKey, fileName, seen, since, gone, poller }
  let currentId = '';
  const windowOf = id => { let w = windows.get(id); if (!w) windows.set(id, w = { id, fileKey: null, fileName: null, seen: 0, since: 0, gone: 0, poller: null }); return w; };
  // An answered window polls again at once. One whose long poll broke off and that has not come back was closed:
  // waiting out connectedMs for it would let a job queue for a window that is gone.
  const live = w => !!w.poller || (Date.now() - w.seen < connectedMs && !(w.gone && Date.now() - w.gone >= Math.min(connectedMs, goneMs)));
  const liveWindows = () => [...windows.values()].filter(live);
  // A job that names no file goes to the window that said hello last, and once that is gone to the one heard
  // from most recently.
  const current = () => { const c = windows.get(currentId); return c && live(c) ? c : liveWindows().sort((a, b) => b.seen - a.seen)[0] || c || null; };
  const pluginFile = () => { const c = current(); return { fileKey: c ? c.fileKey : null, fileName: c ? c.fileName : null }; };
  const fileLive = key => !!key && liveWindows().some(w => w.fileKey === key);
  const fileName = key => { const w = [...windows.values()].find(x => x.fileKey === key && x.fileName); return w ? w.fileName : null; };
  // Files a window was open in lately: their comments are still read after the plugin moved on to another file.
  const recentFiles = new Map(); // file key → last heard from
  const sawFile = key => { if (key) recentFiles.set(key, Date.now()); };

  // Events for Claude sessions (figma_comments, wait.mjs): new comments, kept in events.jsonl until picked up.
  // Nobody may be waiting, so they do not pile up for ever: after 3 days an event is stale (its thread is in the
  // plan anyway), and the 200 newest stay, one per comment.
  const EVENTS_TTL = 3 * 24 * 3600e3, EVENTS_MAX = 200;
  let events = readLines(file('events.jsonl'));
  // Everyone waiting on /events (wait.mjs, more than one session): the first in line gets what comes.
  const eventWaiters = [];
  const pruneEvents = () => {
    const now = Date.now(), ids = new Set(), n = events.length;
    events = events.filter(e => !(now - Date.parse(e.at) >= EVENTS_TTL) && !(e.id && ids.has(e.id)) && (ids.add(e.id), true)).slice(-EVENTS_MAX);
    return events.length !== n;
  };
  const saveEvents = () => { pruneEvents(); writeFileSync(file('events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : '')); };
  if (pruneEvents()) saveEvents();
  const deliver = () => { if (eventWaiters.length && events.length) { const { res, timer } = eventWaiters.shift(); clearTimeout(timer); const out = events; events = []; saveEvents(); send(res, 200, out); } };
  const pushEvent = e => { if (e.id && events.some(x => x.id === e.id)) return; events.push({ at: new Date().toISOString(), ...e }); saveEvents(); deliver(); };

  // Plan shown in the plugin window: [{ text, state: 'done'|'active'|'todo', status?, commentId?, number?, fileKey? }].
  // It is kept per Figma file: an entry carries the fileKey of the file it belongs to and shows only in that
  // file's window; an entry without one (set while no file was known) shows in every window.
  // Done steps leave after 10 s; a comment's entry stays until its thread is resolved in Figma.
  // What a client sends becomes an entry with a text and a known state: a bare string or a stray state would
  // break every later mark.
  const entry = t => (t && typeof t === 'object' ? { ...t, text: String(t.text == null ? '' : t.text), state: STATES.includes(t.state) ? t.state : 'todo' } : { text: String(t), state: 'todo' });
  let plan = readJson(file('plan.json'), []).map(entry);
  plan = plan.filter((t, i) => !t.commentId || plan.findIndex(x => x.commentId === t.commentId) === i); // one entry per thread
  // "#12" is thread 12 and nothing else ("#1" must not tick off #10 to #19); any other mark is the start of a text.
  const marked = mark => { const n = /^#(\d+)$/.exec(mark); return t => (n && t.commentId ? String(t.number) === n[1] : t.text.startsWith(mark) && !(n && /\d/.test(t.text.charAt(mark.length)))); };
  const forFile = key => plan.filter(t => !t.fileKey || t.fileKey === key);
  const DONE_TTL = 10 * 1000;
  const expiring = t => t.state === 'done' && (!t.commentId || t.resolved);
  const savePlan = () => {
    const now = Date.now();
    for (const t of plan) { if (t.state === 'done' && !t.doneAt) t.doneAt = now; if (t.state !== 'done') delete t.doneAt; }
    plan = plan.filter(t => !(expiring(t) && now - t.doneAt > DONE_TTL));
    writeFileSync(file('plan.json'), JSON.stringify(plan));
  };
  const setCommentStatus = (e, state, status) => {
    let t = plan.find(x => x.commentId === e.id);
    if (t && t.resolved) return; // closed in Figma meanwhile: a late agent status must not reopen it
    if (!t) plan.push(t = { text: '#' + e.number + ' ' + excerpt(e.text), state, commentId: e.id, number: e.number, fileKey: e.fileKey });
    t.state = state;
    if (status) t.status = status; else delete t.status;
    savePlan();
  };

  // Listening: the toggle (data/state.json, mirrored to figma.clientStorage by code.js) AND a live plugin.
  const state = { listen: false, ...readJson(file('state.json'), {}) };
  const connected = () => liveWindows().length > 0;
  const listening = () => !!state.listen && connected();
  // A comment written while nobody listened (toggle off, Figma closed, no plugin window in its file) is not acted
  // on when listening resumes; it still reaches figma_comments. Listening to a file starts when the toggle goes on
  // or a window (re)connects in it, whichever is later. The slack absorbs the difference between Figma's clock and
  // ours, and is short: a longer one acts on comments written just before the plugin came back.
  let listenSince = 0;
  const fileSince = key => Math.min(...liveWindows().filter(w => w.fileKey === key).map(w => w.since));
  const heardLive = (c, key) => Date.parse(c.created_at) >= Math.max(listenSince, fileSince(key)) - clockSlackMs;

  // Comments: the Plugin API cannot see them, so they come from the REST API (personal tokens in
  // data/figma-token*.txt, scopes file_comments:read and file_comments:write). Several tokens are several
  // accounts: each file is tried with every token and remembers the one that reached it.
  const seenFile = file('seen-comments.json');
  // figma-token.txt (what add-token.sh writes by default) first, then the named ones in order.
  const tokenFiles = () => { try { return readdirSync(data).filter(f => /^figma-token.*\.txt$/.test(f)).sort((a, b) => (b === 'figma-token.txt') - (a === 'figma-token.txt') || (a < b ? -1 : 1)); } catch (e) { return []; } };
  const tokenIn = name => { try { return readFileSync(file(name), 'utf8').trim(); } catch (e) { return ''; } };
  const tokenFor = new Map(); // file key → the token file that reached it
  const seen = readJson(seenFile, {});
  let commentsError = null, commentsCheckedAt = null, inFlight = null;
  // A rate-limited file is left alone for a while (Retry-After when Figma sends one, else a minute, doubling up
  // to an hour): asking every 15 s only keeps the limit in force.
  const paused = new Map(); // file key → { until, step, error }
  const pause = (key, r) => {
    const asked = Number(r.headers && typeof r.headers.get === 'function' && r.headers.get('retry-after')) * 1000;
    const step = Math.min(3600e3, paused.has(key) ? paused.get(key).step * 2 : backoffMs);
    const until = Date.now() + Math.min(3600e3, asked > 0 ? asked : step);
    const error = key + ': HTTP 429 (limit zapytań, przerwa do ' + new Date(until).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) + ')';
    paused.set(key, { until, step, error });
    return error;
  };
  const REST_TIMEOUT = 20000;
  const commentsState = () => !tokenFiles().length ? 'wyłączone (brak figma-token.txt)' : commentsError ? 'błąd: ' + commentsError : commentsCheckedAt ? 'działa' : 'startuje';
  const httpError = status => 'HTTP ' + status + (status === 403 || status === 404 ? ' (token bez zakresu file_comments albo bez dostępu do pliku)' : status === 429 ? ' (limit zapytań)' : '');
  // The remembered token first, then the others. A rate limit ends the round: the next token would only add to
  // it. Returns the last response, or null when no token file holds a token.
  async function figmaRest(fileKey, init = {}) {
    const names = tokenFiles(), known = tokenFor.get(fileKey);
    let r = null;
    for (const name of names.includes(known) ? [known, ...names.filter(n => n !== known)] : names) {
      const token = tokenIn(name);
      if (!token) continue;
      r = await figmaFetch(figmaApi + '/v1/files/' + encodeURIComponent(fileKey) + '/comments',
        { ...init, headers: { ...init.headers, 'X-Figma-Token': token }, signal: AbortSignal.timeout(REST_TIMEOUT) });
      if (r.ok) { tokenFor.set(fileKey, name); return r; }
      if (r.status === 429) return r;
    }
    return r;
  }

  async function postReply(fileKey, commentId, text) {
    if (!tokenFiles().length) return { ok: false, error: 'no figma-token.txt (run add-token.sh)' };
    try {
      const r = await figmaRest(fileKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, comment_id: commentId }) });
      if (!r) return { ok: false, error: 'figma-token.txt is empty (run add-token.sh)' };
      if (!r.ok) return { ok: false, error: httpError(r.status) };
      const c = await r.json().catch(() => ({}));
      // Our own reply must not come back as a new comment event. A file never polled has no entry yet: its first
      // poll only records what is there.
      if (c.id && seen[fileKey]) { seen[fileKey][c.id] = 1; writeFileSync(seenFile, JSON.stringify(seen)); }
      return { ok: true, id: c.id || null };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }

  // One poll at a time; a caller arriving mid-poll waits for it and then polls again, so it sees the latest state.
  async function pollComments() {
    while (inFlight) await inFlight;
    inFlight = pollOnce().catch(e => { commentsError = String(e.message || e); }).finally(() => { inFlight = null; });
    return inFlight;
  }
  // Idle until the plugin connects: nobody would act on the comments, and the REST API has a rate limit.
  async function pollOnce() {
    if (!connected() || !tokenFiles().length) return;
    for (const [id, w] of windows) if (id !== currentId && !live(w) && Date.now() - w.seen >= activeMs) windows.delete(id);
    // The files of every local project and every file a plugin window was open in lately (opening the plugin in
    // another file does not end the comments of the first); a broken project.json is shown, not fatal.
    let keys = [], projectsError = null;
    try { keys = listProjects().flatMap(p => p.config.files || []); } catch (e) { projectsError = e.message; }
    keys = new Set(keys);
    for (const [key, at] of recentFiles) { if (Date.now() - at < activeMs) keys.add(key); else recentFiles.delete(key); }
    const errors = [];
    let news = false;
    for (const key of keys) {
      const wait = paused.get(key);
      if (wait && Date.now() < wait.until) { errors.push(wait.error); continue; }
      try {
        const r = await figmaRest(key);
        if (!r) { errors.push('figma-token.txt jest pusty'); break; }
        if (r.status === 429) { errors.push(pause(key, r)); continue; }
        if (!r.ok) { errors.push(key + ': ' + httpError(r.status)); continue; }
        paused.delete(key);
        const list = (await r.json()).comments || [], first = !seen[key];
        seen[key] = seen[key] || {};
        const fresh = list.filter(c => !seen[key][c.id]).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
        if (first || fresh.length) news = true;
        for (const c of fresh) {
          seen[key][c.id] = 1;
          if (c.resolved_at) continue;
          const e = { type: 'comment', fileKey: key, id: c.id, number: c.order_id || null, replyTo: c.parent_id || null, author: c.user && c.user.handle,
            text: c.message, nodeId: c.client_meta && c.client_meta.node_id || null, offset: c.client_meta && c.client_meta.node_offset || null };
          if (!e.replyTo && !plan.some(t => t.commentId === e.id)) setCommentStatus(e, 'todo', null);
          // The first poll of a file puts its open threads into the plan and stops there: comments from before
          // must not wake a session or the agent.
          if (first) continue;
          pushEvent(e);
          if (!e.replyTo && state.listen && fileLive(key) && heardLive(c, key)) agent.enqueue({ ...e, fileName: fileName(key) });
        }
        // A thread resolved (or deleted) in Figma ticks its plan entry off and never reaches the agent.
        let dirty = false;
        for (const t of plan) {
          if (!t.commentId || t.resolved) continue;
          const c = list.find(x => x.id === t.commentId);
          if (c ? !c.resolved_at : t.fileKey !== key) continue;
          Object.assign(t, { state: 'done', resolved: true, doneAt: Date.now() });
          agent.cancel(t.commentId);
          dirty = true;
        }
        if (dirty) savePlan();
        commentsCheckedAt = Date.now();
      } catch (e) { errors.push(key + ': ' + String(e.message || e)); }
    }
    if (news) writeFileSync(seenFile, JSON.stringify(seen)); // not on every poll: most find nothing new
    // One file that fails must not be hidden by the next one that works.
    commentsError = errors[0] || projectsError || null;
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Bridge-Token, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const send = (res, code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  const readBody = req => new Promise((ok, fail) => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { fail(e); } }); });
  // A job that names a file waits for a window of that file; any other goes to the current window.
  const handOut = () => {
    for (let i = 0; i < queue.length; i++) {
      const { file: target, ...job } = queue[i];
      const w = target ? [...windows.values()].find(x => x.poller && x.fileKey === target) : current();
      if (!w || !w.poller) continue;
      queue.splice(i--, 1);
      const { res, timer } = w.poller;
      w.poller = null; clearTimeout(timer);
      send(res, 200, job);
    }
  };
  // `file` of a request: the key of a file the bridge knows, or a part of the name of a file a window is open in.
  const resolveFile = q => {
    const open = [...windows.values()].filter(w => w.fileKey);
    let known = open.some(w => w.fileKey === q) || plan.some(t => t.fileKey === q);
    if (!known) try { known = listProjects().some(p => (p.config.files || []).includes(q)); } catch (e) {}
    if (known) return { key: q };
    const hits = [...new Set(open.filter(w => (w.fileName || '').toLowerCase().includes(q.toLowerCase())).map(w => w.fileKey))];
    if (hits.length === 1) return { key: hits[0] };
    if (hits.length) return { error: 'several open files match ' + JSON.stringify(q) + ': ' + hits.map(k => JSON.stringify(fileName(k)) + ' ' + k).join(', ') };
    if (/^[A-Za-z0-9]{16,}$/.test(q)) return { key: q }; // a file the plugin has not been opened in yet
    return { error: 'no open file matches ' + JSON.stringify(q) + ': open the plugin in it or give its file key' };
  };

  // One queue for jobs from run.mjs/mcp.mjs (HTTP) and from the agent (in process). done(null) = timeout.
  const addJob = ({ code, label = '', dryRun = false, prelude = '', timeoutMs = 120000, file: target = null }, done) => {
    const id = 'j' + (++seq) + '-' + Date.now();
    // A timer holds 31 bits of milliseconds; given more, Node fires it at once.
    const limit = Math.min(Math.max(Number(timeoutMs) || 120000, 1), 2 ** 31 - 1);
    const timer = setTimeout(() => {
      if (!waiting.delete(id)) return;
      const i = queue.findIndex(j => j.id === id);
      if (i >= 0) queue.splice(i, 1); // never picked up: a late plugin must not run a job nobody waits for
      done(null);
    }, limit);
    waiting.set(id, { timer, done });
    queue.push({ id, code: String(code || ''), label: String(label || '').slice(0, 60), dryRun: !!dryRun, prelude: typeof prelude === 'string' ? prelude : '', file: target || null });
    handOut();
    return id;
  };
  // Whoever asked for the job is gone (a cancelled tool call, Ctrl-C on run.mjs): while still queued it is dropped.
  // One the plugin already runs cannot be stopped.
  const dropQueued = id => {
    const i = queue.findIndex(j => j.id === id), w = waiting.get(id);
    if (i < 0 || !w) return;
    queue.splice(i, 1); clearTimeout(w.timer); waiting.delete(id);
  };
  const runJob = job => new Promise(ok => addJob(job, out => ok(out || { ok: false, error: 'timeout' })));

  const project = fileKey => { const p = projectForFile(fileKey); return p && { root: p.root, prompt: projectFiles(p).agentPrompt }; };
  // A comment runs only while a plugin window is open in its file: its jobs go to that window.
  const agent = agentOverride || createAgent({ runJob, reply: postReply, setStatus: setCommentStatus, ready: e => !!state.listen && fileLive(e.fileKey), project,
    prelude: () => buildPrelude(), log: (...a) => log('agent', ...a), ...agentOptions });
  const setListen = on => {
    if (on && !state.listen) listenSince = Date.now();
    state.listen = on;
    writeFileSync(file('state.json'), JSON.stringify(state));
    if (on) agent.pump(); else agent.clear();
  };
  const listenNote = () => {
    if (!state.listen) return '';
    if (!tokenFiles().length) return 'Brak tokenu Figmy: uruchom add-token.sh';
    if (commentsError) return 'Komentarze: ' + commentsError;
    const a = agent.state();
    return a.running != null ? 'Claude pracuje nad #' + a.running + (a.queued ? ', w kolejce ' + a.queued : '') : 'Słucham nowych komentarzy';
  };
  const listenInfo = () => ({ on: !!state.listen, listening: listening(), note: listenNote() });

  let pollSoon = null;
  const schedulePoll = () => { clearTimeout(pollSoon); pollSoon = setTimeout(pollComments, 300); };
  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204);
    if (req.headers['x-bridge-token'] !== TOKEN) return send(res, 401, { error: 'bad token' });
    try {
      const url = new URL(req.url, 'http://localhost'), path = url.pathname, query = url.searchParams;
      if (req.method === 'GET' && path === '/next') {
        const w = windowOf(query.get('win') || ''), named = query.get('file'), back = !live(w);
        if (named && named !== w.fileKey) { w.fileKey = named; w.fileName = null; w.since = Date.now(); }
        // (Re)connected: what came meanwhile shows up now, and listening to the file starts over.
        if (back) { w.since = Date.now(); schedulePoll(); }
        w.seen = Date.now(); w.gone = 0;
        sawFile(w.fileKey);
        // The same window asking again: its earlier request is dead. Other windows keep theirs.
        if (w.poller) { clearTimeout(w.poller.timer); send(w.poller.res, 204); }
        w.poller = { res, timer: setTimeout(() => { if (w.poller && w.poller.res === res) { w.poller = null; send(res, 204); } }, 25000) };
        req.on('close', () => { if (w.poller && w.poller.res === res) { clearTimeout(w.poller.timer); w.poller = null; w.gone = Date.now(); } });
        handOut();
        // A window that is back without naming its file may have been reopened elsewhere: the agent waits for its
        // /hello, which says where.
        return back && !named ? undefined : agent.pump();
      }
      if (req.method === 'POST' && path === '/result') {
        const m = await readBody(req), w = waiting.get(m.id);
        if (w) {
          waiting.delete(m.id); clearTimeout(w.timer);
          const images = (m.images || []).map(i => { const p = join(data, 'out', i.name.replace(/[^\w.-]/g, '_') + '.png'); writeFileSync(p, Buffer.from(i.b64, 'base64')); return p; });
          // Dry run: the full report goes to a file, the reply carries the counts and the first 20 entries.
          let dryRun = null, dryRunReport = null;
          if (m.dryRun && typeof m.dryRun === 'object') {
            dryRunReport = join(data, 'out', 'dry-run-' + String(m.id).replace(/[^\w.-]/g, '_') + '.json');
            writeFileSync(dryRunReport, JSON.stringify(m.dryRun, null, 1));
            dryRun = { ...m.dryRun, entries: (m.dryRun.entries || []).slice(0, 20) };
          }
          w.done({ ok: m.ok, result: m.result, error: m.error, images, dryRun, dryRunReport });
        }
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/job') {
        const m = await readBody(req);
        // file: only the window of that Figma file runs the job (the plugin may be open in several files).
        const f = m.file ? resolveFile(String(m.file)) : { key: null };
        if (f.error) return send(res, 400, { ok: false, error: f.error });
        // fetch() gives up on an answer whose headers, or next piece of body, take 5 minutes, while the job runs
        // on. A long job gets its headers after 4 and a space every minute: JSON may start with whitespace, so
        // the client reads the same answer, only always as 200 (it tells by `ok`).
        let beat = null;
        const early = setTimeout(() => {
          res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); res.write(' ');
          beat = setInterval(() => res.write(' '), beatMs);
        }, headersAfterMs);
        const answer = (code, body) => { clearTimeout(early); clearInterval(beat); if (res.headersSent) res.end(JSON.stringify(body)); else send(res, code, body); };
        const id = addJob({ ...m, file: f.key }, out => (out ? answer(200, out) : answer(504, { ok: false, error: 'timeout: wtyczka nie odesłała wyniku (czy okno Claude Bridge jest otwarte' + (f.key ? ' w pliku ' + (fileName(f.key) || f.key) : '') + '?)' })));
        res.on('close', () => { clearTimeout(early); clearInterval(beat); if (!res.writableFinished) dropQueued(id); });
        return undefined;
      }
      if (req.method === 'POST' && path === '/hello') {
        const m = await readBody(req), w = windowOf(String(m.win || '')), key = m.fileKey || null;
        if (key !== w.fileKey) w.since = Date.now(); // listening to a file starts once a window is in it
        w.fileKey = key; w.fileName = m.fileName || null;
        currentId = w.id;
        sawFile(key);
        schedulePoll(); // a newly opened file gets its baseline now
        agent.pump();
        return send(res, 200, { ok: true, comments: commentsState(), listen: !!state.listen });
      }
      if (path === '/listen') {
        if (req.method === 'POST') setListen(!!(await readBody(req)).on);
        return send(res, 200, listenInfo());
      }
      // GET /plan: every entry; GET /plan?file=<key>: the plan of one file (what its plugin window shows).
      // POST changes the plan of one file, `file` (key or part of the name) or else the current window's, and
      // answers with it; the plans of other files stay as they are.
      if (path === '/plan') {
        if (req.method === 'POST') {
          const m = await readBody(req);
          const f = m.file ? resolveFile(String(m.file)) : { key: pluginFile().fileKey };
          if (f.error) return send(res, 400, { error: f.error });
          const key = f.key, mine = t => !t.fileKey || t.fileKey === key, own = t => (key ? { ...t, fileKey: key } : t);
          const state = fallback => (STATES.includes(m.state) ? m.state : fallback);
          // A new plan keeps the file's comment entries whose threads are still open.
          if (m.tasks != null) {
            const tasks = [].concat(m.tasks).map(entry);
            plan = plan.filter(t => !mine(t)).concat(tasks.map(own), plan.filter(t => mine(t) && t.commentId && !t.resolved && m.keepComments !== false && !tasks.some(x => x.commentId === t.commentId)));
          }
          if (m.add) plan.push(own({ text: String(m.add), state: state('active') }));
          if (m.mark) { const hit = marked(String(m.mark)); for (const t of plan) if (mine(t) && hit(t)) t.state = state('done'); }
          if (m.clearDone) plan = plan.filter(t => !(mine(t) && t.state === 'done'));
          savePlan();
          return send(res, 200, key ? { file: key, fileName: fileName(key), tasks: forFile(key) } : { tasks: forFile(null) });
        }
        return send(res, 200, { tasks: query.has('file') ? forFile(query.get('file') || null) : plan });
      }
      // What a plugin window shows, in one answer: it asks every 2 s.
      if (req.method === 'GET' && path === '/window') return send(res, 200, { tasks: forFile(query.get('file') || null), listen: listenInfo() });
      if (req.method === 'POST' && path === '/comments/reply') {
        const m = await readBody(req);
        if (!m.fileKey || !m.commentId || !m.text) return send(res, 400, { ok: false, error: 'fileKey, commentId and text are required' });
        const r = await postReply(String(m.fileKey), String(m.commentId), String(m.text));
        return send(res, r.ok ? 200 : 502, r);
      }
      if (req.method === 'GET' && path === '/events') {
        // Waiters queue up. Answering the earlier one to make room would send two of them (each asks again at
        // once) round in a loop.
        const waiter = { res, timer: setTimeout(() => { leave(); send(res, 204); }, 25000) };
        const leave = () => { const i = eventWaiters.indexOf(waiter); if (i >= 0) eventWaiters.splice(i, 1); clearTimeout(waiter.timer); };
        eventWaiters.push(waiter);
        req.on('close', leave);
        return deliver();
      }
      if (req.method === 'GET' && path === '/status') {
        const lastPoll = Math.max(0, ...[...windows.values()].map(w => w.seen));
        // files: every file with a plugin window open, when there is more than the current one to tell apart.
        const open = [...new Map(liveWindows().filter(w => w.fileKey).map(w => [w.fileKey, { fileKey: w.fileKey, fileName: fileName(w.fileKey) }])).values()];
        return send(res, 200, { connected: connected(), pluginSeenMsAgo: lastPoll ? Date.now() - lastPoll : null, queued: queue.length, pendingEvents: events.length,
          file: pluginFile(), ...(open.length > 1 ? { files: open } : {}), comments: commentsState(), listen: { on: !!state.listen, listening: listening() }, agent: agent.state() });
      }
      send(res, 404, { error: 'not found' });
    } catch (e) { send(res, 500, { error: String(e.message || e) }); }
  });

  const timers = [
    setInterval(() => { if (plan.some(expiring)) savePlan(); }, 2000),
    setInterval(() => { if (!inFlight) pollComments(); }, pollMs),
    setInterval(() => { if (pruneEvents()) saveEvents(); }, 3600e3),
  ];
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      writeUi(TOKEN, actual);
      console.log('Figma bridge: http://127.0.0.1:' + actual);
      ok({
        port: actual, token: TOKEN, agent, pollComments,
        close: () => new Promise(done => {
          timers.forEach(clearInterval); clearTimeout(pollSoon);
          for (const t of [...[...windows.values()].map(w => w.poller), ...eventWaiters, ...waiting.values()]) if (t) clearTimeout(t.timer);
          server.closeAllConnections(); server.close(() => done());
        }),
      });
    });
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(e => { console.error(e.code === 'EADDRINUSE' ? 'Port ' + defaultPort() + ' is taken: another bridge server is running.' : e.message); process.exit(1); });
}
