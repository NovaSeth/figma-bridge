// Local server of the Figma bridge. Listens on 127.0.0.1 only; every request needs the token from data/token.txt.
// Hands jobs to the plugin windows (one per open file, each on its own long poll /next), reads Figma comments
// over REST and, while the "Claude słucha komentarzy" toggle is on, gives new comments in the files a plugin
// window is open in to agent.mjs. The endpoints are listed in AGENTS.md.
// Start: node server.mjs (install.mjs installs a LaunchAgent that keeps it running).
import http from 'node:http';
import vm from 'node:vm';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appDir, codeDir, dataDir, port as defaultPort } from './paths.mjs';
import { createAgent } from './agent.mjs';
import { buildPrelude, listProjects, projectFiles, projectForFile } from './project.mjs';

// Figma's sandbox names a syntax error without its line ("expecting ')'"). Node compiles the job the way code.js
// does (the body of an async function) without running it, so the answer can name the line in the job.
export function syntaxError(code) {
  if (typeof code !== 'string') return null;
  try { new vm.Script('(async function (figma, shot, progress, breathe) {\n' + code + '\n})', { filename: 'job', lineOffset: -1 }); return null; }
  catch (e) {
    if (!(e instanceof SyntaxError) && e.name !== 'SyntaxError') return null;
    const line = String(e.stack || '').match(/^job:(\d+)/);
    return 'syntax error' + (line ? ', line ' + line[1] : '') + ': ' + e.message;
  }
}

