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

// Figma REST stand-in: comments per file, POSTs recorded.
function figmaRest() {
  const comments = { FILE: [], OTHER: [], SECOND: [] }, posted = [], gets = [];
  let status = 200;
  const reply = (body, code = status) => ({ ok: code < 300, status: code, json: async () => body });
  const fetch = async (url, init = {}) => {
    const key = decodeURIComponent(url.match(/\/v1\/files\/([^/]+)\/comments$/)[1]);
    if (init.method === 'POST') { posted.push({ key, token: init.headers['X-Figma-Token'], ...JSON.parse(init.body) }); return reply({ id: 'r' + posted.length }); }
    gets.push(key);
    return reply({ comments: comments[key] || [] });
  };
  let n = 0;
  const add = (key, fields = {}) => { const c = { id: 'c' + (++n), order_id: String(n), message: 'Comment ' + n, user: { handle: 'Ann' }, created_at: new Date().toISOString(), client_meta: { node_id: '1:2' }, ...fields }; comments[key].push(c); return c; };
  return { comments, posted, gets, fetch, add, fail: code => { status = code; } };
}

// The plugin window: says hello, keeps a /next long poll open and answers jobs with `answer(job)`.
function plugin(base, token, answer = () => 'OUTLINE') {
  const H = { 'X-Bridge-Token': token, 'Content-Type': 'application/json' };
  const controller = new AbortController();
  const jobs = [];
  const hello = fileKey => fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ fileKey, fileName: 'Mockups' }) });
  const loop = (async () => {
    await hello('FILE');
    while (!controller.signal.aborted) {
      let r;
      try { r = await fetch(base + '/next', { headers: H, signal: controller.signal }); } catch (e) { return; }
      if (r.status !== 200) continue;
      const job = await r.json();
      jobs.push(job);
      await fetch(base + '/result', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: true, result: answer(job), images: [] }) });
    }
  })();
  const stop = async () => { controller.abort(); await loop; };
  cleanups.push(stop);
  return { jobs, stop, hello };
}

async function start(options) {
  const rest = figmaRest();
  const s = await startServer({ port: 0, pollMs: 1e6, connectedMs: 300, clockSlackMs: 0, figmaFetch: rest.fetch, ...options });
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

  // Plugin connects: the first poll of each file only records what is there.
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
  assert.deepEqual((await api('/plan')).body.tasks.map(t => t.text).sort(), ['#2 Move the chip', '#4 elsewhere']);

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
  await sleep(600);
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
  await sleep(700); // the first run ends; the plugin counts as gone
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
