// Comment agent: server.mjs hands it new top-level comments of the plugin's file while listening is on.
// One comment at a time: prefetch an outline of the pinned node through the job queue, build the prompt,
// run Claude Code headless with only the figma-bridge MCP, reply in the thread, keep the plan entry current.
import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bridgeHome, codeDir, dataDir } from './paths.mjs';

export const DEFAULT_PROMPT = `New Figma comment in "{{fileName}}" (fileKey {{fileKey}}).

#{{number}} by {{author}}: "{{text}}"
Pinned to node {{nodeId}}{{#where}} at {{where}}{{/where}}.
{{#inspect}}
Outline of the pinned node:
{{inspect}}
{{/inspect}}
Work in Figma through the figma-bridge tools (figma_inspect, figma_find, figma_library, figma_run, figma_screenshot).
Bulk or destructive edits: figma_run with dryRun:true first. Check every change with figma_screenshot.
When the change concerns a shared pattern, fix the component, not single instances.
Do what the comment asks, nothing more. End with one sentence, in the language of the comment, saying what you did.`;

// {{key}} → value. {{#key}}…{{/key}} keeps its inside only when key has a value, so wording stays in the
// template (and in its language) while values stay bare. Values are inserted, never expanded.
export const renderPrompt = (template, e) => {
  const values = { fileKey: e.fileKey, fileName: e.fileName || e.fileKey, number: e.number ?? '', author: e.author || '', text: e.text || '',
    nodeId: e.nodeId || '—', where: e.offset ? Math.round(e.offset.x) + ',' + Math.round(e.offset.y) : '', inspect: e.inspect || '' };
  return template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inside) => Object.hasOwn(values, key) && values[key] ? inside : '')
    .replace(/\{\{(\w+)\}\}/g, (m, key) => Object.hasOwn(values, key) ? String(values[key]) : m);
};

export const BUILTIN_TOOLS = 'Read,Write,Edit,Glob,Grep';
export const ALLOWED_TOOLS = 'mcp__figma-bridge__*,' + BUILTIN_TOOLS;
// A comment can be written by anyone with access to the file, so its text is untrusted input. --restricted drops
// the tools that run code and WebFetch, ignores the user's settings files (their allow rules would widen the
// list below) and keeps the file tools inside the working directory; --tools names the only built-ins it gets.
// A prompt starting with "-" (a front-matter "---") would be parsed as an option; a leading newline is harmless.
// fileKey: the session's MCP server sends every job to the plugin window of that file (FIGMA_FILE), so the plugin
// being open in a second file cannot turn the comment's edits there.
export const claudeArgs = (prompt, { mcpPath, budgetUsd, fileKey = null }) => ['-p', prompt.startsWith('-') ? '\n' + prompt : prompt, '--output-format', 'json', '--permission-mode', 'dontAsk',
  '--restricted', '--tools', BUILTIN_TOOLS, '--strict-mcp-config', '--mcp-config',
  JSON.stringify({ mcpServers: { 'figma-bridge': Object.assign({ command: 'node', args: [mcpPath] }, fileKey ? { env: { FIGMA_FILE: fileKey } } : {}) } }),
  '--allowedTools', ALLOWED_TOOLS, '--max-budget-usd', String(budgetUsd)];

