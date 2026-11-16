// Claude's own MCP server for Figma: stdio, JSON-RPC 2.0, one message per line, zero dependencies.
// Every tool goes through the local bridge server (server.mjs) to the Claude Bridge plugin window. Tool
// descriptions and answers land in the model's context, so both stay short: plain text or one-line JSON.
//   claude mcp add --scope user figma-bridge -- node <app>/mcp.mjs      (install.mjs registers it)
// BRIDGE_NO_AUTOSTART=1: never start the bridge server, only talk to a running one.
// FIGMA_FILE=<file key>: every tool works in the plugin window of that file (agent.mjs sets it for a comment's
// session); figma_status {file} sets the same for the rest of a session.
// BRIDGE_FILE_ROOT=<folder>: figma_run {file} takes job files from that folder only (agent.mjs sets it too: a
// comment is untrusted text, and the session's own file tools are fenced to the same folder).
import { execFile, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { baseUrl, bridgeHome, codeDir, dataDir, readToken } from './paths.mjs';
import { buildPrelude, findRepoProject, projectFiles, projectForFile, selectProject } from './project.mjs';

// stdout carries the protocol and nothing else, also when a module logs.
console.log = console.info = console.debug = (...a) => console.error(...a);
const log = (...a) => console.error('[figma-bridge]', ...a);

const LABEL = 'local.claude-figma-bridge'; // the LaunchAgent install.mjs installs
const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_RUN_OUTPUT = 20000;
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
// Arguments may arrive as strings ("3", "false"); "false" must not count as true.
const clamp = (v, lo, hi, fallback) => { const n = typeof v === 'string' && v.trim() ? Number(v) : v; return typeof n === 'number' && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback; };
const flag = v => v === true || v === 'true';

// ---- tools: every word below is paid for in each session that loads the server
const p = (type, description, extra) => Object.assign({ type }, description ? { description } : {}, extra);
const schema = (properties, required) => Object.assign({ type: 'object', properties }, required ? { required } : {});
const STATE = p('string', null, { enum: ['todo', 'active', 'done'] });
const TOOLS = [
  ['figma_status', 'Plugin, file, page, selection, project, listen mode.', schema({ file: p('string', 'switch file: key or name') })],
  ['figma_inspect', 'Outline, a line per node: type, name, id, size, auto-layout, fills, text, instance props.',
    schema({ target: p('string', 'selection (default), page, file, node id or name'), depth: p('integer', 'default 3'), maxLines: p('integer', 'default 200') })],
  ['figma_find', 'Nodes by name or text on all pages: substring or /regex/.',
    schema({ query: p('string'), type: p('string', 'e.g. TEXT,INSTANCE'), page: p('string'), limit: p('integer', 'default 30') }, ['query'])],
  ['figma_library', 'Variables per mode, styles, components with variants and properties.',
    schema({ kind: p('string', null, { enum: ['variables', 'styles', 'components'] }), filter: p('string', 'substring or /regex/') }, ['kind'])],
  ['figma_run', 'Run Plugin API JS as an async function body (figma, shot(node,{name,scale}), progress, breathe); return JSON. Helpers: hex solid usePage all texts byName one loadFonts variable paintVar component instance setProp cloneVariant frame text inspect find library + project preludes. Bulk or destructive edits: dryRun:true first.',
    schema({ code: p('string'), file: p('string', 'job file path'), dryRun: p('boolean'), timeoutMs: p('integer', 'default 120000'),
      step: p('string', 'plan step'), noPrelude: p('boolean'), project: p('string', 'default: open file') })],
  ['figma_screenshot', 'PNG of nodes.', schema({ target: p('string', 'selection (default), node id or name'), scale: p('number', 'default 1'), maxSize: p('integer', 'px, default 1024') })],
  ['figma_plan', 'Plan in the plugin window.', schema({ tasks: p('array', 'replace: [{text,state}]'),
    add: p('string'), mark: p('string', 'text prefix or #N'), state: STATE, clearDone: p('boolean') })],
  ['figma_comments', 'New comments (wait ≤25 s), reply (replyTo, text), delete a thread (remove: id).',
    schema({ wait: p('integer'), replyTo: p('string', 'thread id'), text: p('string'), remove: p('string') })],
].map(([name, description, inputSchema]) => ({ name, description, inputSchema }));

// ---- bridge server
const token = () => { try { return readToken(); } catch (e) { return null; } };
async function api(path, body, timeoutMs = 15000) {
  const key = token();
  if (!key) throw new Error('no bridge token in ' + dataDir() + ': the bridge server has never run');
  let r;
  try {
    r = await fetch(baseUrl() + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Bridge-Token': key, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) { throw new Error('bridge server not reachable at ' + baseUrl() + ' (' + ((e.cause && e.cause.code) || e.name) + ')'); }
  if (r.status === 204) return null;
  if (r.status === 401) throw new Error('bridge server at ' + baseUrl() + ' rejects the token of ' + dataDir());
  const text = await r.text();
  let out;
  try { out = JSON.parse(text); } catch (e) { throw new Error(path + ': HTTP ' + r.status + ' ' + text.slice(0, 200)); }
  // A failed job or reply is an answer ({ ok: false }); any other failure must not pass for an empty result.
  if (r.status >= 400 && !(out && typeof out === 'object' && 'ok' in out)) throw new Error(path + ': HTTP ' + r.status + ' ' + ((out && out.error) || text.slice(0, 200)));
  return out;
}

// Any HTTP answer counts: a 401 still means a server is listening.
const answers = async () => { try { await fetch(baseUrl() + '/status', { signal: AbortSignal.timeout(1500) }); return true; } catch (e) { return false; } };
// Only a LaunchAgent that serves this bridge home: a test or a second home must not wake the installed server.
const kickstart = () => {
  let plist = '';
  try { plist = readFileSync(join(homedir(), 'Library', 'LaunchAgents', LABEL + '.plist'), 'utf8'); } catch (e) { return null; }
  const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); // as install.mjs writes it
  if (!process.getuid || !plist.includes('<string>' + xml(bridgeHome()) + '</string>')) return null;
  // Asynchronous: the handshake must not wait for launchctl.
  return new Promise(ok => execFile('launchctl', ['kickstart', 'gui/' + process.getuid() + '/' + LABEL], { timeout: 5000 }, e => {
    if (e) log('launchctl kickstart failed:', e.message);
    ok(e ? null : 'launchctl kickstart ' + LABEL);
  }));
};
// Without the LaunchAgent: the server next to this file, detached so it outlives the session, same BRIDGE_HOME.
const spawnServer = () => {
  const logs = join(dataDir(), 'logs');
  mkdirSync(logs, { recursive: true });
  const out = openSync(join(logs, 'server.log'), 'a');
  const child = spawn(process.execPath, [join(codeDir, 'server.mjs')], { detached: true, stdio: ['ignore', out, out], env: process.env, cwd: codeDir });
  child.unref();
  closeSync(out); // the child has its own copy
  return 'spawned server.mjs pid ' + child.pid + ', log ' + join(logs, 'server.log');
};
let starting = null;
const ensureServer = () => starting || (starting = (async () => {
  if (await answers()) return;
  if (process.env.BRIDGE_NO_AUTOSTART) throw new Error('bridge server not running at ' + baseUrl() + ' (autostart off; start it: node server.mjs)');
  const how = (await kickstart()) || spawnServer();
  log(how);
  for (let i = 0; i < 80; i++) { await sleep(100); if (await answers()) return; }
  throw new Error('bridge server did not start at ' + baseUrl() + ' (' + how + ')');
})().finally(() => { starting = null; }));

// The file this session works in: FIGMA_FILE, or what figma_status {file} chose. null: the window the plugin
// was opened in last, which the server knows. FIGMA_FILE ties the session for good: it is what keeps the session
// of a comment, which is untrusted text, in the comment's file.
const tied = process.env.FIGMA_FILE || null;
let pinned = tied;
// The server says whether a plugin window is connected; one from before that flag is judged by its last poll:
// the open window long-polls /next (25 s each), and a job sent to a closed one would only wait out its timeout.
const isConnected = s => (typeof s.connected === 'boolean' ? s.connected : s.pluginSeenMsAgo != null && s.pluginSeenMsAgo < 40000);
// Files with a plugin window open: `files` when there are several, else the current one.
const openFiles = s => (isConnected(s) ? s.files || (s.file && s.file.fileKey ? [s.file] : []) : []);
// The session's file as { fileKey, fileName, open }: the pinned one, else the server's current file.
const sessionFile = s => {
  if (!pinned) return Object.assign({ open: isConnected(s) }, s.file || {});
  let hit = openFiles(s).find(f => f.fileKey === pinned);
  // FIGMA_FILE may be a part of a file's name, as --file of run.mjs: the one open file it fits. What looks like
  // a file key is a key and nothing else.
  if (!hit && !/^[A-Za-z0-9]{16,}$/.test(pinned)) {
    const named = openFiles(s).filter(f => (f.fileName || '').toLowerCase().includes(pinned.toLowerCase()));
    if (named.length === 1) { hit = named[0]; pinned = hit.fileKey; }
  }
  return Object.assign({ fileKey: pinned, fileName: null, open: !!hit }, hit || {});
};
async function pluginStatus() {
  await ensureServer();
  const s = await api('/status'), f = sessionFile(s);
  if (!f.open) throw new Error('the Claude Bridge plugin is not open in ' + (pinned ? 'file ' + pinned : 'Figma') + ' (Plugins > Development > Claude Bridge)');
  return Object.assign(s, { file: f });
}
// file: the file the status just named. The job is sent to that file's window, not to "the current one": the
// server would choose when the job arrives, and after the current window closed that is another file.
const job = (code, { file = pinned, prelude = '', dryRun = false, timeoutMs = 60000, label = 'mcp' } = {}) =>
  api('/job', Object.assign({ code, label, timeoutMs, dryRun, prelude }, file ? { file } : {}), timeoutMs + 5000);
// Knowledge tools run a prelude helper with the built-in prelude only: a project prelude may switch pages.
async function helper(label, call, timeoutMs = 90000) {
  const s = await pluginStatus();
  const r = await job('return await ' + call + ';', { file: s.file.fileKey, prelude: buildPrelude(), label, timeoutMs });
  if (!r.ok) throw new Error(r.error);
  return String(r.result);
}
const args = (...values) => values.map(v => JSON.stringify(v)).join(', ');

// ---- handlers: string → one text block; objects are MCP results as they are
const commentFiles = new Map(); // comment id → file key, from the events this session has seen
const handlers = {
  async figma_status(a) {
    await ensureServer();
    const s = await api('/status');
    if (a.file != null && a.file !== '') {
      if (tied) throw new Error('this session is tied to file ' + tied + ' (FIGMA_FILE)');
      // The key of an open file, or a part of the name of exactly one.
      const want = String(a.file), files = openFiles(s);
      const hits = files.some(f => f.fileKey === want) ? files.filter(f => f.fileKey === want) : files.filter(f => (f.fileName || '').toLowerCase().includes(want.toLowerCase()));
      if (hits.length !== 1) throw new Error((hits.length ? 'several open files match ' : 'no open file matches ') + JSON.stringify(want) + ' (open: ' + (files.map(f => JSON.stringify(f.fileName || '') + ' ' + f.fileKey).join(', ') || 'none') + ')');
      pinned = hits[0].fileKey;
    }
    const f = sessionFile(s), up = f.open, lines = [];
    lines.push('plugin: ' + (up ? 'connected' : 'not connected (open Claude Bridge in ' + (pinned ? 'file ' + pinned : 'Figma') + ')'));
    if (f.fileKey || f.fileName) lines.push('file: ' + JSON.stringify(f.fileName || '') + ' ' + (f.fileKey || '(no key)'));
    const others = tied ? [] : openFiles(s).filter(o => o.fileKey !== f.fileKey);
    if (others.length) lines.push('other open files: ' + others.map(o => JSON.stringify(o.fileName || '') + ' ' + o.fileKey).join('; ') + ' (figma_status {file} switches)');
    if (up) {
      const r = await job('const page = figma.currentPage, sel = page.selection, clip = s => (s.length > 60 ? s.slice(0, 59) + "…" : s);\n'
        + 'return [page.name, page.id, sel.length, sel.slice(0, 10).map(n => n.id + " " + n.type + " " + JSON.stringify(clip(n.name)))];',
        { file: f.fileKey, label: 'figma_status', timeoutMs: 15000 });
      if (r.ok) {
        const [page, id, count, sel] = r.result;
        lines.push('page: ' + JSON.stringify(page) + ' ' + id, 'selection: ' + (count ? sel.join('; ') + (count > 10 ? '; … ' + (count - 10) + ' more' : '') : 'none'));
      } else lines.push('page: unknown (' + r.error + ')');
    }
    let project;
    try { project = (projectForFile(f.fileKey) || { name: 'none' }).name; } catch (e) { project = 'error: ' + e.message; }
    lines.push('project: ' + project);
    const l = s.listen;
    lines.push('listen: ' + (l && typeof l === 'object' ? (l.on ? (l.listening ? 'on' : 'on, idle') : 'off') : l ? 'on' : 'off')
      + (s.agent && s.agent.running != null ? ', agent on #' + s.agent.running + (s.agent.queued ? ' (+' + s.agent.queued + ' queued)' : '') : ''));
    if (s.comments) lines.push('comment polling: ' + s.comments);
    if (linkProblem) lines.push('link: ' + linkProblem);
    if (s.queued) lines.push('queued jobs: ' + s.queued);
    if (s.pendingEvents) lines.push('new comments: ' + s.pendingEvents + ' (figma_comments)');
    return lines.join('\n');
  },

  figma_inspect: a => helper('figma_inspect', 'inspect(' + args(a.target || 'selection', { depth: clamp(a.depth, 0, 50, 3), maxLines: clamp(a.maxLines, 1, 2000, 200) }) + ')'),
  figma_find: a => {
    if (typeof a.query !== 'string' || !a.query) throw new Error('query is required');
    return helper('figma_find', 'find(' + args(a.query, { type: a.type || null, page: a.page == null ? null : a.page, limit: clamp(a.limit, 1, 1000, 30) }) + ')');
  },
  figma_library: a => helper('figma_library', 'library(' + args(a.kind || 'variables', { filter: a.filter || null }) + ')'),

  async figma_run(a) {
    const s = await pluginStatus();
    const project = selectProject({ name: a.project || null, fileKey: s.file && s.file.fileKey });
    let code = a.code;
    if (a.file) code = readFileSync(jobFile(a.file, project), 'utf8');
    if (typeof code !== 'string' || !code.trim()) throw new Error('code or file is required');
    const dryRun = flag(a.dryRun), noPrelude = flag(a.noPrelude);
    const prelude = noPrelude ? '' : buildPrelude({ project });
    const label = (code.match(/^\/\/#\s*(.+)$/m) || [])[1] || (a.file ? basename(a.file).replace(/\.js$/, '') : 'figma_run');
    // A dry run never touches the plan; a failed step stays active, so the plan tells what really happened.
    const file = s.file.fileKey || undefined;
    const mark = state => (a.step && !dryRun ? api('/plan', { mark: String(a.step), state, file }).catch(() => null) : null);
    await mark('active');
    const timeoutMs = clamp(a.timeoutMs, 1000, 3600000, 120000);
    const r = await job(code, { file, prelude, dryRun, timeoutMs, label });
    await mark(r.ok ? 'done' : 'active');
    return { content: [{ type: 'text', text: runOutput(r, project && !noPrelude ? project.name : null) }], isError: !r.ok };
  },

  async figma_screenshot(a) {
    const s = await pluginStatus();
    const scale = clamp(a.scale, 0.01, 4, 1), maxSize = clamp(a.maxSize, 16, 4096, 1024);
    const code = `const found = await _targets(${JSON.stringify(a.target || 'selection')});
const nodes = found.nodes.filter(n => typeof n.exportAsync === 'function' && typeof n.width === 'number').slice(0, 4);
if (!nodes.length) throw new Error('nothing to export: pass a node id or name (a page cannot be exported)');
const out = [];
for (const n of nodes) {
  const scale = Math.min(${scale}, ${maxSize} / Math.max(n.width, n.height, 1));
  await shot(n, { name: 'shot-' + n.id.replace(/\\W+/g, '-'), scale: scale });
  out.push(n.id + ' ' + n.type + ' ' + JSON.stringify(n.name) + ' ' + Math.round(n.width * scale) + '×' + Math.round(n.height * scale));
}
if (found.nodes.length > 4) out.push('… ' + (found.nodes.length - 4) + ' more (4 per call)');
return out;`;
    const r = await job(code, { file: s.file.fileKey, prelude: buildPrelude(), label: 'figma_screenshot', timeoutMs: 60000 });
    if (!r.ok) throw new Error(r.error);
    const lines = r.result.map((line, i) => line + (r.images[i] ? ' ' + r.images[i] : ''));
    return { content: [{ type: 'text', text: lines.join('\n') }].concat(r.images.map(file => ({ type: 'image', data: readFileSync(file).toString('base64'), mimeType: 'image/png' }))) };
  },

  async figma_plan(a) {
    await ensureServer();
    // Always a POST: it answers with the plan of the session's file, a GET with the plans of every file.
    const body = pinned ? { file: pinned } : {};
    for (const k of ['add', 'mark', 'state', 'clearDone']) if (a[k] != null) body[k] = k === 'clearDone' ? flag(a[k]) : String(a[k]);
    // The server keeps tasks as given, and a bare string there breaks every later mark.
    if (a.tasks != null) body.tasks = [].concat(a.tasks).map(t => (t && typeof t === 'object'
      ? { text: String(t.text == null ? '' : t.text), state: STATE.enum.includes(t.state) ? t.state : 'todo' } : { text: String(t), state: 'todo' }));
    const r = await api('/plan', body), box = { done: 'x', active: '>' };
    return (r.tasks || []).map(t => '[' + (box[t.state] || ' ') + '] ' + t.text + (t.status ? ' (' + t.status + ')' : '')).join('\n') || 'plan is empty';
  },

  async figma_comments(a) {
    await ensureServer();
    if (a.remove != null) {
      const id = String(a.remove), s = await api('/status');
      const fileKey = commentFiles.get(id) || sessionFile(s).fileKey;
      if (!fileKey) throw new Error('no file known for comment ' + id + ': open its file in Figma');
      const r = await api('/comments/delete', { fileKey, commentId: id });
      if (!r.ok) throw new Error('delete failed: ' + r.error);
      return 'deleted thread ' + id;
    }
    if (a.replyTo != null || a.text != null) {
      if (!a.replyTo || !a.text) throw new Error('a reply needs replyTo and text');
      const id = String(a.replyTo), s = await api('/status');
      const fileKey = commentFiles.get(id) || sessionFile(s).fileKey;
      if (!fileKey) throw new Error('no file known for comment ' + id + ': open its file in Figma');
      const r = await api('/comments/reply', { fileKey, commentId: id, text: String(a.text) });
      if (!r.ok) throw new Error('reply failed: ' + r.error);
      return 'replied in thread ' + id + (r.id ? ' (comment ' + r.id + ')' : '');
    }
    // Polling the event count, not a long GET /events: a request cut at the deadline could take events with it.
    const deadline = Date.now() + clamp(a.wait, 0, 25, 0) * 1000;
    for (;;) {
      const s = await api('/status');
      if (s.pendingEvents > 0) {
        const events = await api('/events', undefined, 30000);
        if (events && events.length) return events.map(e => eventLine(e, sessionFile(s).fileKey)).join('\n');
      }
      const left = deadline - Date.now();
      if (left <= 0) return 'no new comments';
      await sleep(Math.min(500, left));
    }
  },
};

// Absolute, else relative to the project's jobsDir, the project folder, then the working directory.
function jobFile(file, project) {
  let hit = file;
  if (!isAbsolute(file)) {
    const bases = [];
    if (project) { const f = projectFiles(project); if (f.jobsDir) bases.push(f.jobsDir); bases.push(project.root); }
    bases.push(process.cwd());
    hit = bases.map(b => resolve(b, file)).find(f => existsSync(f));
    if (!hit) throw new Error('job file not found: ' + file + ' (looked in ' + bases.join(', ') + ')');
  }
  const fence = process.env.BRIDGE_FILE_ROOT;
  if (fence) {
    // By where the file really is: a link inside the folder may point anywhere.
    let real, root;
    try { real = realpathSync(hit); root = realpathSync(fence); } catch (e) { throw new Error('job file not found: ' + file); }
    if (!real.startsWith(root + sep)) throw new Error("job file outside the session's folder: " + file);
  }
  return hit;
}

// One-line JSON without empty fields; a huge result goes to a file and the answer keeps its start.
function runOutput(r, project) {
  const out = { ok: !!r.ok };
  if (r.ok) out.result = r.result === undefined ? null : r.result; else out.error = String(r.error).slice(0, 2000);
  if (r.images && r.images.length) out.images = r.images;
  if (r.dryRun) { out.dryRun = r.dryRun; out.dryRunReport = r.dryRunReport; }
  if (project) out.project = project;
  let text = JSON.stringify(out);
  if (r.ok && text.length > MAX_RUN_OUTPUT) {
    const full = JSON.stringify(out.result), file = join(dataDir(), 'out', 'result-' + Date.now() + '.json');
    mkdirSync(join(dataDir(), 'out'), { recursive: true });
    writeFileSync(file, full);
    out.result = full.slice(0, MAX_RUN_OUTPUT / 2) + '…';
    out.resultFile = file;
    out.resultChars = full.length;
    text = JSON.stringify(out);
  }
  return text;
}

function eventLine(e, currentFile) {
  if (e.type !== 'comment') return JSON.stringify(e);
  if (e.fileKey) { commentFiles.set(String(e.id), e.fileKey); if (e.replyTo) commentFiles.set(String(e.replyTo), e.fileKey); }
  const text = String(e.text || '').replace(/\s+/g, ' ');
  return (e.number ? '#' + e.number + ' ' : '') + 'id=' + e.id + (e.replyTo ? ' reply-to=' + e.replyTo : '') + ' @' + (e.author || '?')
    + (e.nodeId ? ' node=' + e.nodeId + (e.offset ? '@' + Math.round(e.offset.x) + ',' + Math.round(e.offset.y) : '') : '') + (e.fileKey && e.fileKey !== currentFile ? ' file=' + e.fileKey : '') + ': ' + (text.length > 500 ? text.slice(0, 499) + '…' : text);
}

// ---- JSON-RPC over stdio
const send = m => process.stdout.write(JSON.stringify(m) + '\n');
async function handle(m) {
  if (!m || typeof m !== 'object' || m.jsonrpc !== '2.0' || typeof m.method !== 'string') {
    return m && m.id !== undefined ? { jsonrpc: '2.0', id: m.id, error: { code: -32600, message: 'invalid request' } } : null;
  }
  if (m.id === undefined || m.id === null) return null; // notifications (initialized, cancelled) need no answer
  const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), params = m.params || {};
  switch (m.method) {
    case 'initialize':
      return ok({ protocolVersion: PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0], capabilities: { tools: {} }, serverInfo: { name: 'figma-bridge', version: '2.0.0' } });
    case 'ping': return ok({});
    case 'tools/list': return ok({ tools: TOOLS });
    case 'tools/call': {
      const run = Object.hasOwn(handlers, params.name) ? handlers[params.name] : null;
      if (!run) return { jsonrpc: '2.0', id: m.id, error: { code: -32602, message: 'unknown tool ' + params.name } };
      try {
        const out = await run(params.arguments || {});
        return ok(typeof out === 'string' ? { content: [{ type: 'text', text: out }] } : out);
      } catch (e) { return ok({ content: [{ type: 'text', text: 'error: ' + (e && e.message ? e.message : e) }], isError: true }); }
    }
    default: return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'method not found: ' + m.method } };
  }
}

