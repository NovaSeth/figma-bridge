// agent.mjs: prompt, claude arguments, the one-at-a-time queue, the hourly cap and a run through a fake `claude`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ALLOWED_TOOLS, DEFAULT_PROMPT, REPLY_TAIL, claudeArgs, createAgent, inspectCode, renderPrompt, summarize } from '../agent.mjs';

const pinned = { type: 'comment', fileKey: 'KEY1', fileName: 'Mockups', id: '9', number: 47, author: 'Ann', text: 'Move the chip 4 px left', nodeId: '1:2', offset: { x: 10.4, y: 22.6 } };
const loose = { ...pinned, fileName: null, number: 48, nodeId: null, offset: null };

let dir, bin, log, savedHome;
// A stand-in for the claude CLI: logs its arguments, cwd and environment, then answers like `--output-format json`.
before(() => {
  dir = mkdtempSync(join(tmpdir(), 'bridge-agent-'));
  savedHome = process.env.BRIDGE_HOME;
  process.env.BRIDGE_HOME = join(dir, 'home');
  bin = join(dir, 'bin');
  log = join(dir, 'claude.log');
  mkdirSync(bin);
  writeFileSync(join(dir, 'fake-claude.cjs'), `
const fs = require('fs');
const mode = process.env.FAKE_CLAUDE_MODE || 'ok';
if (mode === 'crash') process.exit(2); // silent: no stderr to report
const entry = { argv: process.argv.slice(2), cwd: process.cwd(), home: process.env.BRIDGE_HOME || null, nested: process.env.CLAUDECODE || null };
fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ start: Date.now(), ...entry }) + '\\n');
const finish = () => {
  fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, JSON.stringify({ end: Date.now() }) + '\\n');
  if (mode === 'error') console.log(JSON.stringify({ type: 'result', subtype: 'error_max_budget_usd', is_error: true }));
  else console.log(JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'Looked at it.\\n\\nMoved the **chip** 4 px left.', total_cost_usd: 0.12, session_id: 's1' }));
};
setTimeout(finish, mode === 'hang' ? 5000 : 150);
`);
  writeFileSync(join(bin, 'claude'), `#!/bin/sh\nexec "${process.execPath}" "${join(dir, 'fake-claude.cjs')}" "$@"\n`);
  chmodSync(join(bin, 'claude'), 0o755);
});
after(() => {
  if (savedHome === undefined) delete process.env.BRIDGE_HOME; else process.env.BRIDGE_HOME = savedHome;
  rmSync(dir, { recursive: true, force: true });
});

const readLog = () => existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];

// Everything the agent talks to, recorded.
function rig({ mode = 'ok', project = null, ...options } = {}) {
  rmSync(log, { force: true });
  const calls = { jobs: [], replies: [], status: [], log: [] };
  const agent = createAgent({
    runJob: async job => { calls.jobs.push(job); return { ok: true, result: 'FRAME "Chip" 1:2 40×24' }; },
    reply: async (fileKey, commentId, text) => { calls.replies.push({ fileKey, commentId, text }); return { ok: true, id: 'r1' }; },
    setStatus: (e, state, status) => calls.status.push([e.number, state, status]),
    project: () => project,
    prelude: () => '/* prelude */',
    log: line => calls.log.push(line),
    env: { ...process.env, PATH: bin + ':' + process.env.PATH, FAKE_CLAUDE_LOG: log, FAKE_CLAUDE_MODE: mode, CLAUDECODE: '1' },
    mcpPath: '/app/mcp.mjs', budgetUsd: 3, scratchDir: () => join(dir, 'scratch'),
    ...options,
  });
  return { agent, calls };
}

test('placeholders are filled; sections only when their value exists', () => {
  const t = '{{fileName}} {{fileKey}} #{{number}} {{author}} "{{text}}" {{nodeId}}{{#where}} at {{where}}{{/where}}.{{#inspect}}\n{{inspect}}{{/inspect}}';
  assert.equal(renderPrompt(t, { ...pinned, inspect: 'FRAME "Chip"' }), 'Mockups KEY1 #47 Ann "Move the chip 4 px left" 1:2 at 10,23.\nFRAME "Chip"');
  assert.equal(renderPrompt(t, loose), 'KEY1 KEY1 #48 Ann "Move the chip 4 px left" —.');
});

test('comment text is inserted verbatim, unknown placeholders stay as written', () => {
  const e = { ...pinned, text: 'literal {{fileKey}} and {{#where}}x{{/where}} and $& $1' };
  assert.equal(renderPrompt('{{text}}', e), e.text);
  assert.equal(renderPrompt('{{nope}} {{author}}', pinned), '{{nope}} Ann');
  assert.equal(renderPrompt('{{constructor}}{{#toString}}x{{/toString}}', pinned), '{{constructor}}');
});