// The thread gets the closing sentence the prompt asks for, not the whole transcript.
export const summarize = text => {
  const last = String(text || '').trim().split(/\n\s*\n/).pop().replace(/[*_`#>]+/g, '').replace(/\s+/g, ' ').trim();
  return last.length > 280 ? last.slice(0, 279) + '…' : last;
};
export const REPLY_TAIL = 'Sprawdź i zamknij wątek, jeśli się zgadza.';
export const inspectCode = nodeId => 'return await inspect(' + JSON.stringify(nodeId) + ', { depth: 2 })';

const number = (value, fallback) => Number(value) > 0 ? Number(value) : fallback;

// deps: runJob({code, prelude, label, timeoutMs, file}) → {ok, result, error}; reply(fileKey, commentId, text) → {ok};
// setStatus(event, planState, statusText); ready(event) → may this comment run now; project(fileKey) → {root, prompt} | null.
export function createAgent({ runJob, reply, setStatus, ready = () => true, project = () => null, prelude = () => '',
  log = console.log, env = process.env, now = Date.now,
  maxPerHour = number(env.BRIDGE_AGENT_MAX_PER_HOUR, 6), timeoutMs = number(env.BRIDGE_AGENT_TIMEOUT_MS, 15 * 60e3),
  budgetUsd = number(env.BRIDGE_AGENT_BUDGET_USD, 5), inspectTimeoutMs = 30e3,
  mcpPath = join(codeDir, 'mcp.mjs'), scratchDir = () => join(dataDir(), 'scratch') } = {}) {
  const queue = [], starts = [], idleWaiters = [];
  let running = null;

  const runClaude = (args, cwd) => new Promise(done => {
    // A server started from inside a Claude Code session inherits its marker, and claude refuses nested sessions.
    const childEnv = { ...env, BRIDGE_HOME: bridgeHome() };
    delete childEnv.CLAUDECODE;
    const child = execFile('claude', args, { cwd, env: childEnv, timeout: timeoutMs, maxBuffer: 5e7 }, (err, stdout, stderr) => {
      // Not err.message: it repeats the whole command line, prompt included.
      if (err) return done({ ok: false, why: err.killed ? 'timeout' : (String(stderr).trim() || 'exit ' + err.code).slice(0, 300) });
      let j = null;
      try { j = JSON.parse(String(stdout).trim().split('\n').pop()); } catch (e) { return done({ ok: false, why: 'unreadable output' }); }
      done(j.is_error || (j.subtype && j.subtype !== 'success') ? { ok: false, why: j.subtype || 'error', out: j } : { ok: true, out: j });
    });
    child.stdin.end();
  });

  async function handle(e) {
    setStatus(e, 'active', 'w toku');
    log(`#${e.number}: start`);
    try {
      const p = project(e.fileKey);
      let inspect = '';
      if (e.nodeId) {
        const r = await runJob({ code: inspectCode(e.nodeId), prelude: prelude(), label: 'Komentarz #' + e.number, timeoutMs: inspectTimeoutMs, file: e.fileKey });
        inspect = r.ok ? (typeof r.result === 'string' ? r.result : JSON.stringify(r.result)) : '(unavailable: ' + r.error + ')';
      }
      const cwd = p ? p.root : scratchDir();
      mkdirSync(cwd, { recursive: true });
      const r = await runClaude(claudeArgs(renderPrompt(p && p.prompt ? readFileSync(p.prompt, 'utf8').trimEnd() : DEFAULT_PROMPT, { ...e, inspect }), { mcpPath, budgetUsd, fileKey: e.fileKey }), cwd);
      if (!r.ok) { log(`#${e.number}: failed (${r.why})`); return setStatus(e, 'todo', 'nieudane'); }
      const summary = summarize(r.out.result);
      const sent = await reply(e.fileKey, e.id, 'Claude: ' + (summary || 'zrobione.') + '\n\n' + REPLY_TAIL);
      log(`#${e.number}: done, $${Number(r.out.total_cost_usd || 0).toFixed(2)}, session ${r.out.session_id || '?'}, reply ${sent && sent.ok ? 'posted' : 'failed: ' + (sent && sent.error)}`);
      setStatus(e, 'done', 'zrobione');
    } catch (err) {
      log(`#${e.number}: failed (${err.message})`);
      setStatus(e, 'todo', 'nieudane');
    }
  }

  // The first queued comment that may run now: one waiting for its file does not hold up the others.
  const pump = () => {
    const i = running ? -1 : queue.findIndex(e => ready(e));
    if (i < 0) { if (!running && !queue.length) idleWaiters.splice(0).forEach(f => f()); return; }
    const [e] = queue.splice(i, 1);
    running = e;
    handle(e).catch(err => log(`#${e.number}: ${err.message}`)).finally(() => { running = null; pump(); });
  };

  return {
    // Counted when accepted, so a burst of comments cannot queue past the hourly cap.
    enqueue(e) {
      const t = now();
      while (starts.length && t - starts[0] >= 3600e3) starts.shift();
      if (starts.length >= maxPerHour) { log(`#${e.number}: skipped, limit ${maxPerHour}/h`); setStatus(e, 'todo', `pominięte: limit ${maxPerHour}/h`); return false; }
      starts.push(t);
      queue.push(e);
      setStatus(e, 'todo', 'w kolejce');
      pump();
      return true;
    },
    pump,
    // Listening switched off: queued comments go back to plain plan entries; a running one finishes.
    clear() { for (const e of queue.splice(0)) setStatus(e, 'todo', null); pump(); },
    // The thread was resolved or deleted in Figma: a queued comment is dropped (the server updates its plan entry).
    cancel(id) { const i = queue.findIndex(e => e.id === id); if (i >= 0) queue.splice(i, 1); pump(); },
    state: () => ({ running: running ? running.number : null, queued: queue.length }),
    idle: () => new Promise(ok => { if (!running && !queue.length) ok(); else idleWaiters.push(ok); }),
  };
}
