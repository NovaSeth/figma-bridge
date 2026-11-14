// The plugin window (the script of ui.template.html) against the real server, in process: what the window shows
// and asks for. The DOM is the stub of harness.mjs, the plugin the real code.js on the mock Figma.
import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server.mjs';
import { startUi } from './harness.mjs';
import { createFigma } from './mock-figma.mjs';

const homes = [], cleanups = [];
after(() => homes.forEach(h => rmSync(h, { recursive: true, force: true })));
afterEach(async () => { for (const f of cleanups.splice(0).reverse()) await f(); });
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const until = async (check, ms = 5000) => { for (const end = Date.now() + ms; Date.now() < end; await sleep(25)) if (await check()) return true; return false; };

// A server in a fresh home and one plugin window in the mock's file (TESTFILE).
async function open(uiOptions) {
  const h = mkdtempSync(join(tmpdir(), 'bridge-ui-'));
  homes.push(h);
  mkdirSync(join(h, 'data'), { recursive: true });
  process.env.BRIDGE_HOME = h;
  const agent = { enqueue: () => true, pump() {}, clear() {}, cancel() {}, state: () => ({ running: null, queued: 0 }) };
  const s = await startServer({ port: 0, pollMs: 1e6, agent });
  cleanups.push(s.close);
  const mock = createFigma();
  const ui = startUi(readFileSync(join(h, 'app', 'ui.html'), 'utf8'), mock, uiOptions);
  cleanups.push(() => ui.stop());
  const api = async (path, body) => {
    const r = await fetch('http://127.0.0.1:' + s.port + path, body === undefined ? { headers: { 'X-Bridge-Token': s.token } }
      : { method: 'POST', headers: { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  };
  assert.ok(await until(async () => (await api('/status')).body.connected), 'the window connected');
  const rows = () => ui.$('plan').children.filter(li => !li.classList.contains('leaving')).map(li => li.textContent);
  return { s, ui, mock, api, rows };
}

test('two plan steps with the same text are two rows, however often the window redraws', async () => {
  const { ui, mock, api, rows } = await open();
  await api('/plan', { tasks: ['Check contrast', 'Check contrast', 'Export'] });
  assert.ok(await until(() => rows().length === 3), 'the plan shows: ' + JSON.stringify(rows()));
  for (let i = 1; i <= 6; i++) mock.state.listener({ type: 'progress', value: i / 10, note: '' }); // each one redraws
  assert.deepEqual(rows(), ['Check contrast', 'Check contrast', 'Export']);
  await sleep(600); // rows on their way out are gone by now
  assert.equal(ui.$('plan').children.length, 3);
});

test('a job the plugin never answers stops showing as running once nobody waits for it', async () => {
  const { ui, api } = await open();
  const stuck = api('/job', { code: 'await new Promise(() => {});', label: 'stuck', timeoutMs: 300 });
  assert.ok(await until(() => ui.$('now').textContent === 'Pracuję'), ui.$('now').textContent);
  assert.equal((await stuck).status, 504);
  assert.ok(await until(() => ui.$('now').textContent === 'Krok przekroczył czas', 4000), 'still shows: ' + ui.$('now').textContent);
  assert.match(ui.$('state').className, /\berr\b/);
  // The plugin knows the limit too: the stuck job no longer counts as running beside the next one, whose
  // failure is cleaned up as usual.
  assert.equal((await api('/job', { code: 'figma.createFrame(); throw new Error("boom")' })).body.error, 'boom (posprzątano 1 niedokończonych węzłów)');
  // The window keeps working: the next job runs and the error clears.
  assert.equal((await api('/job', { code: 'return 7' })).body.result, 7);
  assert.ok(await until(() => ui.$('now').textContent === 'Czekam na zadania'), ui.$('now').textContent);
});

test('the window gets its plan and the listen state with one request, not two, every 2 s', async () => {
  const { ui, api, rows } = await open();
  await api('/plan', { add: 'A step' });
  await api('/listen', { on: true });
  assert.ok(await until(() => rows().length === 1 && ui.$('listen').checked === true), 'plan and switch show');
  assert.equal(ui.$('listenNote').textContent, 'Brak tokenu Figmy: uruchom add-token.sh'); // this home has none
  const polls = ui.requests.filter(r => /^GET \/(plan|listen|window)\b/.test(r));
  assert.ok(polls.length >= 1 && polls.every(r => r === 'GET /window?file=TESTFILE'), JSON.stringify([...new Set(polls)]));
});

test('a result the window could not hand to the server at first is sent again', async () => {
  let failed = 0;
  const { api } = await open({ intercept: (url, init) => (init.method === 'POST' && url.endsWith('/result') && failed++ === 0 ? Promise.reject(new TypeError('fetch failed')) : undefined) });
  const r = await api('/job', { code: 'return "kept"', timeoutMs: 4000 });
  assert.equal(failed >= 1, true);
  assert.deepEqual([r.status, r.body.result], [200, 'kept']);
});

test('the window head: a large mark with its status dot on the left, the state, bar and last step beside it', () => {
  const html = readFileSync(new URL('../ui.template.html', import.meta.url), 'utf8');
  const head = html.match(/<div class="head" id="state">([\s\S]*?)<label class="listen">/);
  assert.ok(head, 'a head block holds the brand and the info column');
  assert.match(head[1], /^<span class="brand">[\s\S]*?<span class="dot"><\/span><\/span><div class="info">/);
  const info = head[1].slice(head[1].indexOf('<div class="info">'));
  for (const id of ['now', 'side', 'bar', 'last']) assert.match(info, new RegExp('id="' + id + '"'), id + ' sits in the info column');
  const size = html.match(/\.brand\{[^}]*width:(\d+)px/);
  assert.ok(size && Number(size[1]) >= 32, 'the mark is large: ' + (size && size[1]));
  assert.match(html, /\$\('state'\)\.className = 'head '/);
});