export function ensureToken(dir = dataDir()) {
  const file = join(dir, 'token.txt');
  if (!existsSync(file)) { mkdirSync(dir, { recursive: true }); writeFileSync(file, randomBytes(24).toString('hex'), { mode: 0o600 }); }
  return readFileSync(file, 'utf8').trim();
}
// ui.html carries the token, so it is private like token.txt. It sits next to manifest.json, which names it, and
// comes from the template of that copy: a server run from the repo must not pair its window with the installed code.js.
export function writeUi(token, port, dir = appDir(), templateDir = existsSync(join(dir, 'ui.template.html')) ? dir : codeDir) {
  const file = join(dir, 'ui.html'), fresh = file + '.' + process.pid + '.tmp';
  mkdirSync(dir, { recursive: true });
  const html = readFileSync(join(templateDir, 'ui.template.html'), 'utf8').replace('__TOKEN__', token).replace('__PORT__', String(port));
  // Private from its first byte and put in place by a rename. Written into ui.html itself, the token would be
  // readable by others until the chmod, and would go into whatever a link left under that name points at.
  rmSync(fresh, { force: true });
  writeFileSync(fresh, html, { mode: 0o600, flag: 'wx' });
  try { renameSync(fresh, file); } catch (e) { rmSync(fresh, { force: true }); throw e; }
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
const stamped = (...a) => console.log(new Date().toISOString(), ...a);

// options are for tests: port 0 picks a free one, figmaFetch replaces the REST client, agent the comment agent.
// commentsPerMinute: Figma allows a user 5 comment requests a minute on the Starter plan (25 and more on paid
// ones), over all files together; 3 leaves room for replies. BRIDGE_COMMENTS_PER_MINUTE raises it.
export function startServer({ port = defaultPort(), commentsPerMinute = Number(process.env.BRIDGE_COMMENTS_PER_MINUTE) || 3, budgetWindowMs = 60e3,
  pollMs = Math.max(2000, Math.round(60e3 / commentsPerMinute)), connectedMs = 40000, goneMs = 10000, sweepMs = 1000, activeMs = 30 * 60e3, clockSlackMs = 10e3,
  headersAfterMs = 240e3, beatMs = 60e3, backoffMs = 60e3, log = stamped, figmaApi = process.env.BRIDGE_FIGMA_API || 'https://api.figma.com', figmaFetch = (...a) => fetch(...a), agent: agentOverride = null, agentOptions = {} } = {}) {
  const data = dataDir(), file = name => join(data, name);
  mkdirSync(file('out'), { recursive: true });
  // Comment texts, screenshots, results and logs are kept here: the user's alone, wherever the home is.
  try { chmodSync(data, 0o700); } catch (e) {}
  const TOKEN = ensureToken(data);
  // Compared in constant time.
  const tokenBytes = Buffer.from(TOKEN);
  const authorized = given => { const b = Buffer.from(String(given || '')); return b.length === tokenBytes.length && timingSafeEqual(b, tokenBytes); };
  // A wrong token is something on this machine (or a page in a browser) knocking, or a plugin window from before
  // the token changed. One line a minute says so without filling the log, and never repeats what was tried.
  let rejectedAt = 0, rejectedMore = 0;
  const rejected = req => {
    if (Date.now() - rejectedAt < 60e3) { rejectedMore++; return; }
    log('rejected: bad token on ' + req.method + ' ' + String(req.url).split('?')[0] + (rejectedMore ? ' (and ' + rejectedMore + ' more since the last such line)' : ''));
    rejectedAt = Date.now(); rejectedMore = 0;
  };

  const queue = [], waiting = new Map();
  let seq = 0;

  // Plugin windows: one per file the plugin is open in (the same file in two tabs gives two). A window long-polls
  // /next under its own id (?win=) and names its file (?file=, /hello), so each waits on its own and a job can be
  // sent to the window of one file. A window from before window ids polls without parameters: its id is ''.
  const windows = new Map(); // id → { id, fileKey, fileName, openedAt, seen, since, idle, poller }
  let currentId = '';
  const windowOf = id => { let w = windows.get(id); if (!w) windows.set(id, w = { id, fileKey: null, fileName: null, openedAt: 0, seen: 0, since: 0, idle: 0, poller: null }); return w; };
  // An open window always has a poll waiting: answered (a job, or 204 after 25 s) it asks again at once, also
  // while a job runs, and after an error within seconds. One without a poll for longer (idle: since when) was
  // closed. Counting it as open would queue jobs for a window that is gone.
  const grace = Math.min(connectedMs, goneMs);
  const live = w => !!w.poller || (w.idle > 0 && Date.now() - w.idle < grace);
  const release = w => { clearTimeout(w.poller.timer); w.poller = null; w.idle = Date.now(); };
  const liveWindows = () => [...windows.values()].filter(live);
  // A job that names no file goes to the window opened last (after a lost connection every window says hello
  // again, in any order: that must not change the answer), and once that is gone to the latest one still open.
  const current = () => { const c = windows.get(currentId); return c && live(c) ? c : liveWindows().sort((a, b) => b.openedAt - a.openedAt || b.seen - a.seen)[0] || c || null; };
  const prune = () => { for (const [id, w] of windows) if (id !== currentId && !live(w) && Date.now() - w.seen >= activeMs) windows.delete(id); };
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
  // The request budget: when the comment requests of the last minute were made (reads and replies), when each
  // file was read last (the one that waited longest goes first), and what went wrong with a file last time.
  const spent = [], polledAt = new Map(), problems = new Map();
  const spend = () => { spent.push(Date.now()); };
  const left = () => { while (spent.length && Date.now() - spent[0] >= budgetWindowMs) spent.shift(); return commentsPerMinute - spent.length; };
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
  async function figmaRest(fileKey, init = {}, commentId = null) {
    const names = tokenFiles(), known = tokenFor.get(fileKey);
    let r = null;
    for (const name of names.includes(known) ? [known, ...names.filter(n => n !== known)] : names) {
      const token = tokenIn(name);
      if (!token) continue;
      r = await figmaFetch(figmaApi + '/v1/files/' + encodeURIComponent(fileKey) + '/comments' + (commentId ? '/' + encodeURIComponent(commentId) : ''),
        { ...init, headers: { ...init.headers, 'X-Figma-Token': token }, signal: AbortSignal.timeout(REST_TIMEOUT) });
      if (r.ok) { tokenFor.set(fileKey, name); return r; }
      if (r.status === 429) return r;
    }
    return r;
  }

  async function postReply(fileKey, commentId, text) {
    if (!tokenFiles().length) return { ok: false, error: 'no figma-token.txt (run add-token.sh)' };
    try {
      spend(); // a reply is never held back, but the polling makes room for it
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

  // Deleting a thread when its work is done: Figma removes the replies with it. The plan entry is ticked off at
  // once, as a thread resolved in Figma would be at the next poll.
  async function deleteThread(fileKey, commentId) {
    if (!tokenFiles().length) return { ok: false, error: 'no figma-token.txt (run add-token.sh)' };
    try {
      spend();
      const r = await figmaRest(fileKey, { method: 'DELETE' }, commentId);
      if (!r) return { ok: false, error: 'figma-token.txt is empty (run add-token.sh)' };
      if (!r.ok) return { ok: false, error: httpError(r.status) };
      const t = plan.find(x => x.commentId === commentId);
      if (t) { Object.assign(t, { state: 'done', resolved: true, doneAt: Date.now() }); savePlan(); }
      agent.cancel(commentId);
      return { ok: true };
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
    // The files of every local project and every file a plugin window was open in lately (opening the plugin in
    // another file does not end the comments of the first); a broken project.json is shown, not fatal.
    let keys = [], projectsError = null;
    try { keys = listProjects().flatMap(p => p.config.files || []); } catch (e) { projectsError = e.message; }
    keys = new Set(keys);
    for (const [key, at] of recentFiles) { if (Date.now() - at < activeMs) keys.add(key); else recentFiles.delete(key); }
    for (const key of problems.keys()) if (!keys.has(key)) problems.delete(key);
    // Within the budget, the file that waited longest first; among equals one with a plugin window open.
    const order = [...keys].sort((a, b) => (polledAt.get(a) || 0) - (polledAt.get(b) || 0) || fileLive(b) - fileLive(a));
    let news = false, noToken = false;
    for (const key of order) {
      const wait = paused.get(key);
      if (wait && Date.now() < wait.until) continue;
      if (left() <= 0) break;
      spend(); polledAt.set(key, Date.now());
      try {
        const r = await figmaRest(key);
        if (!r) { noToken = true; break; }
        if (r.status === 429) { problems.set(key, pause(key, r)); continue; }
        if (!r.ok) { problems.set(key, key + ': ' + httpError(r.status)); continue; }
        paused.delete(key); problems.delete(key);
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
      } catch (e) { problems.set(key, key + ': ' + String(e.message || e)); }
    }
    if (news) writeFileSync(seenFile, JSON.stringify(seen)); // not on every poll: most find nothing new
    // One file that fails must not be hidden by another that works, in this pass or a later one.
    commentsError = (noToken ? 'figma-token.txt jest pusty' : [...keys].map(k => problems.get(k)).find(Boolean)) || projectsError || null;
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Bridge-Token, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const send = (res, code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  // The body of a request: a JSON object (none is {}). Anything else is the caller's mistake, a 400.
  const readBody = req => new Promise((ok, fail) => {
    const parts = [];
    req.on('data', c => parts.push(c));
    req.on('end', () => {
      try {
        const m = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}');
        if (!m || typeof m !== 'object' || Array.isArray(m)) throw new Error('expected a JSON object');
        ok(m);
      } catch (e) { fail(Object.assign(new Error('bad request: ' + e.message), { status: 400 })); }
    });
  });
  // A job that names a file waits for a window of that file; any other goes to the current window. What stays
  // queued is looked at again shortly: the window it waits for may turn out closed while another sits in its
  // long poll, and nothing else would bring the job up before that poll ends.
  let again = null;
  const handOut = () => {
    for (let i = 0; i < queue.length; i++) {
      const { file: target, ...job } = queue[i]; // timeoutMs goes along: the window stops showing a job nobody waits for
      const w = target ? [...windows.values()].find(x => x.poller && x.fileKey === target) : current();
      if (!w || !w.poller) continue;
      queue.splice(i--, 1);
      const waits = waiting.get(job.id);
      if (waits) { waits.ranIn = w.fileKey; waits.win = w.id; }
      const { res } = w.poller;
      release(w);
      send(res, 200, job);
    }
    if (queue.length && !again) again = setTimeout(() => { again = null; handOut(); }, 500);
  };
  // `file` of a request: the key of a file the bridge knows, or a part of the name of a file a window is open in.
  const resolveFile = q => {
    let known = [...windows.values()].some(w => w.fileKey === q) || plan.some(t => t.fileKey === q);
    if (!known) try { known = listProjects().some(p => (p.config.files || []).includes(q)); } catch (e) {}
    if (known) return { key: q };
    // By name only among the files with a window open now: a closed one would make the name ambiguous, or take
    // a job nobody will run.
    const hits = [...new Set(liveWindows().filter(w => w.fileKey && (w.fileName || '').toLowerCase().includes(q.toLowerCase())).map(w => w.fileKey))];
    if (hits.length === 1) return { key: hits[0] };
    if (hits.length) return { error: 'several open files match ' + JSON.stringify(q) + ': ' + hits.map(k => JSON.stringify(fileName(k)) + ' ' + k).join(', ') };
    if (/^[A-Za-z0-9]{16,}$/.test(q)) return { key: q }; // a file the plugin has not been opened in yet
    return { error: 'no open file matches ' + JSON.stringify(q) + ': open the plugin in it or give its file key' };
  };

  // One queue for jobs from run.mjs/mcp.mjs (HTTP) and from the agent (in process). done(null) = timeout.
  // Every job leaves a line in the log: which, in which file, how it went. Never its code or its result.
  const addJob = ({ code, label = '', dryRun = false, prelude = '', timeoutMs = 120000, file: target = null }, answer) => {
    const id = 'j' + (++seq) + '-' + Date.now(), startedAt = Date.now();
    const done = (out, ranIn) => {
      const how = !out ? 'timeout' : out.ok ? 'ok' : 'failed';
      log('job ' + id + ' ' + JSON.stringify(String(label || '').slice(0, 60)) + ' file=' + (ranIn || target || '-') + (dryRun ? ' dry-run ' : ' ') + how + ' ' + (Date.now() - startedAt) + ' ms'
        + (out && !out.ok ? ': ' + String(out.error).replace(/\s+/g, ' ').slice(0, 200) : ''));
      answer(out);
    };
    // A timer holds 31 bits of milliseconds; given more, Node fires it at once.
    const limit = Math.min(Math.max(Number(timeoutMs) || 120000, 1), 2 ** 31 - 1);
    const timer = setTimeout(() => {
      const w = waiting.get(id);
      if (!waiting.delete(id)) return;
      const i = queue.findIndex(j => j.id === id);
      if (i >= 0) queue.splice(i, 1); // never picked up: a late plugin must not run a job nobody waits for
      done(null, w.ranIn);
    }, limit);
    waiting.set(id, { timer, done });
    queue.push({ id, code: String(code || ''), label: String(label || '').slice(0, 60), dryRun: !!dryRun, prelude: typeof prelude === 'string' ? prelude : '', timeoutMs: limit, file: target || null });
    handOut();
    return id;
  };
  // A job a window took is lost when that window closes: its caller hears so now, not at the job's timeout.
  const sweep = () => {
    for (const [id, w] of waiting) {
      if (w.win == null || (windows.has(w.win) && live(windows.get(w.win)))) continue;
      waiting.delete(id); clearTimeout(w.timer);
      w.done({ ok: false, error: 'okno wtyczki zamknęło się, zanim odesłało wynik (zadanie mogło wykonać się częściowo)' }, w.ranIn);
    }
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
    // Without any token: refused, but not worth a line (mcp.mjs asks so whether a server is there).
    if (!authorized(req.headers['x-bridge-token'])) { if (req.headers['x-bridge-token']) rejected(req); return send(res, 401, { error: 'bad token' }); }
    try {
      const url = new URL(req.url, 'http://localhost'), path = url.pathname, query = url.searchParams;
      if (req.method === 'GET' && path === '/next') {
        const w = windowOf(query.get('win') || ''), named = query.get('file'), back = !live(w);
        if (named && named !== w.fileKey) { w.fileKey = named; w.fileName = null; w.since = Date.now(); }
        // (Re)connected: what came meanwhile shows up now, and listening to the file starts over.
        if (back) { w.since = Date.now(); schedulePoll(); }
        w.seen = Date.now();
        sawFile(w.fileKey);
        // The same window asking again: its earlier request is dead. Other windows keep theirs.
        if (w.poller) { const old = w.poller.res; release(w); send(old, 204); }
        w.poller = { res, timer: setTimeout(() => { if (w.poller && w.poller.res === res) { release(w); send(res, 204); } }, 25000) };
        req.on('close', () => { if (w.poller && w.poller.res === res) release(w); });
        handOut();
        // A window that is back without naming its file may have been reopened elsewhere: the agent waits for its
        // /hello, which says where.
        return back && !named ? undefined : agent.pump();
      }
      if (req.method === 'POST' && path === '/result') {
        const m = await readBody(req), w = waiting.get(m.id);
        if (w) {
          waiting.delete(m.id); clearTimeout(w.timer);
          // Whatever goes wrong here (an image without a name, a full disk), the job is answered: its caller
          // would otherwise wait for ever, the timeout being cleared already.
          let out;
          try {
            const images = (m.images || []).map(i => { const p = join(data, 'out', String(i.name).replace(/[^\w.-]/g, '_') + '.png'); writeFileSync(p, Buffer.from(i.b64, 'base64')); return p; });
            // Dry run: the full report goes to a file, the reply carries the counts and the first 20 entries.
            let dryRun = null, dryRunReport = null;
            if (m.dryRun && typeof m.dryRun === 'object') {
              dryRunReport = join(data, 'out', 'dry-run-' + String(m.id).replace(/[^\w.-]/g, '_') + '.json');
              writeFileSync(dryRunReport, JSON.stringify(m.dryRun, null, 1));
              dryRun = { ...m.dryRun, entries: (m.dryRun.entries || []).slice(0, 20) };
            }
            out = { ok: m.ok, result: m.result, error: m.error, images, dryRun, dryRunReport };
          } catch (e) { out = { ok: false, error: 'the result could not be saved: ' + (e && e.message ? e.message : e) }; }
          w.done(out, w.ranIn);
        }
        return send(res, 200, { ok: true });
      }
      if (req.method === 'POST' && path === '/job') {
        const m = await readBody(req);
        // file: only the window of that Figma file runs the job (the plugin may be open in several files).
        const f = m.file ? resolveFile(String(m.file)) : { key: null };
        if (f.error) return send(res, 400, { ok: false, error: f.error });
        const bad = syntaxError(m.code);
        if (bad) return send(res, 400, { ok: false, error: bad });
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
        // openedAt: when the window was opened, by its own clock; a window from before it counts as opened now.
        w.openedAt = Number(m.openedAt) || w.openedAt || Date.now();
        const c = windows.get(currentId);
        if (!c || c === w || !live(c) || w.openedAt >= c.openedAt) currentId = w.id;
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
      if (req.method === 'POST' && path === '/comments/delete') {
        const m = await readBody(req);
        if (!m.fileKey || !m.commentId) return send(res, 400, { ok: false, error: 'fileKey and commentId are required' });
        const r = await deleteThread(String(m.fileKey), String(m.commentId));
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
    } catch (e) { send(res, e.status || 500, { error: String(e.message || e) }); }
  });

  const timers = [
    setInterval(() => { if (plan.some(expiring)) savePlan(); }, 2000),
    setInterval(() => { if (!inFlight) pollComments(); }, pollMs),
    setInterval(() => { if (pruneEvents()) saveEvents(); }, 3600e3),
    setInterval(prune, 60e3),
    setInterval(sweep, sweepMs),
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
          timers.forEach(clearInterval); clearTimeout(pollSoon); clearTimeout(again);
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
