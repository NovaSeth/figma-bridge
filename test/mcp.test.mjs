// mcp.mjs over stdio, as Claude Code runs it: JSON-RPC handshake and tools/list, then every tool against the
// real server.mjs and the fake plugin loop (ui.html script + code.js + mock Figma), in a temporary BRIDGE_HOME
// with a fake Figma REST API. Server autostart is tested with a temporary HOME and a fake launchctl.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFigma, createFixture } from './mock-figma.mjs';
import { bridgeApi, freePort, root, startBridge, startUi } from './harness.mjs';

const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const until = async (check, ms = 5000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(50)) if (await check()) return true; return false; };

// A JSON-RPC client on the stdio of a mcp.mjs child process.
function startMcp(env, cwd) {
  const child = spawn(process.execPath, [join(root, 'mcp.mjs')], { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  const waiting = new Map(), lines = [];
  let buffer = '', stderr = '', seq = 0;
  child.stdout.on('data', d => {
    buffer += d;
    for (let i; (i = buffer.indexOf('\n')) >= 0;) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      lines.push(line);
      const m = JSON.parse(line), w = waiting.get(m.id);
      if (w) { waiting.delete(m.id); w(m); }
    }
  });
  child.stderr.on('data', d => { stderr += d; });
  const client = {
    child, lines, stderr: () => stderr,
    write: text => child.stdin.write(text + '\n'),
    request: (method, params) => new Promise(ok => { const id = ++seq; waiting.set(id, ok); client.write(JSON.stringify({ jsonrpc: '2.0', id, method, params })); }),
    // → { text, isError, content }
    call: async (name, args = {}) => {
      const r = (await client.request('tools/call', { name, arguments: args })).result;
      return { text: r.content.filter(c => c.type === 'text').map(c => c.text).join('\n'), isError: !!r.isError, content: r.content };
    },
    close: async () => { child.stdin.end(); if (child.exitCode === null) await new Promise(ok => child.once('exit', ok)); },
  };
  return client;
}

let home, work, env, bridge, ui, fx, figmaApi, api, mcp;
const deletes = [];
const comments = [], replies = [], cleanups = [];

before(async () => {
  home = mkdtempSync(join(tmpdir(), 'bridge-mcp-'));
  work = join(home, 'work');
  mkdirSync(join(home, 'data'), { recursive: true });
  mkdirSync(work);
  writeFileSync(join(home, 'data', 'figma-token.txt'), 'test-token');
  const demo = join(home, 'projects', 'demo');
  mkdirSync(join(demo, 'jobs'), { recursive: true });
  writeFileSync(join(demo, 'project.json'), JSON.stringify({ name: 'demo', files: ['TESTFILE'], preludes: ['jobs/_prelude.js'], jobsDir: 'jobs' }));
  writeFileSync(join(demo, 'jobs', '_prelude.js'), 'const projectName = () => "demo";');
  writeFileSync(join(demo, 'jobs', 'hello.js'), '//# Hello job\nreturn "hello from " + projectName();');
  mkdirSync(join(home, 'projects', 'other'));
  writeFileSync(join(home, 'projects', 'other', 'project.json'), JSON.stringify({ name: 'other', preludes: ['p.js'] }));
  writeFileSync(join(home, 'projects', 'other', 'p.js'), 'const projectName = () => "other";');
  // The session's working directory is a repo with the optional .figma-bridge.json: mcp.mjs links it.
  writeFileSync(join(work, '.figma-bridge.json'), JSON.stringify({ name: 'repo-linked', preludes: ['design/p.js'] }));
  mkdirSync(join(work, 'design'));
  writeFileSync(join(work, 'design', 'p.js'), 'const linked = 1;');

  figmaApi = http.createServer((req, res) => {
    const m = req.url.match(/^\/v1\/files\/([^/]+)\/comments(?:\/([^/]+))?$/);
    const reply = body => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (!m) { res.writeHead(404); return res.end(); }
    if (req.method === 'DELETE') { deletes.push(m[1] + ' ' + m[2]); return reply({}); }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', d => { body += d; });
      req.on('end', () => { replies.push({ fileKey: m[1], body: JSON.parse(body) }); reply({ id: 'r' + replies.length }); });
      return;
    }
    reply({ comments: comments.filter(c => c.fileKey === m[1]) });
  });
  await new Promise(ok => figmaApi.listen(0, '127.0.0.1', ok));
  env = { ...process.env, BRIDGE_HOME: home, BRIDGE_PORT: String(await freePort()), BRIDGE_FIGMA_API: 'http://127.0.0.1:' + figmaApi.address().port, BRIDGE_COMMENTS_PER_MINUTE: '1000', BRIDGE_NO_AUTOSTART: '1' };
  bridge = await startBridge(env);
  api = bridgeApi(env.BRIDGE_PORT, readFileSync(join(home, 'data', 'token.txt'), 'utf8').trim());
  fx = await createFixture();
  ui = startUi(readFileSync(join(home, 'app', 'ui.html'), 'utf8'), fx.mock);
  assert.ok(await until(async () => (await api('/status')).file.fileKey === 'TESTFILE'), 'the plugin said hello');
  mcp = startMcp(env, work);
  await mcp.request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
  mcp.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }));
});

