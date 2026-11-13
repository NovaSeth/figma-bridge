// Loads the real code.js into its own realm with the mock as `figma`, the way the plugin sandbox does,
// and drives it through figma.ui.onmessage with the message shape ui.html sends. For end-to-end tests also:
// server.mjs as a child process in a temporary BRIDGE_HOME, and the plugin window (the real script of the
// ui.html that server wrote) in a vm with a stub DOM, so every hop a job takes is the real one.
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PRELUDE_SEPARATOR = '\n/*@bridge:prelude-scope*/\n';
export const builtInPrelude = () => readFileSync(join(root, 'prelude.js'), 'utf8');

export function loadPlugin(mock) {
  const ctx = vm.createContext({ figma: mock.figma, __html__: '<p>ui</p>', console, setTimeout, clearTimeout });
  vm.runInContext(readFileSync(join(root, 'code.js'), 'utf8'), ctx, { filename: 'code.js' });
  let n = 0;
  return {
    ctx,
    // Resolves with the plugin's result message for this job.
    async run(code, { prelude = '', dryRun = false, legacy = false, timeoutMs } = {}) {
      const id = 'job-' + (++n), from = mock.messages.length;
      await mock.figma.ui.onmessage(legacy ? { type: 'job', id, code } : Object.assign({ type: 'job', id, code, prelude, dryRun }, timeoutMs ? { timeoutMs } : {}));
      return mock.messages.slice(from).find(m => m.type === 'result' && m.id === id);
    },
  };
}

// Runs a prelude helper the way the MCP tools do: `return await <call>` with the built-in prelude.
export async function runHelper(mock, call) {
  const r = await loadPlugin(mock).run('return await ' + call + ';', { prelude: builtInPrelude() });
  if (!r.ok) throw new Error(r.error);
  return r.result;
}

export const freePort = () => new Promise((ok, fail) => {
  const s = net.createServer().on('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

// server.mjs as a child process; resolves once it listens. env needs BRIDGE_HOME and BRIDGE_PORT.
export async function startBridge(env) {
  const child = spawn(process.execPath, [join(root, 'server.mjs')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((ok, fail) => {
    let out = '';
    const timer = setTimeout(() => fail(new Error('server did not start: ' + out)), 10000);
    child.stdout.on('data', d => { out += d; if (out.includes('Figma bridge')) { clearTimeout(timer); ok(); } });
    child.stderr.on('data', d => { out += d; });
    child.once('exit', code => { clearTimeout(timer); fail(new Error('server exited ' + code + ': ' + out)); });
  });
  return {
    child,
    async stop() { if (child.exitCode === null) { const gone = new Promise(ok => child.once('exit', ok)); child.kill(); await gone; } },
  };
}

// The plugin window: its real script, with a DOM just big enough for render() and fetch pointed at 127.0.0.1.
// intercept(url, init) may return a promise to answer a request itself (a failure, say); undefined lets it through.
// → { stop, $: id → element, requests: ['GET /path', …] }
export function startUi(html, mock, { intercept = () => undefined } = {}) {
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).replace("'http://localhost:", "'http://127.0.0.1:");
  const timers = new Set(), controller = new AbortController(), queued = [], requests = [];
  let stopped = false;
  // Children, removal and class names behave as in a browser: the plan list is built and pruned through them.
  const element = () => {
    const el = { style: {}, dataset: {}, children: [], parent: null, className: '', textContent: '', onclick: null,
      getBoundingClientRect: () => ({ height: 60 }),
      remove() { if (el.parent) el.parent.children.splice(el.parent.children.indexOf(el), 1); el.parent = null; },
      insertBefore(c, before) { c.remove(); c.parent = el; const i = before ? el.children.indexOf(before) : -1; if (i < 0) el.children.push(c); else el.children.splice(i, 0, c); },
      classList: {
        contains: name => el.className.split(/\s+/).includes(name),
        add: name => { if (!el.classList.contains(name)) el.className = (el.className + ' ' + name).trim(); },
        remove: name => { el.className = el.className.split(/\s+/).filter(c => c !== name).join(' '); },
      } };
    return el;
  };
  const elements = new Map();
  const toPlugin = m => (mock.figma.ui.onmessage ? mock.figma.ui.onmessage(m) : queued.push(m));
  const ctx = vm.createContext({
    console, btoa,
    document: { getElementById: id => elements.get(id) || elements.set(id, element()).get(id), createElement: element },
    fetch: (url, init = {}) => {
      if (stopped) return new Promise(() => {});
      requests.push((init.method || 'GET') + ' ' + new URL(url).pathname + new URL(url).search);
      return intercept(url, init) || fetch(url, { ...init, signal: controller.signal });
    },
    setTimeout: (f, ms) => { if (stopped) return 0; const t = setTimeout(() => { timers.delete(t); f(); }, ms); timers.add(t); return t; },
    clearTimeout: t => { clearTimeout(t); timers.delete(t); },
    setInterval: (f, ms) => { if (stopped) return 0; const t = setInterval(f, ms); timers.add(t); return t; },
    clearInterval: t => { clearInterval(t); timers.delete(t); },
    requestAnimationFrame: () => 0,
    parent: { postMessage: data => toPlugin(data.pluginMessage) },
  });
  vm.runInContext(script, ctx, { filename: 'ui.html' });
  mock.state.listener = m => ctx.onmessage({ data: { pluginMessage: m } });
  loadPlugin(mock);
  queued.splice(0).forEach(toPlugin);
  return { requests, $: id => ctx.document.getElementById(id), stop() { stopped = true; controller.abort(); for (const t of timers) { clearTimeout(t); clearInterval(t); } } };
}

// A client for the bridge server's HTTP API.
export const bridgeApi = (port, token) => async (path, body) => (await fetch('http://127.0.0.1:' + port + path, body === undefined
  ? { headers: { 'X-Bridge-Token': token } }
  : { method: 'POST', headers: { 'X-Bridge-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
