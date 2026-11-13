// End to end, every hop a job takes in Figma: run.mjs (child process) → server.mjs (child process, free port,
// temporary BRIDGE_HOME) → the script of the ui.html the server generated (vm, stub DOM, real fetch) → code.js
// (vm, mock Figma) → back the same way. Nothing touches the real bridge home.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFixture } from './mock-figma.mjs';
import { bridgeApi, freePort, root, startBridge, startUi } from './harness.mjs';

let bridge, home, work, env, ui, fx, token, figmaApi, api;
const polledKeys = new Set(); // file keys the server asked the (fake) Figma REST API about
const runCli = (...args) => new Promise(ok => {
  const child = spawn(process.execPath, [join(root, 'run.mjs'), ...args], { env, cwd: work });
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { err += d; });
  child.on('exit', code => { let json = null; try { json = JSON.parse(out); } catch (e) {} ok({ code, out, err, json }); });
});
const runPlan = (...args) => new Promise(ok => {
  const child = spawn(process.execPath, [join(root, 'plan.mjs'), ...args], { env, cwd: work });
  let out = '', err = '';
  child.stdout.on('data', d => { out += d; });
  child.stderr.on('data', d => { err += d; });
  child.on('exit', code => ok({ code, out: out.trim(), err: err.trim() }));
});
const job = (name, code) => { writeFileSync(join(work, name), code); return name; };
const project = (name, config, files = {}) => {
  const dir = join(home, 'projects', name);
  mkdirSync(join(dir, 'jobs'), { recursive: true });
  writeFileSync(join(dir, 'project.json'), JSON.stringify(Object.assign({ name }, config)));
  for (const [path, content] of Object.entries(files)) writeFileSync(join(dir, path), content);
};

before(async () => {
  home = mkdtempSync(join(tmpdir(), 'bridge-e2e-'));
  work = join(home, 'work');
  mkdirSync(join(home, 'data'), { recursive: true });
  mkdirSync(work);
  writeFileSync(join(home, 'data', 'figma-token.txt'), 'test-token');
  // The plugin's file (the mock's TESTFILE) belongs to "demo"; "other" only adds a file to poll.
  project('demo', { files: ['TESTFILE'], preludes: ['jobs/_prelude.js'] }, { 'jobs/_prelude.js': 'const hex = () => "project hex";\nconst layer = () => "project";\nconst projectName = () => "demo";' });
  project('other', { files: ['OTHERKEY'], preludes: ['jobs/_other.js'] }, { 'jobs/_other.js': 'const projectName = () => "other";' });
  writeFileSync(join(work, 'extra-prelude.js'), 'const layer = () => "extra";');
  figmaApi = http.createServer((req, res) => {
    const m = req.url.match(/^\/v1\/files\/([^/]+)\/comments$/);
    if (m) polledKeys.add(m[1]);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ comments: [] }));
  });
  await new Promise(ok => figmaApi.listen(0, '127.0.0.1', ok));
  env = { ...process.env, BRIDGE_HOME: home, BRIDGE_PORT: String(await freePort()), BRIDGE_FIGMA_API: 'http://127.0.0.1:' + figmaApi.address().port, BRIDGE_COMMENTS_PER_MINUTE: '1000' };
  bridge = await startBridge(env);
  token = readFileSync(join(home, 'data', 'token.txt'), 'utf8').trim();
  api = bridgeApi(env.BRIDGE_PORT, token);
  fx = await createFixture();
  ui = startUi(readFileSync(join(home, 'app', 'ui.html'), 'utf8'), fx.mock);
});

after(async () => {
  if (ui) ui.stop();
  if (bridge) await bridge.stop();
  if (figmaApi) await new Promise(ok => figmaApi.close(ok));
  rmSync(home, { recursive: true, force: true });
});

test('--status answers through the server', async () => {
  const r = await runCli('--status');
  assert.equal(r.code, 0, r.err);
  assert.equal(r.json.queued, 0);
  assert.equal(r.json.file.fileKey, 'TESTFILE');
});

test('a long answer arrives whole when stdout is a pipe', async () => {
  // A pipe takes about 64 KB at once. The rest of a longer answer is still queued when the write call returns.
  const r = await runCli(job('long.js', 'return "x".repeat(400000);'));
  assert.equal(r.code, 0, r.err);
  assert.ok(r.json, 'stdout is not complete JSON: ' + r.out.length + ' chars, ending ' + JSON.stringify(r.out.slice(-12)));
  assert.equal(r.json.result.length, 400000);
});