test('the built-in prompt uses every placeholder and names the MCP tools, not scripts', () => {
  for (const key of ['fileName', 'fileKey', 'number', 'author', 'text', 'nodeId', 'where', 'inspect']) assert.match(DEFAULT_PROMPT, new RegExp('\\{\\{#?' + key + '\\}\\}'));
  assert.match(DEFAULT_PROMPT, /figma_run with dryRun:true first/);
  assert.doesNotMatch(DEFAULT_PROMPT, /run\.mjs/);
  assert.ok(DEFAULT_PROMPT.length < 1100, 'the prompt is paid for on every comment: ' + DEFAULT_PROMPT.length);
});

test('claude gets exactly the contract arguments', () => {
  assert.deepEqual(claudeArgs('P', { mcpPath: '/h/app/mcp.mjs', budgetUsd: 2.5 }), ['-p', 'P', '--output-format', 'json', '--permission-mode', 'dontAsk',
    '--restricted', '--tools', 'Read,Write,Edit,Glob,Grep', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{"figma-bridge":{"command":"node","args":["/h/app/mcp.mjs"]}}}',
    '--allowedTools', 'mcp__figma-bridge__*,Read,Write,Edit,Glob,Grep', '--max-budget-usd', '2.5']);
  assert.equal(ALLOWED_TOOLS, 'mcp__figma-bridge__*,Read,Write,Edit,Glob,Grep');
  assert.equal(inspectCode('1:2'), 'return await inspect("1:2", { depth: 2 })');
});

test('the session of a comment is tied to the comment\'s file: its MCP server gets FIGMA_FILE', () => {
  const args = claudeArgs('P', { mcpPath: '/h/app/mcp.mjs', budgetUsd: 1, fileKey: 'KEY1' });
  assert.deepEqual(JSON.parse(args[args.indexOf('--mcp-config') + 1]), { mcpServers: { 'figma-bridge': { command: 'node', args: ['/h/app/mcp.mjs'], env: { FIGMA_FILE: 'KEY1' } } } });
});

test('the reply carries the closing sentence, not the transcript', () => {
  assert.equal(summarize('Checked.\n\nMoved the **chip** 4 px\nleft.'), 'Moved the chip 4 px left.');
  assert.equal(summarize(''), '');
  assert.equal(summarize('x'.repeat(400)).length, 280);
});

test('a comment runs end to end: inspect prefetch, prompt, claude in the project folder, reply, plan states', async () => {
  const root = join(dir, 'projects', 'alpha');
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, 'prompt.md'), 'Do #{{number}} "{{text}}" on {{nodeId}}\n{{inspect}}\n');
  const { agent, calls } = rig({ project: { root, prompt: join(root, 'prompt.md') } });
  assert.equal(agent.enqueue(pinned), true);
  await agent.idle();
  // The outline is read in the comment's file, wherever else the plugin is open too.
  assert.deepEqual(calls.jobs, [{ code: 'return await inspect("1:2", { depth: 2 })', prelude: '/* prelude */', label: 'Komentarz #47', timeoutMs: 30000, file: 'KEY1' }]);
  const [run] = readLog().filter(l => l.start);
  assert.deepEqual(run.argv, claudeArgs('Do #47 "Move the chip 4 px left" on 1:2\nFRAME "Chip" 1:2 40×24', { mcpPath: '/app/mcp.mjs', budgetUsd: 3, fileKey: 'KEY1' }));
  assert.equal(run.cwd, await import('node:fs').then(fs => fs.realpathSync(root)));
  assert.equal(run.nested, null, 'CLAUDECODE is dropped: claude refuses to start inside another session');
  assert.equal(run.home, join(dir, 'home'), 'the MCP server claude starts finds the same bridge home');
  assert.deepEqual(calls.replies, [{ fileKey: 'KEY1', commentId: '9', text: 'Claude: Moved the chip 4 px left.\n\n' + REPLY_TAIL }]);
  assert.deepEqual(calls.status, [[47, 'todo', 'w kolejce'], [47, 'active', 'w toku'], [47, 'done', 'zrobione']]);
});

