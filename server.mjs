// Local server of the Figma bridge. Listens on 127.0.0.1 only; every request needs the token from data/token.txt.
// Hands jobs to the plugin window (long poll /next), reads Figma comments over REST and, while the plugin is
// connected and its "Claude słucha komentarzy" toggle is on, gives new comments in the plugin's file to agent.mjs.
// Start: node server.mjs (install.mjs installs a LaunchAgent that keeps it running).
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
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

const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return fallback; } };
const excerpt = text => String(text).replace(/\s+/g, ' ').slice(0, 70);
const log = (...a) => console.log(new Date().toISOString(), ...a);

// options are for tests: port 0 picks a free one, figmaFetch replaces the REST client, agent the comment agent.
export function startServer({ port = defaultPort(), pollMs = 15000, connectedMs = 40000, clockSlackMs = 10e3, figmaApi = process.env.BRIDGE_FIGMA_API || 'https://api.figma.com',
  figmaFetch = (...a) => fetch(...a), agent: agentOverride = null, agentOptions = {} } = {}) {
  const data = dataDir(), file = name => join(data, name);
  mkdirSync(file('out'), { recursive: true });
  const TOKEN = ensureToken(data);

  const queue = [], waiting = new Map();
  let poller = null, lastPoll = 0, seq = 0, plugin = { fileKey: null, fileName: null };

  // Events for Claude sessions (figma_comments, wait.mjs): new comments, kept in events.jsonl until picked up.
  let events = existsSync(file('events.jsonl')) ? readFileSync(file('events.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  let eventWaiter = null;
  const saveEvents = () => writeFileSync(file('events.jsonl'), events.map(e => JSON.stringify(e)).join('\n') + (events.length ? '\n' : ''));
  const deliver = () => { if (eventWaiter && events.length) { const { res, timer } = eventWaiter; eventWaiter = null; clearTimeout(timer); const out = events; events = []; saveEvents(); send(res, 200, out); } };
  const pushEvent = e => { events.push({ at: new Date().toISOString(), ...e }); saveEvents(); deliver(); };

  // Plan shown in the plugin window: [{ text, state: 'done'|'active'|'todo', status?, commentId?, number?, fileKey? }].
  // Done steps leave after 10 s; a comment's entry stays until its thread is resolved in Figma.
  let plan = readJson(file('plan.json'), []);
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
  const connected = () => !!poller || (lastPoll > 0 && Date.now() - lastPoll < connectedMs);
  const listening = () => !!state.listen && connected();
  // A comment written while nobody listened (toggle off, Figma closed, the plugin in another file) is not acted on
  // when listening resumes; it still reaches figma_comments. The slack absorbs the difference between Figma's clock
  // and ours, and is short: a longer one acts on comments written just before the plugin came back.
  let listenSince = 0;
  const heardLive = c => Date.parse(c.created_at) >= listenSince - clockSlackMs;

  // Comments: the Plugin API cannot see them, so they come from the REST API (personal token in
  // data/figma-token.txt, scopes file_comments:read and file_comments:write).
  const patFile = file('figma-token.txt'), seenFile = file('seen-comments.json');
  const pat = () => readFileSync(patFile, 'utf8').trim();
  const seen = readJson(seenFile, {});
  let commentsError = null, commentsCheckedAt = null, inFlight = null;
  const REST_TIMEOUT = 20000;
  const commentsState = () => !existsSync(patFile) ? 'wyłączone (brak figma-token.txt)' : commentsError ? 'błąd: ' + commentsError : commentsCheckedAt ? 'działa' : 'startuje';
  const httpError = status => 'HTTP ' + status + (status === 403 ? ' (token bez zakresu file_comments albo bez dostępu do pliku)' : status === 429 ? ' (limit zapytań)' : '');

  async function postReply(fileKey, commentId, text) {
    if (!existsSync(patFile)) return { ok: false, error: 'no figma-token.txt (run add-token.sh)' };
    try {
      const r = await figmaFetch(figmaApi + '/v1/files/' + encodeURIComponent(fileKey) + '/comments', { method: 'POST',
        headers: { 'X-Figma-Token': pat(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, comment_id: commentId }), signal: AbortSignal.timeout(REST_TIMEOUT) });
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
    if (!connected() || !existsSync(patFile)) return;
    // The plugin's file and the files of every local project; a broken project.json is shown, not fatal.
    let keys = [], projectsError = null;
    try { keys = listProjects().flatMap(p => p.config.files || []); } catch (e) { projectsError = e.message; }
    keys = new Set(keys);
    if (plugin.fileKey) keys.add(plugin.fileKey);
    for (const key of keys) {
      try {
        const r = await figmaFetch(figmaApi + '/v1/files/' + encodeURIComponent(key) + '/comments', { headers: { 'X-Figma-Token': pat() }, signal: AbortSignal.timeout(REST_TIMEOUT) });
        if (!r.ok) { commentsError = httpError(r.status); continue; }
        const list = (await r.json()).comments || [], first = !seen[key];
        seen[key] = seen[key] || {};
        const fresh = list.filter(c => !seen[key][c.id]).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
        for (const c of fresh) {
          seen[key][c.id] = 1;
          if (first || c.resolved_at) continue; // the first poll of a file only records what is there
          const e = { type: 'comment', fileKey: key, id: c.id, number: c.order_id || null, replyTo: c.parent_id || null, author: c.user && c.user.handle,
            text: c.message, nodeId: c.client_meta && c.client_meta.node_id || null, offset: c.client_meta && c.client_meta.node_offset || null };
          if (!e.replyTo) setCommentStatus(e, 'todo', null);
          pushEvent(e);
          if (!e.replyTo && key === plugin.fileKey && listening() && heardLive(c)) agent.enqueue({ ...e, fileName: plugin.fileName });
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
        commentsError = null; commentsCheckedAt = Date.now();
      } catch (e) { commentsError = String(e.message || e); }
    }
    writeFileSync(seenFile, JSON.stringify(seen));
    if (projectsError) commentsError = projectsError;
  }

  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Bridge-Token, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
  const send = (res, code, body) => { res.writeHead(code, { ...cors, 'Content-Type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
  const readBody = req => new Promise((ok, fail) => { const parts = []; req.on('data', c => parts.push(c)); req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch (e) { fail(e); } }); });
  const handOut = () => { if (poller && queue.length) { const { res, timer } = poller; poller = null; clearTimeout(timer); send(res, 200, queue.shift()); } };

  // One queue for jobs from run.mjs/mcp.mjs (HTTP) and from the agent (in process). done(null) = timeout.
  const addJob = ({ code, label = '', dryRun = false, prelude = '', timeoutMs = 120000 }, done) => {
    const id = 'j' + (++seq) + '-' + Date.now();
    const timer = setTimeout(() => {
      if (!waiting.delete(id)) return;
      const i = queue.findIndex(j => j.id === id);
      if (i >= 0) queue.splice(i, 1); // never picked up: a late plugin must not run a job nobody waits for
      done(null);
    }, timeoutMs || 120000);
    waiting.set(id, { timer, done });
    queue.push({ id, code: String(code || ''), label: String(label || '').slice(0, 60), dryRun: !!dryRun, prelude: typeof prelude === 'string' ? prelude : '' });
    handOut();
  };
  const runJob = job => new Promise(ok => addJob(job, out => ok(out || { ok: false, error: 'timeout' })));

  const project = fileKey => { const p = projectForFile(fileKey); return p && { root: p.root, prompt: projectFiles(p).agentPrompt }; };
  // Jobs go to whatever file the plugin has open, so a comment runs only while the plugin is in its file.
  const agent = agentOverride || createAgent({ runJob, reply: postReply, setStatus: setCommentStatus, ready: e => listening() && e.fileKey === plugin.fileKey, project,
    prelude: () => buildPrelude(), log: (...a) => log('agent', ...a), ...agentOptions });
  const setListen = on => {
    if (on && !state.listen) listenSince = Date.now();
    state.listen = on;
    writeFileSync(file('state.json'), JSON.stringify(state));
    if (on) agent.pump(); else agent.clear();
  };
  const listenNote = () => {
    if (!state.listen) return '';
    if (!existsSync(patFile)) return 'Brak tokenu Figmy: uruchom add-token.sh';
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
      if (req.method === 'GET' && req.url === '/next') {
        // (Re)connected: what came meanwhile shows up now. The agent waits for /hello, which names the file the
        // plugin opened in; the next /next pumps it anyway.
        const back = !connected();
        if (back) { listenSince = Date.now(); schedulePoll(); }
        lastPoll = Date.now();
        if (poller) { clearTimeout(poller.timer); send(poller.res, 204); }
        poller = { res, timer: setTimeout(() => { if (poller && poller.res === res) { poller = null; send(res, 204); } }, 25000) };
        req.on('close', () => { if (poller && poller.res === res) { clearTimeout(poller.timer); poller = null; } });
        handOut();
        return back ? undefined : agent.pump();
      }
      if (req.method === 'POST' && req.url === '/result') {
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
      if (req.method === 'POST' && req.url === '/job') {
        const m = await readBody(req);
        return addJob(m, out => out ? send(res, 200, out) : send(res, 504, { ok: false, error: 'timeout: wtyczka nie odesłała wyniku (czy okno Claude Bridge jest otwarte?)' }));
      }
      if (req.method === 'POST' && req.url === '/hello') {
        const m = await readBody(req);
        if ((m.fileKey || null) !== plugin.fileKey) listenSince = Date.now(); // listening to a file starts once the plugin is in it
        plugin = { fileKey: m.fileKey || null, fileName: m.fileName || null };
        schedulePoll(); // a newly opened file gets its baseline now
        agent.pump();
        return send(res, 200, { ok: true, comments: commentsState(), listen: !!state.listen });
      }
      if (req.url === '/listen') {
        if (req.method === 'POST') setListen(!!(await readBody(req)).on);
        return send(res, 200, listenInfo());
      }
      if (req.url === '/plan') {
        if (req.method === 'POST') {
          const m = await readBody(req);
          // A new plan keeps the comment entries whose threads are still open.
          if (m.tasks) plan = m.tasks.concat(plan.filter(t => t.commentId && !t.resolved && m.keepComments !== false && !m.tasks.some(x => x.commentId === t.commentId)));
          if (m.add) plan.push({ text: String(m.add), state: m.state || 'active' });
          if (m.mark) for (const t of plan) if (t.text.startsWith(m.mark) || (t.commentId && ('#' + t.number) === m.mark)) t.state = m.state || 'done';
          if (m.clearDone) plan = plan.filter(t => t.state !== 'done');
          savePlan();
        }
        return send(res, 200, { tasks: plan });
      }
      if (req.method === 'POST' && req.url === '/comments/reply') {
        const m = await readBody(req);
        if (!m.fileKey || !m.commentId || !m.text) return send(res, 400, { ok: false, error: 'fileKey, commentId and text are required' });
        const r = await postReply(String(m.fileKey), String(m.commentId), String(m.text));
        return send(res, r.ok ? 200 : 502, r);
      }
      if (req.method === 'GET' && req.url === '/events') {
        if (eventWaiter) { clearTimeout(eventWaiter.timer); send(eventWaiter.res, 204); }
        eventWaiter = { res, timer: setTimeout(() => { if (eventWaiter && eventWaiter.res === res) { eventWaiter = null; send(res, 204); } }, 25000) };
        req.on('close', () => { if (eventWaiter && eventWaiter.res === res) { clearTimeout(eventWaiter.timer); eventWaiter = null; } });
        return deliver();
      }
      if (req.method === 'GET' && req.url === '/status') return send(res, 200, { pluginSeenMsAgo: lastPoll ? Date.now() - lastPoll : null, queued: queue.length,
        pendingEvents: events.length, file: plugin, comments: commentsState(), listen: { on: !!state.listen, listening: listening() }, agent: agent.state() });
      send(res, 404, { error: 'not found' });
    } catch (e) { send(res, 500, { error: String(e.message || e) }); }
  });

  const timers = [
    setInterval(() => { if (plan.some(expiring)) savePlan(); }, 2000),
    setInterval(() => { if (!inFlight) pollComments(); }, pollMs),
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
          for (const t of [poller, eventWaiter, ...waiting.values()]) if (t) clearTimeout(t.timer);
          server.closeAllConnections(); server.close(() => done());
        }),
      });
    });
  });
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch(e => { console.error(e.code === 'EADDRINUSE' ? 'Port ' + defaultPort() + ' is taken: another bridge server is running.' : e.message); process.exit(1); });
}