test('a normal job gets prelude.js and the prelude of the project owning the plugin file, and applies its writes', async () => {
  const r = await runCli(job('normal.js', `//# e2e normal
    const card = one('Card');
    card.name = 'Card (e2e)';
    await shot(card, { name: 'e2e-card' });
    return { name: card.name, project: projectName(), hex: hex('#000'), solid: solid('#FFFFFF')[0].color };`), '60000');
  assert.equal(r.code, 0, r.out + r.err);
  assert.deepEqual(r.json.result, { name: 'Card (e2e)', project: 'demo', hex: 'project hex', solid: { r: 1, g: 1, b: 1 } });
  assert.equal(r.json.dryRun, null);
  assert.equal(r.json.dryRunReport, null);
  assert.equal(r.json.images[0], join(home, 'data', 'out', 'e2e-card.png'));
  assert.ok(existsSync(r.json.images[0]));
  assert.equal(fx.card.name, 'Card (e2e)');
});

test('prelude order: prelude.js, then the project, then --prelude files; --project picks another project', async () => {
  const layered = await runCli(job('layers.js', 'return [hex("#000"), layer(), projectName()]'), '--prelude', 'extra-prelude.js');
  assert.deepEqual(layered.json.result, ['project hex', 'extra', 'demo']);
  const other = await runCli(job('other.js', 'return [projectName(), typeof layer, hex("#FFFFFF")]'), '--project', 'other');
  assert.deepEqual(other.json.result, ['other', 'undefined', { r: 1, g: 1, b: 1 }]);
  const unknown = await runCli('other.js', '--project', 'nope');
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /no project "nope" \(projects: demo, other in /);
});

test('--dry-run records instead of writing, saves the full report and never marks the plan step', async () => {
  await api('/plan', { tasks: [{ text: 'E2E step', state: 'todo' }] });
  const before = fx.mock.snapshot();
  const r = await runCli(job('dry.js', `
    const card = one('Card (e2e)');
    card.name = 'Should not stick';
    for (let i = 0; i < 30; i++) card.x = i;
    card.children[0].remove();
    card.appendChild(frame('Temp'));
    return card.name;`), '--dry-run', '--step', 'E2E step');
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.result, 'Card (e2e)');
  assert.deepEqual(fx.mock.snapshot(), before);
  const summary = r.json.dryRun;
  assert.deepEqual(summary.counts, { set: 31, call: 1, remove: 1 });
  assert.deepEqual(summary.created, { FRAME: 1 });
  assert.equal(summary.cleanedUp, 1);
  assert.equal(summary.entries.length, 20);
  assert.equal(r.json.dryRunReport, join(home, 'data', 'out', 'dry-run-' + r.json.dryRunReport.split('dry-run-')[1]));
  const full = JSON.parse(readFileSync(r.json.dryRunReport, 'utf8'));
  assert.equal(full.entries.length, 33);
  assert.equal(full.entries.at(-1).method, 'appendChild');
  assert.equal(full.entries.at(-1).to.name, 'Temp');
  // The step belongs to the plan of the plugin's file.
  assert.deepEqual((await api('/plan')).tasks, [{ text: 'E2E step', state: 'todo', fileKey: 'TESTFILE' }]);
});

test('--na-sucho is the same flag; a throwing dry run exits 1 and still reports', async () => {
  const before = fx.mock.snapshot();
  const r = await runCli(job('dry-fail.js', `figma.createFrame(); one('Card (e2e)').visible = false; throw new Error('nope');`), '--na-sucho');
  assert.equal(r.code, 1);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.error, 'nope');
  assert.equal(r.json.dryRun.error, 'nope');
  assert.equal(r.json.dryRun.cleanedUp, 1);
  assert.equal(r.json.dryRun.counts.set, 1);
  assert.deepEqual(fx.mock.snapshot(), before);
});

test('--krok marks the plan step done after a successful normal run', async () => {
  await api('/plan', { tasks: [{ text: 'E2E step', state: 'todo' }] });
  const r = await runCli(job('step.js', 'return 1'), '--krok', 'E2E step');
  assert.equal(r.code, 0, r.out + r.err);
  assert.equal((await api('/plan')).tasks[0].state, 'done');
});

test('--file sends the job, its plan step and its project to one Figma file: a key or a part of the name', async () => {
  await api('/plan', { tasks: [{ text: 'File step', state: 'todo' }] });
  const byKey = await runCli(job('file.js', 'return [figma.root.name, projectName()]'), '--file', 'TESTFILE', '--step', 'File step');
  assert.equal(byKey.code, 0, byKey.out + byKey.err);
  assert.deepEqual(byKey.json.result, ['Test file', 'demo']);
  assert.equal((await api('/plan')).tasks[0].state, 'done');
  const byName = await runCli('file.js', '--file', 'test fi');
  assert.deepEqual(byName.json.result, ['Test file', 'demo']);
  const unknown = await runCli('file.js', '--file', 'nope');
  assert.equal(unknown.code, 1);
  assert.match(unknown.json.error, /^no open file matches "nope"/);
  // A file nobody has the plugin open in: the job waits for its window and times out; it never runs elsewhere.
  const before = fx.mock.snapshot();
  const closed = await runCli(job('elsewhere.js', 'figma.root.name = "wrong file"; return 1'), '300', '--file', 'OTHERKEY');
  assert.equal(closed.code, 1);
  assert.match(closed.json.error, /^timeout.*OTHERKEY/);
  assert.deepEqual(fx.mock.snapshot(), before);
});