test('without a project: built-in prompt, no inspect for an unpinned comment, cwd data/scratch', async () => {
  const { agent, calls } = rig();
  agent.enqueue(loose);
  await agent.idle();
  assert.equal(calls.jobs.length, 0);
  const [run] = readLog().filter(l => l.start);
  assert.match(run.argv[1], /^New Figma comment in "KEY1" \(fileKey KEY1\)\.\n\n#48 by Ann: "Move the chip 4 px left"\nPinned to node —\.\n\nWork in Figma/);
  assert.ok(run.cwd.endsWith(join('scratch')));
});

test('one comment at a time, in order', async () => {
  const { agent, calls } = rig();
  agent.enqueue({ ...loose, id: 'a', number: 1 });
  agent.enqueue({ ...loose, id: 'b', number: 2 });
  assert.deepEqual(agent.state(), { running: 1, queued: 1 });
  await agent.idle();
  const entries = readLog();
  assert.deepEqual(entries.map(l => (l.start ? 'start' : 'end')), ['start', 'end', 'start', 'end']);
  assert.ok(entries[2].start >= entries[1].end, 'the second run starts after the first ended');
  assert.deepEqual(calls.replies.map(r => r.commentId), ['a', 'b']);
});

test('the hourly cap skips extra comments until an hour has passed', async () => {
  let now = 1_000_000;
  const { agent, calls } = rig({ maxPerHour: 2, now: () => now });
  for (const n of [1, 2, 3]) agent.enqueue({ ...loose, id: 'c' + n, number: n });
  await agent.idle();
  assert.deepEqual(calls.status.filter(s => s[0] === 3), [[3, 'todo', 'pominięte: limit 2/h']]);
  assert.equal(calls.replies.length, 2);
  now += 3600e3;
  assert.equal(agent.enqueue({ ...loose, id: 'c4', number: 4 }), true);
  await agent.idle();
  assert.equal(calls.replies.length, 3);
});

test('a failing or hanging claude marks the comment failed and posts no reply', async () => {
  const failed = rig({ mode: 'error' });
  failed.agent.enqueue(loose);
  await failed.agent.idle();
  assert.deepEqual(failed.calls.status.at(-1), [48, 'todo', 'nieudane']);
  assert.equal(failed.calls.replies.length, 0);
  const hung = rig({ mode: 'hang', timeoutMs: 300 });
  hung.agent.enqueue(loose);
  await hung.agent.idle();
  assert.deepEqual(hung.calls.status.at(-1), [48, 'todo', 'nieudane']);
  assert.ok(hung.calls.log.some(l => /timeout/.test(l)));
});

test('nothing starts while not ready; clear() hands queued comments back to the plan', async () => {
  let ready = false;
  const { agent, calls } = rig({ ready: () => ready });
  agent.enqueue({ ...loose, id: 'q1', number: 5 });
  agent.enqueue({ ...loose, id: 'q2', number: 6 });
  assert.deepEqual(agent.state(), { running: null, queued: 2 });
  ready = true;
  agent.pump();
  assert.equal(agent.state().running, 5);
  agent.clear();
  await agent.idle();
  assert.deepEqual(calls.status.filter(s => s[0] === 6), [[6, 'todo', 'w kolejce'], [6, 'todo', null]]);
  assert.deepEqual(calls.replies.map(r => r.commentId), ['q1']);
});

test('a prompt starting with a dash is not read as an option', () => {
  assert.equal(claudeArgs('--- front matter\nDo it', { mcpPath: '/m', budgetUsd: 1 })[1], '\n--- front matter\nDo it');
});

test('cancel drops a queued comment without a status; the running one goes on', async () => {
  let ready = false;
  const { agent, calls } = rig({ ready: () => ready });
  agent.enqueue({ ...loose, id: 'k1', number: 7 });
  agent.enqueue({ ...loose, id: 'k2', number: 8 });
  agent.cancel('k2');
  assert.deepEqual(agent.state(), { running: null, queued: 1 });
  ready = true;
  agent.pump();
  agent.cancel('k1');
  await agent.idle();
  assert.deepEqual(calls.replies.map(r => r.commentId), ['k1']);
  assert.deepEqual(calls.status.filter(s => s[0] === 8), [[8, 'todo', 'w kolejce']]);
});

test('a silent crash is logged by exit code, never by the command line that carries the prompt', async () => {
  const { agent, calls } = rig({ mode: 'crash' });
  agent.enqueue(loose);
  await agent.idle();
  const line = calls.log.find(l => /failed/.test(l));
  assert.match(line, /failed \(exit 2\)/);
  assert.doesNotMatch(line, /Move the chip/);
});

test('a comment that may not run yet does not hold up the ones behind it', async () => {
  const { agent, calls } = rig({ ready: e => e.fileKey === 'B' });
  agent.enqueue({ ...loose, id: 'a', number: 1, fileKey: 'A' });
  agent.enqueue({ ...loose, id: 'b', number: 2, fileKey: 'B' });
  assert.deepEqual(agent.state(), { running: 2, queued: 1 });
  agent.clear();
  await agent.idle();
  assert.deepEqual(calls.replies.map(r => r.commentId), ['b']);
});