after(async () => {
  if (mcp) await mcp.close();
  for (const f of cleanups) await f();
  if (ui) ui.stop();
  if (bridge) await bridge.stop();
  if (figmaApi) await new Promise(ok => figmaApi.close(ok));
  rmSync(home, { recursive: true, force: true });
});

test('handshake: protocol version echoed when supported, ping, errors, notifications unanswered', async () => {
  const other = startMcp(env, home);
  try {
    assert.deepEqual((await other.request('initialize', { protocolVersion: '2025-03-26' })).result,
      { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'figma-bridge', version: '2.0.0' } });
    assert.equal((await other.request('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion, '2025-06-18');
    other.write('{"jsonrpc":"2.0","method":"notifications/initialized"}');
    assert.deepEqual((await other.request('ping')).result, {});
    assert.equal((await other.request('resources/list')).error.code, -32601);
    assert.equal((await other.request('tools/call', { name: 'nope' })).error.code, -32602);
    // Inherited names are not tools either.
    for (const name of ['constructor', 'toString', '__proto__']) assert.equal((await other.request('tools/call', { name })).error.code, -32602, name);
    const count = other.lines.length;
    other.write('{not json');
    assert.ok(await until(() => other.lines.length > count));
    assert.deepEqual(JSON.parse(other.lines.at(-1)), { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
    // Every line on stdout is a protocol message: the notification got none.
    assert.equal(other.lines.length, 9);
    assert.ok(other.lines.every(l => JSON.parse(l).jsonrpc === '2.0'));
  } finally { await other.close(); }
  assert.equal(other.child.exitCode, 0);
});

test('tools/list: the eight tools, one-line descriptions, 2900 characters in all', async () => {
  const { tools } = (await mcp.request('tools/list')).result;
  assert.deepEqual(tools.map(t => t.name), ['figma_status', 'figma_inspect', 'figma_find', 'figma_library', 'figma_run', 'figma_screenshot', 'figma_plan', 'figma_comments']);
  assert.ok(tools.every(t => !t.description.includes('\n') && t.inputSchema.type === 'object'));
  const size = JSON.stringify(tools).length;
  assert.ok(size <= 2900, size + ' characters');
  const run = tools.find(t => t.name === 'figma_run').description;
  assert.match(run, /Bulk or destructive edits: dryRun:true first\./);
  for (const helper of ['hex', 'solid', 'usePage', 'all', 'texts', 'byName', 'one', 'loadFonts', 'variable', 'paintVar', 'component', 'instance', 'setProp', 'cloneVariant', 'frame', 'text', 'inspect', 'find', 'library']) {
    assert.match(run, new RegExp('\\b' + helper + '\\b'), helper);
  }
});

test('a repo .figma-bridge.json in the working directory is linked into the bridge home', async () => {
  assert.ok(await until(() => existsSync(join(home, 'projects', 'repo-linked', 'project.json'))));
  assert.equal(readFileSync(join(home, 'projects', 'repo-linked', 'design', 'p.js'), 'utf8'), 'const linked = 1;');
});

test('a repo whose .figma-bridge.json was refused is not linked silently: figma_status says why', async () => {
  // "other" is a project made by hand in this home; a repo using the name does not get to replace it.
  const taker = join(home, 'taker');
  mkdirSync(taker);
  writeFileSync(join(taker, '.figma-bridge.json'), JSON.stringify({ name: 'other', preludes: ['p.js'] }));
  writeFileSync(join(taker, 'p.js'), 'const projectName = () => "taken over";');
  const session = startMcp(env, taker);
  try {
    const status = await session.call('figma_status');
    assert.match(status.text, /\nlink: project "other" in .* was not linked from a repo \(to replace it: node link\.mjs --force .*taker\)$/);
    assert.equal(readFileSync(join(home, 'projects', 'other', 'p.js'), 'utf8'), 'const projectName = () => "other";');
  } finally { await session.close(); }
  assert.doesNotMatch((await mcp.call('figma_status')).text, /\nlink: /);
});

test('figma_status: connection, file, page, selection, project, listen mode', async () => {
  const bare = await mcp.call('figma_status');
  assert.equal(bare.isError, false, bare.text);
  assert.equal(bare.text.split('\n').slice(0, 6).join('\n'), [
    'plugin: connected', 'file: "Test file" TESTFILE', 'page: "Screens" ' + fx.screens.id, 'selection: none', 'project: demo', 'listen: off'].join('\n'));
  fx.figma.currentPage.selection = [fx.card, fx.section];
  const selected = await mcp.call('figma_status');
  assert.match(selected.text, new RegExp('\\nselection: ' + fx.card.id + ' FRAME "Card"; ' + fx.section.id + ' SECTION "Keep me"\\n'));
  assert.ok(selected.text.length <= 300, selected.text.length + ' characters');
  fx.card.name = 'Card '.repeat(40);
  const long = await mcp.call('figma_status');
  fx.card.name = 'Card';
  assert.match(long.text, /\nselection: \S+ FRAME "(Card ){11}Card…"; /);
  fx.figma.currentPage.selection = [];
});

test('figma_inspect, figma_find and figma_library answer in compact text', async () => {
  const outline = await mcp.call('figma_inspect', { target: 'Card', depth: 1 });
  assert.equal(outline.isError, false, outline.text);
  assert.match(outline.text, new RegExp('^FRAME "Card" ' + fx.card.id + ' 100×100 @0,0 V fill=#FF0000\\n  TEXT "Title" '));
  const nothing = await mcp.call('figma_inspect');
  assert.equal(nothing.isError, true);
  assert.match(nothing.text, /^error: nothing selected in Figma/);
  assert.equal((await mcp.call('figma_find', { query: 'title' })).text, fx.title.id + ' TEXT "Title" · Screens › Card');
  assert.equal((await mcp.call('figma_find', { query: 'hello', type: 'TEXT' })).text, fx.title.id + ' TEXT "Title" text="Hello" · Screens › Card');
  assert.equal((await mcp.call('figma_find', {})).isError, true);
  assert.equal((await mcp.call('figma_library', { kind: 'styles' })).text, 'PAINT 1\n  Brand/Red #FF0000');
  assert.match((await mcp.call('figma_library', { kind: 'components', filter: 'butt' })).text, /^Components 1\n {2}\S+ SET "Button" \{Size=Large\|Small,State=Off\|On,Label:text="Go"\}$/);
});

test('figma_run: project prelude of the open file, one-line JSON, step marking, file, project and noPrelude', async () => {
  await api('/plan', { tasks: [{ text: 'MCP step', state: 'todo' }] });
  const r = await mcp.call('figma_run', { code: 'return [projectName(), hex("#FFFFFF"), one("Title").name]', step: 'MCP step' });
  assert.equal(r.isError, false, r.text);
  assert.ok(!r.text.includes('\n'));
  assert.deepEqual(JSON.parse(r.text), { ok: true, result: ['demo', { r: 1, g: 1, b: 1 }, 'Title'], project: 'demo' });
  assert.equal((await api('/plan')).tasks[0].state, 'done');
  assert.deepEqual(JSON.parse((await mcp.call('figma_run', { file: 'hello.js' })).text).result, 'hello from demo');
  assert.deepEqual(JSON.parse((await mcp.call('figma_run', { code: 'return projectName()', project: 'other' })).text), { ok: true, result: 'other', project: 'other' });
  assert.deepEqual(JSON.parse((await mcp.call('figma_run', { code: 'return typeof hex', noPrelude: true })).text), { ok: true, result: 'undefined' });
  // Numbers and booleans sent as strings mean what they say.
  assert.deepEqual(JSON.parse((await mcp.call('figma_run', { code: 'return typeof hex', noPrelude: 'false' })).text), { ok: true, result: 'function', project: 'demo' });
  assert.equal((await mcp.call('figma_inspect', { target: 'Card', depth: '0' })).text.split('\n').length, 1);
  const unknown = await mcp.call('figma_run', { code: 'return 1', project: 'nope' });
  assert.equal(unknown.isError, true);
  assert.match(unknown.text, /^error: no project "nope" \(projects: demo, other, repo-linked in /);
  const missing = await mcp.call('figma_run', { file: 'nope.js' });
  assert.match(missing.text, /^error: job file not found: nope\.js \(looked in .*jobs, /);
});

test('figma_run: a failing job is an error and leaves its step active; a dry run changes nothing', async () => {
  await api('/plan', { tasks: [{ text: 'Failing step', state: 'todo' }] });
  const failed = await mcp.call('figma_run', { code: 'throw new Error("broken on purpose")', step: 'Failing step' });
  assert.equal(failed.isError, true);
  assert.deepEqual(JSON.parse(failed.text), { ok: false, error: 'broken on purpose', project: 'demo' });
  assert.equal((await api('/plan')).tasks[0].state, 'active');
  const before = fx.mock.snapshot();
  const dry = await mcp.call('figma_run', { code: 'one("Card").name = "Nope"; return one("Card").name', dryRun: true, step: 'Failing step' });
  const out = JSON.parse(dry.text);
  assert.equal(out.result, 'Card');
  assert.deepEqual(out.dryRun.counts, { set: 1, call: 0, remove: 0 });
  assert.ok(existsSync(out.dryRunReport));
  assert.deepEqual(fx.mock.snapshot(), before);
  assert.equal((await api('/plan')).tasks[0].state, 'active');
});

test('figma_run: a huge result goes to a file, the answer keeps its start', async () => {
  const r = await mcp.call('figma_run', { code: 'return "x".repeat(50000)' });
  const out = JSON.parse(r.text);
  assert.ok(r.text.length <= 20000, r.text.length + ' characters');
  assert.equal(out.resultChars, 50002);
  assert.equal(readFileSync(out.resultFile, 'utf8').length, 50002);
  assert.ok(out.resultFile.startsWith(join(home, 'data', 'out')));
});

test('figma_screenshot: an inline PNG per node, scaled to maxSize, and its path', async () => {
  const r = await mcp.call('figma_screenshot', { target: fx.card.id, maxSize: 50 });
  assert.equal(r.isError, false, r.text);
  const file = join(home, 'data', 'out', 'shot-' + fx.card.id.replace(/\W+/g, '-') + '.png');
  assert.equal(r.text, fx.card.id + ' FRAME "Card" 50×50 ' + file);
  assert.equal(r.content.length, 2);
  assert.equal(r.content[1].type, 'image');
  assert.equal(r.content[1].mimeType, 'image/png');
  const bytes = Buffer.from(r.content[1].data, 'base64');
  assert.deepEqual([...bytes.subarray(0, 4)], [137, 80, 78, 71]);
  assert.match(bytes.toString('latin1'), /"value":0\.5/); // the mock writes the export settings into its "PNG"
  // Up to 4 images per call, and the answer says what was left out.
  const kids = ['A', 'B', 'C', 'D', 'E'].map(name => { const f = fx.figma.createFrame(); f.name = name; return f; });
  fx.figma.currentPage.selection = kids;
  const five = await mcp.call('figma_screenshot', {});
  fx.figma.currentPage.selection = [];
  kids.forEach(k => k.remove());
  assert.equal(five.content.filter(c => c.type === 'image').length, 4);
  assert.match(five.text, /\n… 1 more \(4 per call\)$/);
  const page = await mcp.call('figma_screenshot', { target: 'page' });
  assert.equal(page.isError, true);
  assert.match(page.text, /nothing to export/);
});

test('figma_plan: adds, marks and returns the plan as a checklist', async () => {
  await mcp.call('figma_plan', { tasks: [] });
  assert.equal((await mcp.call('figma_plan', { add: 'Draw the header' })).text, '[>] Draw the header');
  await mcp.call('figma_plan', { add: 'Check contrast', state: 'todo' });
  assert.equal((await mcp.call('figma_plan', { mark: 'Draw' })).text, '[x] Draw the header\n[ ] Check contrast');
  assert.equal((await mcp.call('figma_plan')).text, '[x] Draw the header\n[ ] Check contrast');
  // Bare strings are todo entries: stored as given they would break every later mark in the server.
  assert.equal((await mcp.call('figma_plan', { tasks: ['Header', { text: 'Footer', state: 'done' }, { text: 'Icons', state: 'bogus' }] })).text, '[ ] Header\n[x] Footer\n[ ] Icons');
  assert.equal((await mcp.call('figma_plan', { mark: 'Head', state: 'active' })).text, '[>] Header\n[x] Footer\n[ ] Icons');
  await mcp.call('figma_plan', { tasks: [] });
});

test('figma_comments: waits for a new comment, then replies in its thread', async () => {
  assert.equal((await mcp.call('figma_comments')).text, 'no new comments');
  comments.push({ fileKey: 'TESTFILE', id: 'c7', order_id: 7, message: 'Make the card\nblue', user: { handle: 'alice' }, client_meta: { node_id: fx.card.id }, created_at: '2026-01-01T00:00:00Z' });
  // The server polls every 15 s; a hello from the plugin makes it poll now.
  const waited = mcp.call('figma_comments', { wait: 10 });
  await sleep(200);
  await api('/hello', { fileKey: 'TESTFILE', fileName: 'Test file' });
  assert.equal((await waited).text, '#7 id=c7 @alice node=' + fx.card.id + ': Make the card blue');
  const reply = await mcp.call('figma_comments', { replyTo: 'c7', text: 'Done: the card is blue.' });
  assert.equal(reply.text, 'replied in thread c7 (comment r1)');
  assert.deepEqual(replies, [{ fileKey: 'TESTFILE', body: { message: 'Done: the card is blue.', comment_id: 'c7' } }]);
  assert.equal((await mcp.call('figma_comments', { replyTo: 'c7' })).isError, true);
});

test('figma_comments: a pin shows where on the node it sits; remove deletes the thread', async () => {
  comments.push({ fileKey: 'TESTFILE', id: 'c8', order_id: 8, message: 'Bigger', user: { handle: 'alice' }, client_meta: { node_id: fx.card.id, node_offset: { x: 120.4, y: 33.6 } }, created_at: '2026-01-01T00:00:01Z' });
  const waited = mcp.call('figma_comments', { wait: 10 });
  await sleep(200);
  await api('/hello', { fileKey: 'TESTFILE', fileName: 'Test file' });
  assert.equal((await waited).text, '#8 id=c8 @alice node=' + fx.card.id + '@120,34: Bigger');
  assert.equal((await mcp.call('figma_comments', { remove: 'c8' })).text, 'deleted thread c8');
  assert.deepEqual(deletes, ['TESTFILE c8']);
  assert.equal((await mcp.call('figma_plan', { clearDone: true })).text, '[ ] #7 Make the card blue');
});

test('A03 injection: tool arguments reach the plugin as data, never as code', async () => {
  const attack = '"); figma.root.name = "pwned"; ("' + "'); figma.root.name = 'pwned'; ('" + '`); figma.root.name = `pwned`; (`\n figma.root.name = "pwned" //';
  const before = fx.mock.snapshot();
  const calls = [['figma_inspect', { target: attack }], ['figma_inspect', { target: 'page', depth: attack, maxLines: attack }], ['figma_find', { query: attack, type: attack, page: attack, limit: attack }],
    ['figma_find', { query: attack }], ['figma_library', { kind: attack, filter: attack }], ['figma_library', { kind: 'styles', filter: attack }],
    ['figma_screenshot', { target: attack, scale: attack, maxSize: attack }], ['figma_screenshot', { target: fx.card.id, scale: '1); figma.root.name = "pwned"; (', maxSize: '1024); figma.root.name = "pwned"; (' }]];
  for (const [tool, args] of calls) {
    const r = await mcp.call(tool, args);
    assert.doesNotMatch(r.text, /SyntaxError|Unexpected|is not defined/, tool + ' ' + JSON.stringify(args) + ' → ' + r.text);
  }
  assert.equal(fx.figma.root.name, 'Test file');
  assert.deepEqual(fx.mock.snapshot(), before);
});

test('A01: the session of a comment (BRIDGE_FILE_ROOT) can take job files from its own folder only', async () => {
  // A comment is untrusted text: a session it talked round must not read files through figma_run {file}, which
  // would hand their content to the job (a token is one identifier, and a ReferenceError names it).
  const outside = join(home, 'outside.js');
  writeFileSync(outside, 'return "outside"');
  writeFileSync(join(work, 'inside.js'), 'return "inside"');
  symlinkSync(outside, join(work, 'link.js'));
  const fenced = startMcp({ ...env, BRIDGE_FILE_ROOT: work }, work);
  try {
    const run = async file => { const r = await fenced.call('figma_run', { file, noPrelude: true }); return r.isError ? r.text : JSON.parse(r.text).result; };
    assert.equal(await run('inside.js'), 'inside');
    assert.equal(await run(join(work, 'inside.js')), 'inside');
    for (const file of [outside, 'link.js', '../outside.js', join(home, 'data', 'token.txt'), 'hello.js'])
      assert.match(await run(file), /^error: job file (outside the session's folder|not found)/, file);
    assert.equal(JSON.parse((await fenced.call('figma_run', { code: 'return 1 + 1', noPrelude: true })).text).result, 2);
  } finally { await fenced.close(); }
  // An ordinary session is the user's own Claude Code: any path, as documented.
  assert.equal(JSON.parse((await mcp.call('figma_run', { file: outside, noPrelude: true })).text).result, 'outside');
});

test('the plugin open in a second file: figma_status lists it, {file} switches the session to a file', async () => {
  const ui2 = startUi(readFileSync(join(home, 'app', 'ui.html'), 'utf8'), createFigma({ fileKey: 'SECONDFILE', fileName: 'Second file' }));
  const rootName = async () => JSON.parse((await mcp.call('figma_run', { code: 'return figma.root.name', noPrelude: true })).text).result;
  try {
    assert.ok(await until(async () => ((await api('/status')).files || []).length === 2), 'both windows connected');
    // Nothing chosen: the window opened last.
    const last = await mcp.call('figma_status');
    assert.match(last.text, /^plugin: connected\nfile: "Second file" SECONDFILE\nother open files: "Test file" TESTFILE \(figma_status \{file\} switches\)\npage: /);
    assert.match(last.text, /\nproject: none\n/);
    assert.equal(await rootName(), 'Second file');
    const none = await mcp.call('figma_status', { file: 'nope' });
    assert.equal(none.isError, true);
    assert.equal(none.text, 'error: no open file matches "nope" (open: "Test file" TESTFILE, "Second file" SECONDFILE)');
    assert.match((await mcp.call('figma_status', { file: 'file' })).text, /^error: several open files match "file"/);
    // By a part of the name (or the key); every later call of the session works there.
    const back = await mcp.call('figma_status', { file: 'test fi' });
    assert.match(back.text, /^plugin: connected\nfile: "Test file" TESTFILE\nother open files: "Second file" SECONDFILE /);
    assert.match(back.text, /\nproject: demo\n/);
    assert.equal(await rootName(), 'Test file');
    assert.match((await mcp.call('figma_inspect', { target: 'Card', depth: 0 })).text, /^FRAME "Card" /);
    // The plan of that file: its open comment thread from before, and the new step.
    assert.equal((await mcp.call('figma_plan', { add: 'Step in the chosen file' })).text, '[ ] #7 Make the card blue\n[>] Step in the chosen file');
    assert.deepEqual((await api('/plan?file=SECONDFILE')).tasks, []);
    assert.deepEqual((await api('/plan?file=TESTFILE')).tasks.map(t => t.fileKey), ['TESTFILE', 'TESTFILE']);
  } finally { ui2.stop(); }
  await mcp.call('figma_plan', { tasks: [] });
});

test('stdout stayed protocol-only for the whole session', () => {
  assert.ok(mcp.lines.length > 20);
  assert.ok(mcp.lines.every(l => JSON.parse(l).jsonrpc === '2.0'));
});

// A bridge server stand-in: /status as given, every other request recorded and answered by `answer`.
async function fakeBridge(status, answer = () => [404, { error: 'not found' }], extraEnv = {}) {
  const temp = mkdtempSync(join(tmpdir(), 'bridge-mcp-fake-')), requests = [];
  mkdirSync(join(temp, 'data'));
  writeFileSync(join(temp, 'data', 'token.txt'), 'fake-token');
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      const [code, out] = req.url === '/status' ? [200, status] : (requests.push({ url: req.url, body: body && JSON.parse(body) }), answer(req.url, body && JSON.parse(body)));
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(out));
    });
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  const client = startMcp({ ...env, BRIDGE_HOME: temp, BRIDGE_PORT: String(server.address().port), ...extraEnv }, temp);
  return { client, requests, async stop() { await client.close(); await new Promise(ok => server.close(ok)); rmSync(temp, { recursive: true, force: true }); } };
}

test('a plugin the server has not heard from for 40 s counts as closed: no job is queued for it', async () => {
  // The server's own "connected" window is 40 s; a job sent after it would wait out its whole timeout.
  const stale = await fakeBridge({ pluginSeenMsAgo: 45000, file: { fileKey: 'K', fileName: 'F' }, listen: { on: false } });
  try {
    const r = await stale.client.call('figma_inspect', { target: 'page' });
    assert.equal(r.isError, true);
    assert.match(r.text, /plugin is not open in Figma/);
    assert.match((await stale.client.call('figma_status')).text, /^plugin: not connected/);
    assert.deepEqual(stale.requests, []);
  } finally { await stale.stop(); }
  const fresh = await fakeBridge({ pluginSeenMsAgo: 20000, file: { fileKey: 'K' } }, url => (url === '/job' ? [200, { ok: true, result: 'PAGE "P" 1:1' }] : [404, { error: 'not found' }]));
  try {
    assert.equal((await fresh.client.call('figma_inspect', { target: 'page' })).text, 'PAGE "P" 1:1');
    assert.deepEqual(fresh.requests.map(r => r.url), ['/job']);
  } finally { await fresh.stop(); }
});

test('FIGMA_FILE ties a session to one file: jobs and plan changes name it; no window there means "not open"', async () => {
  const answer = (url, body) => (url === '/job' ? [200, { ok: true, result: body.label === 'figma_status' ? ['P', '0:1', 0, []] : 'PAGE "P" 1:1' }]
    : url === '/plan' ? [200, { tasks: [{ text: 'x', state: 'active' }] }] : [404, { error: 'not found' }]);
  const tied = await fakeBridge({ connected: true, file: { fileKey: 'CURRENT', fileName: 'Current' }, files: [{ fileKey: 'CURRENT', fileName: 'Current' }, { fileKey: 'K', fileName: 'Tied' }] }, answer, { FIGMA_FILE: 'K' });
  try {
    assert.equal((await tied.client.call('figma_inspect', { target: 'page' })).text, 'PAGE "P" 1:1');
    assert.equal((await tied.client.call('figma_plan', { add: 'x' })).text, '[>] x');
    // The tie holds for the session: it is what keeps the session of a comment (untrusted text) in the comment's
    // file. No other file is offered, and asking for one is refused.
    const status = await tied.client.call('figma_status');
    assert.match(status.text, /^plugin: connected\nfile: "Tied" K\npage: "P" 0:1\n/);
    assert.doesNotMatch(status.text, /other open files|CURRENT/);
    const away = await tied.client.call('figma_status', { file: 'CURRENT' });
    assert.equal(away.isError, true);
    assert.match(away.text, /^error: this session is tied to file K/);
    await tied.client.call('figma_inspect', { target: 'page' });
    assert.deepEqual(tied.requests.map(r => [r.url, r.body.file]), [['/job', 'K'], ['/plan', 'K'], ['/job', 'K'], ['/job', 'K']]);
  } finally { await tied.stop(); }
  const away = await fakeBridge({ connected: true, file: { fileKey: 'CURRENT', fileName: 'Current' } }, answer, { FIGMA_FILE: 'K' });
  try {
    const r = await away.client.call('figma_inspect', { target: 'page' });
    assert.equal(r.isError, true);
    assert.match(r.text, /plugin is not open in file K /);
    assert.match((await away.client.call('figma_status')).text, /^plugin: not connected \(open Claude Bridge in file K\)\nfile: "" K\nproject: /);
    assert.deepEqual(away.requests, []);
  } finally { await away.stop(); }
  // A person may name the file by a part of its name, as with run.mjs --file.
  const named = await fakeBridge({ connected: true, file: { fileKey: 'CURRENT', fileName: 'Current' }, files: [{ fileKey: 'CURRENT', fileName: 'Current' }, { fileKey: 'K', fileName: 'Tied file' }] }, answer, { FIGMA_FILE: 'tied' });
  try {
    assert.equal((await named.client.call('figma_inspect', { target: 'page' })).text, 'PAGE "P" 1:1');
    assert.equal(named.requests[0].body.file, 'K');
  } finally { await named.stop(); }
});

test('a job runs in the file the status named, also when nothing ties the session to a file', async () => {
  // Without it the server would pick the window when the job arrives: after the current window closed, another
  // file's, while the prelude was built for the first.
  const open = await fakeBridge({ connected: true, file: { fileKey: 'SEEN', fileName: 'Seen' } }, url => (url === '/job' ? [200, { ok: true, result: 'PAGE "P" 1:1' }] : [200, { tasks: [] }]));
  try {
    await open.client.call('figma_inspect', { target: 'page' });
    await open.client.call('figma_run', { code: 'return 1', noPrelude: true, step: 'A step' });
    assert.deepEqual(open.requests.map(r => [r.url, r.body.file]), [['/job', 'SEEN'], ['/plan', 'SEEN'], ['/job', 'SEEN'], ['/plan', 'SEEN']]);
  } finally { await open.stop(); }
});

test('the session of a comment links no project: a .figma-bridge.json it wrote into its folder stays a file', async () => {
  const folder = join(home, 'scratch-of-a-comment');
  mkdirSync(folder);
  writeFileSync(join(folder, '.figma-bridge.json'), JSON.stringify({ name: 'planted', files: ['UNOWNEDKEY'], preludes: ['p.js'] }));
  writeFileSync(join(folder, 'p.js'), 'figma.root.name = "planted";');
  const session = startMcp({ ...env, BRIDGE_FILE_ROOT: folder, FIGMA_FILE: 'TESTFILE' }, folder);
  try {
    await session.call('figma_status');
    assert.ok(!existsSync(join(home, 'projects', 'planted')));
  } finally { await session.close(); }
});

test('a server error is a tool error that says what failed, not an empty answer', async () => {
  const broken = await fakeBridge({ pluginSeenMsAgo: 1000, file: {} }, () => [500, { error: 'plan.filter is not a function' }]);
  try {
    const r = await broken.client.call('figma_plan', { add: 'x' });
    assert.equal(r.isError, true);
    assert.equal(r.text, 'error: /plan: HTTP 500 plan.filter is not a function');
  } finally { await broken.stop(); }
});

test('without a server and with autostart off every tool says so', async () => {
  const lone = { ...env, BRIDGE_HOME: mkdtempSync(join(tmpdir(), 'bridge-mcp-off-')), BRIDGE_PORT: String(await freePort()) };
  const off = startMcp(lone, lone.BRIDGE_HOME);
  try {
    const r = await off.call('figma_status');
    assert.equal(r.isError, true);
    assert.match(r.text, /^error: bridge server not running at http:\/\/127\.0\.0\.1:\d+ \(autostart off/);
  } finally { await off.close(); rmSync(lone.BRIDGE_HOME, { recursive: true, force: true }); }
});

test('autostart without a LaunchAgent spawns server.mjs for the same BRIDGE_HOME; no plugin → tools say so', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'bridge-mcp-spawn-'));
  const own = { ...env, BRIDGE_HOME: join(temp, 'home'), HOME: join(temp, 'user'), BRIDGE_PORT: String(await freePort()) };
  delete own.BRIDGE_NO_AUTOSTART;
  const started = startMcp(own, temp);
  let pid = null;
  cleanups.push(async () => { if (pid) try { process.kill(pid); } catch (e) {} rmSync(temp, { recursive: true, force: true }); });
  try {
    const status = await started.call('figma_status');
    pid = Number((started.stderr().match(/spawned server\.mjs pid (\d+)/) || [])[1]) || null;
    assert.ok(pid, started.stderr());
    assert.equal(status.isError, false, status.text);
    assert.match(status.text, /^plugin: not connected/);
    assert.ok(existsSync(join(own.BRIDGE_HOME, 'data', 'token.txt')));
    assert.ok(existsSync(join(own.BRIDGE_HOME, 'data', 'logs', 'server.log')));
    const inspect = await started.call('figma_inspect', { target: 'page' });
    assert.equal(inspect.isError, true);
    assert.match(inspect.text, /the Claude Bridge plugin is not open in Figma/);
  } finally { await started.close(); }
});

test('autostart kickstarts the LaunchAgent only when it serves this bridge home', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'bridge-mcp-launchd-'));
  const user = join(temp, 'user'), bin = join(temp, 'bin'), home = join(temp, 'home'), plist = join(user, 'Library', 'LaunchAgents', 'local.claude-figma-bridge.plist');
  mkdirSync(join(user, 'Library', 'LaunchAgents'), { recursive: true });
  mkdirSync(bin);
  // The fake launchctl records its arguments and starts the server the way the LaunchAgent would.
  writeFileSync(join(bin, 'launchctl'), '#!/bin/sh\necho "$@" >> "$FAKE_LOG"\nnohup "$FAKE_NODE" "$FAKE_SERVER" > /dev/null 2>&1 &\necho $! > "$FAKE_PID"\n');
  chmodSync(join(bin, 'launchctl'), 0o755);
  const own = { ...env, BRIDGE_HOME: home, HOME: user, PATH: bin + ':' + process.env.PATH,
    FAKE_LOG: join(temp, 'launchctl.log'), FAKE_PID: join(temp, 'server.pid'), FAKE_NODE: process.execPath, FAKE_SERVER: join(root, 'server.mjs') };
  delete own.BRIDGE_NO_AUTOSTART;
  const pids = [];
  cleanups.push(async () => {
    try { pids.push(Number(readFileSync(own.FAKE_PID, 'utf8'))); } catch (e) {}
    for (const pid of pids) try { process.kill(pid); } catch (e) {}
    rmSync(temp, { recursive: true, force: true });
  });
  // A LaunchAgent of another bridge home (the installed one, seen from a test or a second home) is left alone.
  writeFileSync(plist, '<plist><dict><key>BRIDGE_HOME</key><string>' + join(temp, 'elsewhere') + '</string></dict></plist>');
  const apart = startMcp({ ...own, BRIDGE_PORT: String(await freePort()) }, temp);
  try {
    const status = await apart.call('figma_status');
    pids.push(Number((apart.stderr().match(/spawned server\.mjs pid (\d+)/) || [])[1]));
    assert.equal(status.isError, false, status.text + apart.stderr());
    assert.ok(pids[0], apart.stderr());
    assert.equal(existsSync(own.FAKE_LOG), false);
  } finally { await apart.close(); }
  writeFileSync(plist, '<plist><dict><key>BRIDGE_HOME</key><string>' + home + '</string></dict></plist>');
  const started = startMcp({ ...own, BRIDGE_PORT: String(await freePort()) }, temp);
  try {
    const status = await started.call('figma_status');
    assert.equal(status.isError, false, status.text + started.stderr());
    assert.equal(readFileSync(own.FAKE_LOG, 'utf8'), 'kickstart gui/' + process.getuid() + '/local.claude-figma-bridge\n');
    assert.doesNotMatch(started.stderr(), /spawned server\.mjs/);
  } finally { await started.close(); }
});
