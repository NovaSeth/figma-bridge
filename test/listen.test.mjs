// server.mjs comment mode, in process: a stubbed Figma REST API, a scripted plugin window, a recorded or real agent.
import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server.mjs';
import { REPLY_TAIL } from '../agent.mjs';
import { freePort, startUi } from './harness.mjs';
import { createFigma } from './mock-figma.mjs';

const homes = [], cleanups = [];
after(() => homes.forEach(h => rmSync(h, { recursive: true, force: true })));
// Servers and plugin loops stop even when an assertion fails halfway.
afterEach(async () => { for (const f of cleanups.splice(0).reverse()) await f(); });
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
// Waits for a condition instead of a fixed time: how long a child process takes depends on what else runs.
const until = async (check, ms = 10000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(20)) if (await check()) return true; return false; };

// A fresh bridge home with a Figma token and one local project watching OTHER.
function home() {
  const h = mkdtempSync(join(tmpdir(), 'bridge-listen-'));
  homes.push(h);
  mkdirSync(join(h, 'data'), { recursive: true });
  writeFileSync(join(h, 'data', 'figma-token.txt'), 'figd_test');
  mkdirSync(join(h, 'projects', 'demo'), { recursive: true });
  writeFileSync(join(h, 'projects', 'demo', 'project.json'), JSON.stringify({ name: 'demo', files: ['OTHER'] }));
  process.env.BRIDGE_HOME = h;
  return h;
}

// Figma REST stand-in: comments per file, POSTs recorded. access[key] = the only token that may reach that file.
function figmaRest() {
  const comments = { FILE: [], OTHER: [], SECOND: [] }, posted = [], gets = [], tokens = [], access = {};
  let status = 200, retryAfter = null;
  const reply = (body, code = status) => ({ ok: code < 300, status: code, json: async () => body, headers: { get: name => (name.toLowerCase() === 'retry-after' ? retryAfter : null) } });
  const fetch = async (url, init = {}) => {
    const key = decodeURIComponent(url.match(/\/v1\/files\/([^/]+)\/comments$/)[1]), token = init.headers['X-Figma-Token'];
    tokens.push(key + ' ' + token);
    if (access[key] && access[key] !== token) return reply({}, 403);
    if (init.method === 'POST') { posted.push({ key, token, ...JSON.parse(init.body) }); return reply({ id: 'r' + posted.length }); }
    gets.push(key);
    return reply({ comments: comments[key] || [] });
  };
  let n = 0;
  const add = (key, fields = {}) => { const c = { id: 'c' + (++n), order_id: String(n), message: 'Comment ' + n, user: { handle: 'Ann' }, created_at: new Date().toISOString(), client_meta: { node_id: '1:2' }, ...fields }; comments[key].push(c); return c; };
  return { comments, posted, gets, tokens, access, fetch, add, fail: (code, wait = null) => { status = code; retryAfter = wait; } };
}

// The plugin window: says hello, keeps a /next long poll open and answers jobs with `answer(job)`. With `win` it is
// a window of its own, as the plugin's windows are; without, a window from before window ids.
function plugin(base, token, answer = () => 'OUTLINE', { win = null, file = 'FILE', name = 'Mockups', openedAt = null } = {}) {
  const H = { 'X-Bridge-Token': token, 'Content-Type': 'application/json' };
  const controller = new AbortController();
  const jobs = [];
  let polls = 0;
  const hello = (fileKey, fileName = name) => fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ fileKey, fileName, ...(win ? { win } : {}), ...(openedAt ? { openedAt } : {}) }) });
  const loop = (async () => {
    await hello(file);
    while (!controller.signal.aborted) {
      let r;
      polls++;
      try { r = await fetch(base + '/next' + (win ? '?win=' + win + '&file=' + file : ''), { headers: H, signal: controller.signal }); } catch (e) { return; }
      if (r.status !== 200) continue;
      const job = await r.json();
      jobs.push(job);
      // Like the real window: the next poll goes out at once, the result follows when the job is done.
      (async () => fetch(base + '/result', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: true, result: await answer(job), images: [] }) }))().catch(() => {});
    }
  })();
  const stop = async () => { controller.abort(); await loop; };
  cleanups.push(stop);
  return { jobs, stop, hello, polls: () => polls };
}