let pending = 0, ended = false;
// Exit once the client is gone and every answer is out (a pipe write on macOS completes asynchronously).
const settle = () => { if (ended && !pending) process.stdout.write('', () => process.exit(0)); };
process.stdout.on('error', () => process.exit(0));
async function onLine(line) {
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
  pending++;
  try {
    const out = Array.isArray(msg) ? (await Promise.all(msg.map(handle))).filter(Boolean) : await handle(msg);
    if (out && (!Array.isArray(out) || out.length)) send(out);
  } finally { pending--; settle(); }
}
let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  buffer += chunk;
  for (let i; (i = buffer.indexOf('\n')) >= 0;) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); if (line) onLine(line); }
});
process.stdin.on('end', () => { if (buffer.trim()) onLine(buffer.trim()); buffer = ''; ended = true; settle(); });

// A repo that carries .figma-bridge.json gets its project linked into the bridge home; then the server is
// started in the background, so the handshake never waits for it (tool calls do). A refused link (link.mjs says
// when) is shown by figma_status: the session would otherwise work with an older copy, or none, unnoticed.
let linkProblem = null;
(async () => {
  try {
    // Not in the session of a comment: its folder is writable to it, and a .figma-bridge.json written there by
    // one session would be linked by the next.
    const repo = process.env.BRIDGE_FILE_ROOT ? null : findRepoProject(process.cwd());
    if (repo) { const { linkProject } = await import('./link.mjs'); const r = await linkProject(repo); log('linked project', r.name, '→', r.dir); }
  } catch (e) { linkProblem = e.message; log('.figma-bridge.json not linked:', e.message); }
  if (!process.env.BRIDGE_NO_AUTOSTART) ensureServer().catch(e => log(e.message));
})();