test('run.mjs sends its job to the file the status named, so the project prelude and the job agree', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'bridge-run-'));
  mkdirSync(join(temp, 'data'));
  writeFileSync(join(temp, 'data', 'token.txt'), 'fake-token');
  const bodies = [];
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; });
    req.on('end', () => {
      if (req.url !== '/status') bodies.push([req.url, JSON.parse(body).file]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(req.url === '/status' ? { connected: true, file: { fileKey: 'SEEN', fileName: 'Seen' } } : { ok: true, result: 1, tasks: [] }));
    });
  });
  await new Promise(ok => fake.listen(0, '127.0.0.1', ok));
  try {
    const child = spawn(process.execPath, [join(root, 'run.mjs'), join(work, 'step.js'), '--step', 'x'], { env: { ...process.env, BRIDGE_HOME: temp, BRIDGE_PORT: String(fake.address().port) } });
    assert.equal(await new Promise(ok => child.on('exit', ok)), 0);
    assert.deepEqual(bodies, [['/plan', 'SEEN'], ['/job', 'SEEN'], ['/plan', 'SEEN']]);
  } finally { await new Promise(ok => fake.close(ok)); rmSync(temp, { recursive: true, force: true }); }
});

test('plan.mjs sets and marks the plan of one file and says which', async () => {
  const set = await runPlan('--file', 'TESTFILE', 'x:Done step', '>:Active step', '-:Later');
  assert.deepEqual([set.code, set.out], [0, '1/3 · Test file']);
  assert.deepEqual((await api('/plan?file=TESTFILE')).tasks.map(t => t.state + ' ' + t.text + ' ' + t.fileKey), ['done Done step TESTFILE', 'active Active step TESTFILE', 'todo Later TESTFILE']);
  assert.equal((await runPlan('--done', 'Active')).out, '2/3 · Test file');
  const unknown = await runPlan('--file', 'nope', '--add', 'x');
  assert.equal(unknown.code, 1);
  assert.match(unknown.err, /^plan: no open file matches "nope"/);
  assert.equal((await runPlan('--file')).code, 1);
  await api('/plan', { tasks: [] });
});

test('A03: tools/snapshot.mjs takes a plain label only: it names a folder and goes into the job', async () => {
  const snapshot = (...args) => new Promise(ok => {
    const child = spawn(process.execPath, [join(root, 'tools', 'snapshot.mjs'), ...args], { env, cwd: work });
    let err = '';
    child.stderr.on('data', d => { err += d; });
    child.on('exit', code => ok({ code, err }));
  });
  const before = fx.mock.snapshot();
  for (const label of ['x\nfigma.root.name = "pwned"', '../../outside', 'a/b', '']) {
    const r = await snapshot(label);
    assert.equal(r.code, 2, JSON.stringify(label) + ' → ' + r.code + ' ' + r.err);
    assert.match(r.err, /label/);
  }
  assert.deepEqual(fx.mock.snapshot(), before);
  assert.ok(!existsSync(join(home, 'outside')));
  const fine = await snapshot('before-1.2');
  assert.equal(fine.code, 0, fine.err);
  assert.ok(existsSync(join(home, 'data', 'out', 'before-1.2')));
});

test('--no-prelude sends none; bad combinations and missing files stop before sending', async () => {
  const bare = await runCli(job('bare.js', 'return typeof hex'), '--no-prelude');
  assert.equal(bare.code, 0, bare.out + bare.err);
  assert.equal(bare.json.result, 'undefined');
  const both = await runCli('bare.js', '--no-prelude', '--prelude', 'extra-prelude.js');
  assert.equal(both.code, 2);
  assert.match(both.err, /--no-prelude excludes --prelude and --project/);
  const missing = await runCli('bare.js', '--prelude', 'nope.js');
  assert.equal(missing.code, 2);
  assert.match(missing.err, /prelude file not found: .*nope\.js/);
  const unknown = await runCli('bare.js', '--dryrun');
  assert.equal(unknown.code, 2);
  assert.match(unknown.err, /unknown option --dryrun/);
});

test('comments are polled for the plugin file and the files of every local project', async () => {
  for (let i = 0; i < 60 && polledKeys.size < 2; i++) await new Promise(ok => setTimeout(ok, 100));
  assert.deepEqual([...polledKeys].sort(), ['OTHERKEY', 'TESTFILE']);
  assert.equal((await api('/status')).comments, 'działa');
});

test('a job the plugin never answers times out with the server message', async () => {
  const r = await runCli(job('slow.js', 'await new Promise(ok => setTimeout(ok, 1000));'), '300');
  assert.equal(r.code, 1);
  assert.match(r.json.error, /^timeout/);
});