async function start(options) {
  const rest = figmaRest();
  // commentsPerMinute: these tests poll by hand, many times a second; the budget has tests of its own below.
  const s = await startServer({ port: 0, pollMs: 1e6, connectedMs: 300, clockSlackMs: 0, commentsPerMinute: 1e6, figmaFetch: rest.fetch, ...options });
  cleanups.push(s.close);
  const base = 'http://127.0.0.1:' + s.port;
  const api = async (path, body) => {
    const r = await fetch(base + path, body === undefined ? { headers: { 'X-Bridge-Token': s.token } }
      : { method: 'POST', headers: { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  return { s, rest, base, api };
}

const recordingAgent = () => {
  const seen = [], calls = [];
  return { seen, calls, enqueue: e => { seen.push(e); return true; }, pump: () => {}, clear: () => calls.push('clear'), cancel: id => calls.push('cancel ' + id), state: () => ({ running: null, queued: 0 }) };
};

test('the plugin window is written next to the manifest place, with the token, private', async () => {
  const h = home();
  const { s } = await start({ agent: recordingAgent() });
  const ui = join(h, 'app', 'ui.html');
  assert.ok(readFileSync(ui, 'utf8').includes("TOKEN = '" + s.token + "'"));
  assert.equal(statSync(ui).mode & 0o777, 0o600);
  assert.equal(readFileSync(join(h, 'data', 'token.txt'), 'utf8').trim(), s.token);
  await s.close();
});

test('listening needs the toggle AND a live plugin; only new top-level comments of the plugin file reach the agent', async () => {
  const h = home();
  const agent = recordingAgent();
  const { s, rest, base, api } = await start({ agent });

  // Toggle on, plugin silent: nothing is polled at all.
  assert.deepEqual((await api('/listen', { on: true })).body, { on: true, listening: false, note: 'Słucham nowych komentarzy' });
  assert.deepEqual(JSON.parse(readFileSync(join(h, 'data', 'state.json'), 'utf8')), { listen: true });
  await s.pollComments();
  assert.deepEqual(rest.gets, []);

  // Plugin connects: the first poll of each file puts its open threads into the plan and stops there, so comments
  // from before wake neither a session nor the agent.
  rest.add('FILE', { message: 'old one' });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  assert.deepEqual([...new Set(rest.gets)].sort(), ['FILE', 'OTHER']);
  assert.equal((await api('/listen')).body.listening, true);
  assert.equal(agent.seen.length, 0);

  const top = rest.add('FILE', { message: 'Move the chip', client_meta: { node_id: '1:2', node_offset: { x: 1, y: 2 } } });
  rest.add('FILE', { parent_id: top.id, message: 'a reply' });
  rest.add('OTHER', { message: 'elsewhere' });
  await s.pollComments();
  assert.deepEqual(agent.seen.map(e => [e.id, e.fileName, e.nodeId, e.text]), [[top.id, 'Mockups', '1:2', 'Move the chip']]);
  const events = (await api('/events')).body;
  assert.deepEqual(events.map(e => e.fileKey + (e.replyTo ? ' reply' : '')).sort(), ['FILE', 'FILE reply', 'OTHER']);
  assert.deepEqual((await api('/plan')).body.tasks.map(t => t.text + ' ' + t.fileKey).sort(), ['#1 old one FILE', '#2 Move the chip FILE', '#4 elsewhere OTHER']);
  // Each window shows the plan of its own file.
  assert.deepEqual((await api('/plan?file=OTHER')).body.tasks.map(t => t.text), ['#4 elsewhere']);

  // Toggle off: polled and reported, not handed to the agent; the agent's queue is cleared.
  await api('/listen', { on: false });
  assert.deepEqual(agent.calls, ['clear']);
  rest.add('FILE', { message: 'while off' });
  await s.pollComments();
  assert.equal(agent.seen.length, 1);

  // Toggle on again, then the plugin goes silent: a comment written meanwhile is never acted on.
  await api('/listen', { on: true });
  await p.stop();
  await sleep(400);
  assert.equal((await api('/listen')).body.listening, false);
  rest.add('FILE', { message: 'while closed', created_at: new Date().toISOString() });
  await s.pollComments();
  await sleep(20);
  const p2 = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  assert.equal(agent.seen.length, 1, 'written while Figma was closed');
  rest.add('FILE', { message: 'after reconnect' });
  await s.pollComments();
  assert.deepEqual(agent.seen.map(e => e.text), ['Move the chip', 'after reconnect']);
  await p2.stop();
  await s.close();
});

test('the toggle survives a server restart; status shows it', async () => {
  home();
  const first = await start({ agent: recordingAgent() });
  await first.api('/listen', { on: true });
  await first.s.close();
  const second = await start({ agent: recordingAgent() });
  assert.equal((await second.api('/listen')).body.on, true);
  const status = (await second.api('/status')).body;
  assert.deepEqual(status.listen, { on: true, listening: false });
  assert.deepEqual(status.agent, { running: null, queued: 0 });
  // Budgets: these answers reach Claude sessions through the MCP tools.
  assert.ok(JSON.stringify((await second.api('/listen')).body).length <= 80);
  assert.ok(JSON.stringify(status).length <= 300, JSON.stringify(status).length);
  await second.s.close();
});

test('POST /comments/reply answers in a thread; our own reply is not a new comment', async () => {
  home();
  const { s, rest, base, api } = await start({ agent: recordingAgent() });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments(); // baseline, so the file has a seen list
  const r = await api('/comments/reply', { fileKey: 'FILE', commentId: 'c9', text: 'Done.' });
  assert.deepEqual(r, { status: 200, body: { ok: true, id: 'r1' } });
  assert.ok(JSON.stringify(r.body).length <= 40);
  assert.deepEqual(rest.posted, [{ key: 'FILE', token: 'figd_test', message: 'Done.', comment_id: 'c9' }]);
  rest.comments.FILE.push({ id: 'r1', parent_id: 'c9', message: 'Done.', created_at: new Date().toISOString() });
  await s.pollComments();
  assert.equal((await api('/status')).body.pendingEvents, 0);
  assert.equal((await api('/comments/reply', { fileKey: 'FILE', text: 'x' })).status, 400);
  rest.fail(403);
  const denied = await api('/comments/reply', { fileKey: 'FILE', commentId: 'c9', text: 'x' });
  assert.equal(denied.status, 502);
  assert.match(denied.body.error, /^HTTP 403 .*file_comments/);
  await p.stop();
  await s.close();
});

test('a comment in listening mode: inspect through the job queue, fake claude, reply in the thread, plan states', async () => {
  const h = home();
  const bin = join(h, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(h, 'claude-args.txt')}"\npwd > "${join(h, 'claude-cwd.txt')}"\necho '{"type":"result","subtype":"success","is_error":false,"result":"Moved the chip.","total_cost_usd":0.1,"session_id":"s"}'\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  writeFileSync(join(h, 'projects', 'demo', 'project.json'), JSON.stringify({ name: 'demo', files: ['FILE'], agentPrompt: 'prompt.md' }));
  writeFileSync(join(h, 'projects', 'demo', 'prompt.md'), 'Comment #{{number}}: {{text}}\n{{inspect}}');
  const { s, rest, base, api } = await start({ agentOptions: { env: { ...process.env, PATH: bin + ':' + process.env.PATH }, budgetUsd: 1 } });
  await api('/listen', { on: true });
  const p = plugin(base, s.token, job => (job.code.startsWith('return await inspect(') ? 'FRAME "Chip" 1:2' : null));
  await sleep(100);
  await s.pollComments();
  const c = rest.add('FILE', { message: 'Move the chip' });
  await s.pollComments();
  await s.agent.idle();
  assert.deepEqual(p.jobs.map(j => j.code), ['return await inspect("1:2", { depth: 2 })']);
  assert.ok(p.jobs[0].prelude.length > 0, 'the inspect job carries prelude.js');
  const args = readFileSync(join(h, 'claude-args.txt'), 'utf8');
  assert.ok(args.startsWith('-p\nComment #' + c.order_id + ': Move the chip\nFRAME "Chip" 1:2\n--output-format\njson\n'), args);
  assert.match(args, /--max-budget-usd\n1\n$/);
  assert.equal(readFileSync(join(h, 'claude-cwd.txt'), 'utf8').trim(), (await import('node:fs')).realpathSync(join(h, 'projects', 'demo')));
  assert.deepEqual(rest.posted, [{ key: 'FILE', token: 'figd_test', message: 'Claude: Moved the chip.\n\n' + REPLY_TAIL, comment_id: c.id }]);
  const entry = (await api('/plan')).body.tasks.find(t => t.commentId === c.id);
  assert.deepEqual([entry.state, entry.status], ['done', 'zrobione']);
  // It stays until the thread is resolved in Figma.
  await sleep(50);
  c.resolved_at = new Date().toISOString();
  await s.pollComments();
  assert.equal((await api('/plan')).body.tasks.find(t => t.commentId === c.id).resolved, true);
  assert.ok(!existsSync(join(h, 'data', 'scratch')));
  await p.stop();
  await s.close();
});

test('ui.html is built from the template next to it, so it always matches the code.js it runs with', async () => {
  const h = home();
  mkdirSync(join(h, 'app'), { recursive: true });
  writeFileSync(join(h, 'app', 'ui.template.html'), 'installed copy __TOKEN__ __PORT__');
  const { s } = await start({ agent: recordingAgent() });
  assert.equal(readFileSync(join(h, 'app', 'ui.html'), 'utf8'), 'installed copy ' + s.token + ' ' + s.port);
});

test('back in a file after working in another: comments written there meanwhile are not acted on', async () => {
  home();
  const agent = recordingAgent();
  const { s, rest, base, api } = await start({ agent });
  await api('/listen', { on: true });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  await p.hello('SECOND');
  await s.pollComments();
  rest.add('FILE', { message: 'while the plugin ran in SECOND' });
  await sleep(20);
  await p.hello('FILE');
  await s.pollComments();
  assert.equal(agent.seen.length, 0);
  rest.add('FILE', { message: 'back' });
  await s.pollComments();
  assert.deepEqual(agent.seen.map(e => e.text), ['back']);
});

test('the default clock slack is seconds, not a minute: a comment from 30 s before the plugin came back is not acted on', async () => {
  home();
  const agent = recordingAgent();
  const { s, rest, base, api } = await start({ agent, clockSlackMs: undefined });
  await api('/listen', { on: true });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  await p.stop();
  await sleep(400);
  rest.add('FILE', { message: 'while closed', created_at: new Date(Date.now() - 30e3).toISOString() });
  plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  assert.equal(agent.seen.length, 0);
});

test('a thread resolved or deleted before its turn leaves the agent queue; its plan entry goes', async () => {
  home();
  const agent = recordingAgent();
  const { s, rest, base, api } = await start({ agent });
  await api('/listen', { on: true });
  plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  const a = rest.add('FILE', { message: 'resolve me' }), b = rest.add('FILE', { message: 'delete me' });
  rest.add('OTHER', { message: 'another file' });
  await s.pollComments();
  assert.equal(agent.seen.length, 2);
  a.resolved_at = new Date().toISOString();
  rest.comments.FILE.splice(rest.comments.FILE.indexOf(b), 1);
  await s.pollComments();
  assert.deepEqual(agent.calls.sort(), ['cancel ' + a.id, 'cancel ' + b.id].sort());
  const tasks = (await api('/plan')).body.tasks;
  assert.deepEqual(tasks.map(t => [t.text, t.state, !!t.resolved]).sort(), [['#1 resolve me', 'done', true], ['#2 delete me', 'done', true], ['#3 another file', 'todo', false]]);
});

test('a run that fails after its thread was resolved does not reopen the plan entry', async () => {
  const h = home();
  const bin = join(h, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), '#!/bin/sh\nsleep 0.5\nexit 1\n');
  chmodSync(join(bin, 'claude'), 0o755);
  const { s, rest, base, api } = await start({ agentOptions: { env: { ...process.env, PATH: bin + ':' + process.env.PATH } } });
  await api('/listen', { on: true });
  plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  const c = rest.add('FILE', { client_meta: {} });
  await s.pollComments();
  assert.equal(s.agent.state().running, c.order_id);
  c.resolved_at = new Date().toISOString();
  await s.pollComments();
  await s.agent.idle();
  const entry = (await api('/plan')).body.tasks.find(t => t.commentId === c.id);
  assert.deepEqual([entry.state, entry.resolved], ['done', true]);
});

test('after a server restart the plugin window tells the new server its file again', async () => {
  const h = home();
  const port = await freePort();
  const first = await start({ agent: recordingAgent(), port });
  const ui = startUi(readFileSync(join(h, 'app', 'ui.html'), 'utf8'), createFigma());
  cleanups.push(() => ui.stop());
  const fileOf = async api => (await api('/status')).body.file.fileKey;
  // A request may land on a pooled socket of a server that is gone (the port is reused on purpose): retry it.
  const until = async (check, ms) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(50)) if (await check().catch(() => false)) return true; return false; };
  assert.ok(await until(async () => (await fileOf(first.api)) === 'TESTFILE', 5000));
  await first.s.close();
  const second = await start({ agent: recordingAgent(), port });
  assert.ok(await until(async () => (await fileOf(second.api)) === 'TESTFILE', 5000), 'the new server never learned the file');
});

test('a queued comment waits while the plugin is in another file: its jobs would land there', async () => {
  const h = home();
  const bin = join(h, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\necho x >> "${join(h, 'runs.txt')}"\nsleep 0.3\necho '{"subtype":"success","result":"Done."}'\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  const { s, rest, base, api } = await start({ agentOptions: { env: { ...process.env, PATH: bin + ':' + process.env.PATH } } });
  await api('/listen', { on: true });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  const [c1, c2] = [rest.add('FILE', { client_meta: {} }), rest.add('FILE', { client_meta: {} })];
  await s.pollComments();
  assert.deepEqual(s.agent.state(), { running: c1.order_id, queued: 1 });
  await p.hello('SECOND');
  assert.ok(await until(() => s.agent.state().running === null), 'the first run ends');
  await sleep(150); // a second run started against the rule would show by now
  assert.deepEqual(s.agent.state(), { running: null, queued: 1 });
  assert.equal(readFileSync(join(h, 'runs.txt'), 'utf8'), 'x\n');
  await p.hello('FILE');
  await s.agent.idle();
  assert.deepEqual(rest.posted.map(r => r.comment_id), [c1.id, c2.id]);
});

test('a plugin reopened after a while: /next does not start a queued comment before /hello names the file', async () => {
  const h = home();
  const bin = join(h, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\necho x >> "${join(h, 'runs.txt')}"\nsleep 0.3\necho '{"subtype":"success","result":"Done."}'\n`);
  chmodSync(join(bin, 'claude'), 0o755);
  const { s, rest, base, api } = await start({ agentOptions: { env: { ...process.env, PATH: bin + ':' + process.env.PATH } } });
  await api('/listen', { on: true });
  const p = plugin(base, s.token);
  await sleep(100);
  await s.pollComments();
  rest.add('FILE', { client_meta: {} });
  rest.add('FILE', { client_meta: {} });
  await s.pollComments();
  await p.stop();
  await sleep(400); // the plugin counts as gone
  assert.ok(await until(() => s.agent.state().running === null), 'the first run ends');
  assert.deepEqual(s.agent.state(), { running: null, queued: 1 });
  const H = { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, reopened = new AbortController();
  cleanups.push(() => reopened.abort());
  fetch(base + '/next', { headers: H, signal: reopened.signal }).catch(() => {});
  await sleep(100);
  await fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ fileKey: 'SECOND', fileName: 'Other' }) });
  await sleep(100);
  assert.deepEqual(s.agent.state(), { running: null, queued: 1 });
  assert.equal(readFileSync(join(h, 'runs.txt'), 'utf8'), 'x\n');
  await api('/listen', { on: false });
});

// ---- the plugin open in several files

const twoWindows = async (s, base) => {
  const a = plugin(base, s.token, () => 'A', { win: 'wa', file: 'FILE' });
  await sleep(50);
  const b = plugin(base, s.token, () => 'B', { win: 'wb', file: 'SECOND', name: 'Second file' });
  await sleep(100);
  return { a, b };
};

test('two plugin windows wait side by side; a job naming a file runs in that file, any other in the window opened last', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const { a, b } = await twoWindows(s, base);
  const status = (await api('/status')).body;
  assert.equal(status.connected, true);
  assert.deepEqual(status.file, { fileKey: 'SECOND', fileName: 'Second file' });
  assert.deepEqual(status.files, [{ fileKey: 'FILE', fileName: 'Mockups' }, { fileKey: 'SECOND', fileName: 'Second file' }]);
  assert.equal((await api('/job', { code: 'return 1' })).body.result, 'B');
  assert.equal((await api('/job', { code: 'return 1', file: 'FILE' })).body.result, 'A');
  assert.equal((await api('/job', { code: 'return 1', file: 'mock' })).body.result, 'A', 'a part of the file name');
  assert.equal((await api('/job', { code: 'return 1', file: 'SECOND' })).body.result, 'B');
  assert.equal(b.jobs[0].file, undefined, 'the routing stays in the server');
  const unknown = await api('/job', { code: 'return 1', file: 'nope' });
  assert.equal(unknown.status, 400);
  assert.match(unknown.body.error, /^no open file matches "nope"/);
  // A known file without a window: the job waits for one, it never runs in another file.
  const closed = await api('/job', { code: 'return 1', file: 'OTHER', timeoutMs: 150 });
  assert.equal(closed.status, 504);
  assert.equal(a.jobs.length + b.jobs.length, 4);
  // Neither window pushed the other off its long poll: one poll per job, plus the open one.
  await sleep(200);
  assert.deepEqual([a.polls(), b.polls()], [3, 3]);
  // The window opened last is closed: the other one is the current file.
  await b.stop();
  await sleep(400);
  const left = (await api('/status')).body;
  assert.deepEqual([left.file.fileKey, left.files], ['FILE', undefined]);
  assert.equal((await api('/job', { code: 'return 1' })).body.result, 'A');
});

test('a closed plugin window is noticed in seconds, not after the whole poll window', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent(), connectedMs: 40000, goneMs: 100 });
  const p = plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(100);
  assert.equal((await api('/job', { code: 'return 1' })).body.result, 1);
  await sleep(150);
  assert.equal((await api('/status')).body.connected, true, 'an answered window polls again: it stays connected');
  await p.stop();
  await sleep(200);
  assert.equal((await api('/status')).body.connected, false);
});

test('the plan is kept per file: a change names its file or goes to the current one; other files keep theirs', async () => {
  const h = home();
  // An entry from before plans were per file shows everywhere; a thread listed twice is one entry.
  writeFileSync(join(h, 'data', 'plan.json'), JSON.stringify([{ text: 'Everywhere', state: 'todo' },
    { text: '#7 twice', state: 'todo', commentId: 'x7', number: '7', fileKey: 'FILE' }, { text: '#7 twice', state: 'todo', commentId: 'x7', number: '7', fileKey: 'FILE' }]));
  const { s, base, api } = await start({ agent: recordingAgent() });
  assert.deepEqual((await api('/plan')).body.tasks.map(t => t.text), ['Everywhere', '#7 twice']);
  await twoWindows(s, base);
  const texts = async key => (await api('/plan?file=' + key)).body.tasks.map(t => t.state + ' ' + t.text);
  assert.deepEqual(await texts('SECOND'), ['todo Everywhere']);
  assert.deepEqual(await texts('FILE'), ['todo Everywhere', 'todo #7 twice']);
  // Without a file: the current window's, SECOND. Entries without a file are taken over by the first new plan.
  const set = (await api('/plan', { tasks: [{ text: 'Second step', state: 'todo' }] })).body;
  assert.deepEqual(set, { file: 'SECOND', fileName: 'Second file', tasks: [{ text: 'Second step', state: 'todo', fileKey: 'SECOND' }] });
  await api('/plan', { file: 'FILE', tasks: [{ text: 'First step', state: 'active' }] });
  assert.deepEqual((await api('/plan', { file: 'mockups', add: 'Step two' })).body.tasks.map(t => t.text), ['First step', '#7 twice', 'Step two']);
  assert.deepEqual(await texts('SECOND'), ['todo Second step']);
  await api('/plan', { file: 'SECOND', add: 'Step two', state: 'todo' });
  await api('/plan', { file: 'FILE', mark: 'Step', state: 'done' });
  assert.deepEqual(await texts('FILE'), ['active First step', 'todo #7 twice', 'done Step two']);
  assert.deepEqual(await texts('SECOND'), ['todo Second step', 'todo Step two'], 'the same text in another file is another step');
  await api('/plan', { file: 'FILE', clearDone: true });
  assert.deepEqual(await texts('FILE'), ['active First step', 'todo #7 twice']);
  const unknown = await api('/plan', { file: 'nope', add: 'x' });
  assert.equal(unknown.status, 400);
  assert.match(unknown.body.error, /^no open file matches "nope"/);
});

test('comments of a file keep coming after the plugin is opened in another one; the agent takes those of every open file', async () => {
  home();
  const agent = recordingAgent();
  const { s, rest, base, api } = await start({ agent });
  await api('/listen', { on: true });
  const { a } = await twoWindows(s, base);
  await s.pollComments(); // baselines
  const inFirst = rest.add('FILE', { message: 'in the first file' });
  rest.add('SECOND', { message: 'in the second file' });
  await s.pollComments();
  assert.deepEqual(agent.seen.map(e => [e.fileKey, e.fileName, e.text]), [['FILE', 'Mockups', 'in the first file'], ['SECOND', 'Second file', 'in the second file']]);
  assert.deepEqual((await api('/plan?file=FILE')).body.tasks.map(t => t.commentId), [inFirst.id]);
  // The first window is closed: its comments still arrive as events and plan entries, but nobody acts on them.
  await a.stop();
  await sleep(400);
  rest.add('FILE', { message: 'after closing' });
  await s.pollComments();
  assert.equal(agent.seen.length, 2);
  assert.ok((await api('/events')).body.some(e => e.text === 'after closing'));
});

test('several Figma tokens: each file is read and answered with the token that reaches it', async () => {
  const h = home();
  writeFileSync(join(h, 'data', 'figma-token-work.txt'), 'figd_work\n');
  writeFileSync(join(h, 'data', 'figma-token-empty.txt'), '');
  const { s, rest, base, api } = await start({ agent: recordingAgent() });
  rest.access.SECOND = 'figd_work';
  rest.access.OTHER = 'figd_nobody';
  plugin(base, s.token, () => 1, { win: 'w2', file: 'SECOND' });
  await sleep(100);
  await s.pollComments();
  assert.deepEqual(rest.tokens.filter(t => t.startsWith('SECOND')), ['SECOND figd_test', 'SECOND figd_work'], 'figma-token.txt first, an empty file skipped');
  rest.tokens.length = 0;
  await s.pollComments();
  assert.deepEqual(rest.tokens.filter(t => t.startsWith('SECOND')), ['SECOND figd_work'], 'the token that worked is tried first');
  assert.deepEqual((await api('/comments/reply', { fileKey: 'SECOND', commentId: 'c1', text: 'ok' })).body, { ok: true, id: 'r1' });
  assert.equal(rest.posted[0].token, 'figd_work');
  // A file no token reaches is named, and a file that works after it does not hide the error.
  assert.match((await api('/status')).body.comments, /^błąd: OTHER: HTTP 403 .*file_comments/);
});

test('events nobody picked up do not pile up: 3 days, one per comment, the 200 newest', async () => {
  const h = home();
  const at = ms => new Date(Date.now() - ms).toISOString();
  const event = (id, ms) => JSON.stringify({ at: at(ms), type: 'comment', id, text: 'e' + id });
  writeFileSync(join(h, 'data', 'events.jsonl'), [event('old', 4 * 24 * 3600e3), event('a', 60e3), event('a', 50e3), event('b', 40e3)].join('\n') + '\n');
  const first = await start({ agent: recordingAgent() });
  assert.deepEqual(readFileSync(join(h, 'data', 'events.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l).id), ['a', 'b']);
  assert.deepEqual((await first.api('/events')).body.map(e => e.id), ['a', 'b']);
  await first.s.close();
  writeFileSync(join(h, 'data', 'events.jsonl'), Array.from({ length: 250 }, (_, i) => event('n' + i, 1000)).join('\n') + '\n');
  const second = await start({ agent: recordingAgent() });
  const kept = (await second.api('/events')).body;
  assert.deepEqual([kept.length, kept[0].id, kept.at(-1).id], [200, 'n50', 'n249']);
});

// ---- staying up, staying honest

test('a job that takes longer than fetch waits for headers still gets its answer: headers early, spaces, then the result', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent(), headersAfterMs: 100, beatMs: 40 });
  plugin(base, s.token, async () => { await sleep(350); return 'late'; });
  await sleep(100);
  const H = { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, t0 = Date.now();
  const r = await fetch(base + '/job', { method: 'POST', headers: H, body: JSON.stringify({ code: 'return 1' }) });
  const headersAt = Date.now() - t0, text = await r.text();
  assert.ok(headersAt < 300, 'headers after ' + headersAt + ' ms, before the result at 350');
  assert.equal(r.status, 200);
  assert.match(text, /^ {2,}\{/, 'kept alive with whitespace, which JSON allows');
  assert.equal(JSON.parse(text).result, 'late');
  // A timeout after the headers went out is told by `ok`, the status is spent.
  const none = await fetch(base + '/job', { method: 'POST', headers: H, body: JSON.stringify({ code: 'return 1', file: 'OTHER', timeoutMs: 250 }) });
  assert.equal(none.status, 200);
  const out = await none.json();
  assert.equal(out.ok, false);
  assert.match(out.error, /^timeout/);
  // A short job is answered as before.
  assert.equal((await api('/job', { code: 'return 1', file: 'OTHER', timeoutMs: 50 })).status, 504);
});

test('state files cut off or mangled by a crash do not keep the server from starting', async () => {
  const h = home();
  writeFileSync(join(h, 'data', 'events.jsonl'), '{"at":"' + new Date().toISOString() + '","type":"comment","id":"ok1","text":"kept"}\n{"at":"2026-01-01T00:00:00Z","type":"comm\n"x"\n');
  writeFileSync(join(h, 'data', 'plan.json'), '{"not":"a list"}');
  writeFileSync(join(h, 'data', 'seen-comments.json'), '[1,2');
  writeFileSync(join(h, 'data', 'state.json'), '{"listen":tr');
  const { api } = await start({ agent: recordingAgent() });
  assert.deepEqual((await api('/plan')).body.tasks, []);
  assert.deepEqual((await api('/events')).body.map(e => e.id), ['ok1']);
  assert.equal((await api('/listen')).body.on, false);
  assert.equal((await api('/plan', { add: 'still works' })).body.tasks.length, 1);
});

test('mark "#1" ticks off thread 1, not threads 10 to 19', async () => {
  const h = home();
  writeFileSync(join(h, 'data', 'plan.json'), JSON.stringify([
    { text: '#1 first thread', state: 'todo', commentId: 'a', number: '1', fileKey: 'FILE' },
    { text: '#12 twelfth thread', state: 'todo', commentId: 'b', number: '12', fileKey: 'FILE' },
    { text: '#1 a step that only looks like a thread', state: 'todo', fileKey: 'FILE' },
    { text: '#15 another such step', state: 'todo', fileKey: 'FILE' }]));
  const { api } = await start({ agent: recordingAgent() });
  const states = async mark => (await api('/plan', { file: 'FILE', mark })).body.tasks.map(t => t.state);
  assert.deepEqual(await states('#1'), ['done', 'todo', 'done', 'todo']);
  assert.deepEqual(await states('#12'), ['done', 'done', 'done', 'todo']);
  assert.deepEqual(await states('#15 an'), ['done', 'done', 'done', 'done'], 'a text prefix still works');
});

test('plan entries sent as bare strings or with a stray state become proper steps that can be marked', async () => {
  home();
  const { api } = await start({ agent: recordingAgent() });
  await api('/plan', { tasks: ['Bare', { text: 'Odd state', state: 'bogus' }, { state: 'active' }] });
  await api('/plan', { add: 'Added', state: 'nonsense' });
  const marked = await api('/plan', { mark: 'Bare', state: 'whatever' });
  assert.equal(marked.status, 200);
  assert.deepEqual(marked.body.tasks.map(t => [t.text, t.state]), [['Bare', 'done'], ['Odd state', 'todo'], ['', 'active'], ['Added', 'active']]);
  assert.deepEqual((await api('/plan', { tasks: 'One step' })).body.tasks, [{ text: 'One step', state: 'todo' }]);
});

test('a rate-limited file is left alone until its pause is over, then read again', async () => {
  home();
  const { s, rest, base, api } = await start({ agent: recordingAgent(), backoffMs: 150 });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(450); // past the poll the window's hello schedules, so only the polls below count
  rest.tokens.length = 0;
  const asked = () => rest.tokens.filter(t => t.startsWith('FILE')).length;
  rest.fail(429);
  await s.pollComments();
  assert.equal(asked(), 1);
  await s.pollComments();
  await s.pollComments();
  assert.equal(asked(), 1, 'asking again at once only keeps the limit in force');
  assert.match((await api('/status')).body.comments, /^błąd: \w+: HTTP 429 \(limit zapytań, przerwa do \d\d:\d\d\)$/);
  rest.fail(200);
  await sleep(200);
  await s.pollComments();
  assert.equal(asked(), 2);
  assert.equal((await api('/status')).body.comments, 'działa');
});

test('Retry-After from Figma sets the pause', async () => {
  home();
  const { s, rest, base } = await start({ agent: recordingAgent(), backoffMs: 20 });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(450);
  rest.tokens.length = 0;
  const asked = () => rest.tokens.filter(t => t.startsWith('FILE')).length;
  rest.fail(429, '1');
  await s.pollComments();
  await sleep(300);
  await s.pollComments();
  assert.equal(asked(), 1, 'the second it asked for is not over, whatever our own step says');
  await sleep(800);
  await s.pollComments();
  assert.equal(asked(), 2);
});

test('seen-comments.json is written when a poll found something new, not on every poll', async () => {
  const h = home();
  const { s, rest, base } = await start({ agent: recordingAgent() });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(100);
  await s.pollComments();
  const file = join(h, 'data', 'seen-comments.json');
  assert.ok(existsSync(file), 'the first poll of a file records what is there');
  rmSync(file);
  await s.pollComments();
  assert.ok(!existsSync(file), 'nothing new: nothing to write');
  const c = rest.add('FILE');
  await s.pollComments();
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).FILE[c.id], 1);
});

test('two sessions waiting for events both keep waiting; a new comment goes to the one that asked first', async () => {
  home();
  const { s, rest, base } = await start({ agent: recordingAgent() });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(100);
  await s.pollComments();
  const H = { 'X-Bridge-Token': s.token }, stop = new AbortController();
  cleanups.push(() => stop.abort());
  const answered = [];
  const wait = name => fetch(base + '/events', { headers: H, signal: stop.signal }).then(async r => answered.push([name, r.status, r.status === 200 ? (await r.json()).map(e => e.text) : null]), () => {});
  wait('first');
  await sleep(50);
  wait('second');
  await sleep(150);
  assert.deepEqual(answered, [], 'the second one did not push the first off the line');
  rest.add('FILE', { message: 'news' });
  await s.pollComments();
  await sleep(50);
  assert.deepEqual(answered, [['first', 200, ['news']]]);
});

test('a job whose caller went away before any plugin took it leaves the queue', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const gone = new AbortController();
  fetch(base + '/job', { method: 'POST', headers: { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ code: 'figma.root.name = "late"', timeoutMs: 60000 }), signal: gone.signal }).catch(() => {});
  await sleep(100);
  assert.equal((await api('/status')).body.queued, 1);
  gone.abort();
  await sleep(100);
  assert.equal((await api('/status')).body.queued, 0, 'a plugin opened later must not run it for nobody');
});

test('a timeout longer than a timer can hold does not expire at once', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  plugin(base, s.token, async () => { await sleep(50); return 'answered'; });
  await sleep(100);
  const r = await api('/job', { code: 'return 1', timeoutMs: 1e12 });
  assert.deepEqual([r.status, r.body.result], [200, 'answered']);
});

test('GET /window gives a plugin window its plan and the listen state in one answer', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(100);
  await api('/plan', { file: 'FILE', add: 'Shown here' });
  await api('/plan', { file: 'OTHER', add: 'Not here' });
  await api('/listen', { on: true });
  const w = await api('/window?file=FILE');
  assert.equal(w.status, 200);
  assert.deepEqual(w.body, { tasks: [{ text: 'Shown here', state: 'active', fileKey: 'FILE' }], listen: { on: true, listening: true, note: 'Słucham nowych komentarzy' } });
});

// ---- found by review

test('a job waiting for the current window goes to the next one as soon as that window turns out closed', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const { b } = await twoWindows(s, base);
  await b.stop(); // the current window; for a moment it still counts as open
  await sleep(50); // the server has seen the connection drop: the job below is queued, not sent into it
  const t0 = Date.now();
  const r = await api('/job', { code: 'return 1', timeoutMs: 6000 });
  assert.deepEqual([r.status, r.body.result], [200, 'A']);
  assert.ok(Date.now() - t0 < 3000, 'handed over after ' + (Date.now() - t0) + ' ms, not at the other window\'s next poll');
});

test('the current file is the window opened last, whichever window says hello again last', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const a = plugin(base, s.token, () => 'A', { win: 'wa', file: 'FILE', openedAt: 1000 });
  await sleep(50);
  plugin(base, s.token, () => 'B', { win: 'wb', file: 'SECOND', name: 'Second file', openedAt: 2000 });
  await sleep(100);
  await a.hello('FILE'); // after a lost connection every window says hello again, in any order
  assert.equal((await api('/status')).body.file.fileKey, 'SECOND');
  assert.equal((await api('/job', { code: 'return 1' })).body.result, 'B');
});

test('a part of a file name picks among the files with an open window, not among closed ones', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const old = plugin(base, s.token, () => 'v1', { win: 'w1', file: 'FILE', name: 'Design v1' });
  await sleep(50);
  plugin(base, s.token, () => 'v2', { win: 'w2', file: 'SECOND', name: 'Design v2' });
  await sleep(100);
  assert.equal((await api('/job', { code: 'return 1', file: 'design' })).status, 400, 'two open files match');
  await old.stop();
  await sleep(400);
  const r = await api('/job', { code: 'return 1', file: 'design' });
  assert.deepEqual([r.status, r.body.result], [200, 'v2']);
});

test('a result the server cannot save still answers the job, with the reason', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const H = { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, stop = new AbortController();
  cleanups.push(() => stop.abort());
  (async () => {
    await fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ win: 'w', fileKey: 'FILE' }) });
    const job = await (await fetch(base + '/next?win=w&file=FILE', { headers: H, signal: stop.signal })).json();
    await fetch(base + '/result', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: true, result: 1, images: [null] }) });
  })().catch(() => {});
  const r = await api('/job', { code: 'return 1', timeoutMs: 1500 });
  assert.equal(r.status, 200, 'answered, not left to time out: ' + JSON.stringify(r.body));
  assert.equal(r.body.ok, false);
  assert.match(r.body.error, /^the result could not be saved: /);
});

test('a window that took a job and then closed: the job is answered within seconds, not at its timeout', async () => {
  home();
  const { s, base, api } = await start({ agent: recordingAgent() });
  const H = { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' };
  // The window takes the job and is never heard from again (closed, crashed, Figma quit).
  await fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ win: 'w', fileKey: 'FILE' }) });
  const took = fetch(base + '/next?win=w&file=FILE', { headers: H }).then(r => r.json());
  await sleep(50);
  const t0 = Date.now();
  const r = await api('/job', { code: 'return 1', timeoutMs: 20000 });
  assert.equal((await took).code, 'return 1');
  assert.ok(Date.now() - t0 < 5000, 'answered after ' + (Date.now() - t0) + ' ms');
  assert.deepEqual(r.body, { ok: false, error: 'okno wtyczki zamknęło się, zanim odesłało wynik (zadanie mogło wykonać się częściowo)' });
  // A window that is busy but there (it asked for the next job) is not mistaken for a closed one.
  const stop = new AbortController();
  cleanups.push(() => stop.abort());
  const again = fetch(base + '/next?win=w&file=FILE', { headers: H }).then(r => r.json());
  await sleep(50);
  const slow = api('/job', { code: 'return 2', timeoutMs: 20000 });
  const job = await again;
  fetch(base + '/next?win=w&file=FILE', { headers: H, signal: stop.signal }).catch(() => {}); // still polling while it works
  await sleep(1200);
  await fetch(base + '/result', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: true, result: 'done late' }) });
  assert.equal((await slow).body.result, 'done late');
});

// ---- Figma's request budget (5 comment requests a minute per user on the Starter plan)

test('comment polling stays inside a budget of requests per minute; with more files than budget they take turns', async () => {
  home(); // its project lists OTHER
  const { s, rest, base } = await start({ agent: recordingAgent(), commentsPerMinute: 2, budgetWindowMs: 400 });
  await twoWindows(s, base); // FILE and SECOND have a plugin window; the poll their hellos schedule comes later
  await s.pollComments();
  assert.deepEqual([...rest.gets].sort(), ['FILE', 'SECOND'], 'two requests: the files with a window open come first');
  await s.pollComments();
  await s.pollComments();
  assert.equal(rest.gets.length, 2, 'the budget of this minute is spent: asking more only earns a 429');
  await sleep(450);
  await s.pollComments();
  assert.deepEqual(rest.gets.slice(2), ['OTHER', rest.gets[0]], 'next minute: the file that waited longest, then the one polled first');
});

test('a reply in a thread is paid from the same budget', async () => {
  home();
  const { s, rest, base, api } = await start({ agent: recordingAgent(), commentsPerMinute: 2, budgetWindowMs: 400 });
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(900); // past the poll the window's hello schedules, and past the minute it was paid from
  rest.gets.length = 0;
  assert.equal((await api('/comments/reply', { fileKey: 'FILE', commentId: 'c1', text: 'Done.' })).status, 200);
  await s.pollComments();
  assert.equal(rest.gets.length, 1, 'one request left this minute after the reply');
});

test('a file that failed keeps its error in the status while other files take their turn', async () => {
  home();
  const { s, rest, base, api } = await start({ agent: recordingAgent(), commentsPerMinute: 1, budgetWindowMs: 300 });
  rest.access.OTHER = 'figd_nobody'; // no token reaches the project's file
  plugin(base, s.token, () => 1, { win: 'w1' });
  await sleep(700); // FILE, then OTHER, one a "minute"
  await s.pollComments();
  await sleep(350);
  await s.pollComments();
  assert.ok(rest.gets.includes('FILE'));
  assert.match((await api('/status')).body.comments, /^błąd: OTHER: HTTP 403/, 'not "działa" just because the last file polled was fine');
});
