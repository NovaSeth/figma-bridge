// The bridge's security contract, by OWASP Top 10 heading. The server runs in process in a temporary home; the
// "plugin" is a loop on its HTTP API. What the bridge is for (running the code a token holder sends in the open
// Figma file) is not under test here; what must hold around it is.
import { test, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { networkInterfaces, tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../server.mjs';

const homes = [], cleanups = [];
after(() => homes.forEach(h => rmSync(h, { recursive: true, force: true })));
afterEach(async () => { for (const f of cleanups.splice(0).reverse()) await f(); });
const sleep = ms => new Promise(ok => setTimeout(ok, ms));
const agent = { enqueue: () => true, pump() {}, clear() {}, cancel() {}, state: () => ({ running: null, queued: 0 }) };

async function start(options = {}) {
  const h = mkdtempSync(join(tmpdir(), 'bridge-sec-'));
  homes.push(h);
  mkdirSync(join(h, 'data'), { recursive: true });
  process.env.BRIDGE_HOME = h;
  const s = await startServer({ port: 0, pollMs: 1e6, agent, ...options });
  cleanups.push(s.close);
  const base = 'http://127.0.0.1:' + s.port, H = { 'X-Bridge-Token': s.token, 'Content-Type': 'application/json' };
  const api = async (path, body, headers = H) => {
    const r = await fetch(base + path, body === undefined ? { headers } : { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => null) };
  };
  // A plugin window answering every job with result(job).
  const plugin = (result = () => 1) => {
    const stop = new AbortController();
    cleanups.push(() => stop.abort());
    (async () => {
      await fetch(base + '/hello', { method: 'POST', headers: H, body: JSON.stringify({ win: 'w', fileKey: 'FILE', fileName: 'File' }) });
      for (;;) {
        let r;
        try { r = await fetch(base + '/next?win=w&file=FILE', { headers: H, signal: stop.signal }); } catch (e) { return; }
        if (r.status !== 200) continue;
        const job = await r.json();
        await fetch(base + '/result', { method: 'POST', headers: H, body: JSON.stringify({ id: job.id, ok: true, ...result(job) }) });
      }
    })();
    return sleep(100);
  };
  return { h, s, base, api, plugin, H };
}

// ---- A01 Broken access control / A07 Authentication failures

test('A01/A07: every endpoint refuses a request without the bridge token, and does nothing for it', async () => {
  const { s, api } = await start();
  const wrong = [{}, { 'X-Bridge-Token': '' }, { 'X-Bridge-Token': 'x' }, { 'X-Bridge-Token': s.token.slice(0, -1) + (s.token.endsWith('0') ? '1' : '0') },
    { 'X-Bridge-Token': s.token + '0' }, { Authorization: 'Bearer ' + s.token }, { Cookie: 'token=' + s.token }];
  const posts = { '/job': { code: 'return 1', timeoutMs: 50 }, '/plan': { add: 'sneaked in' }, '/listen': { on: true }, '/hello': { fileKey: 'EVIL' }, '/result': { id: 'x' }, '/comments/reply': { fileKey: 'F', commentId: '1', text: 'x' } };
  for (const headers of wrong) {
    for (const path of ['/status', '/next', '/events', '/plan', '/listen', '/window?file=FILE', '/nope']) assert.equal((await api(path, undefined, headers)).status, 401, 'GET ' + path + ' ' + JSON.stringify(headers));
    for (const [path, body] of Object.entries(posts)) assert.deepEqual(await api(path, body, { ...headers, 'Content-Type': 'application/json' }), { status: 401, body: { error: 'bad token' } }, 'POST ' + path);
  }
  // The token in the URL is not the token: it would end up in logs and histories.
  assert.equal((await api('/status?token=' + s.token, undefined, {})).status, 401);
  const status = (await api('/status')).body;
  assert.deepEqual([status.queued, status.file.fileKey, status.listen.on], [0, null, false]);
  assert.deepEqual((await api('/plan')).body.tasks, []);
});

test('A01: a screenshot name from the plugin cannot leave data/out', async () => {
  const { h, api, plugin } = await start();
  const b64 = Buffer.from('png').toString('base64');
  await plugin(() => ({ result: null, images: [{ name: '../../../escaped', b64 }, { name: '/tmp/abs', b64 }, { name: '..', b64 }] }));
  const out = (await api('/job', { code: 'return 1' })).body;
  const dir = join(h, 'data', 'out');
  assert.deepEqual(out.images, ['.._.._.._escaped.png', '_tmp_abs.png', '...png'].map(n => join(dir, n)));
  assert.deepEqual(readdirSync(dir).sort(), ['..._.._.._escaped.png'.slice(1), '...png', '_tmp_abs.png'].sort());
  assert.ok(!existsSync(join(h, 'escaped.png')) && !existsSync(join(h, 'data', 'escaped.png')));
});

test('A01/A05: the server listens on the loopback interface only', async t => {
  const { s } = await start();
  const outside = Object.values(networkInterfaces()).flat().find(i => i && i.family === 'IPv4' && !i.internal);
  if (!outside) return t.skip('this machine has no other network interface');
  const reached = await new Promise(ok => { const c = net.connect(s.port, outside.address); c.setTimeout(1500, () => { c.destroy(); ok(false); }); c.on('connect', () => { c.destroy(); ok(true); }); c.on('error', () => ok(false)); });
  assert.equal(reached, false, 'port ' + s.port + ' answers on ' + outside.address);
});

// ---- A02 Cryptographic failures / A05 Security misconfiguration

test('A02/A05: the token files, the plugin window and the data directory are readable by the user only', async () => {
  const { h, s } = await start();
  const mode = path => (statSync(join(h, path)).mode & 0o777).toString(8);
  assert.equal(s.token.length, 48, '24 random bytes');
  assert.deepEqual([mode('data/token.txt'), mode('app/ui.html')], ['600', '600']);
  // Comment texts, screenshots, results and logs live here.
  assert.equal(mode('data'), '700');
});

// ---- A09 Security logging and monitoring failures

test('A09: every job leaves a line in the server log: which, where, how it went; never its code', async () => {
  const lines = [];
  const { api, plugin } = await start({ log: (...a) => lines.push(a.join(' ')) });
  await plugin(job => (job.code === 'fail' ? { ok: false, error: 'boom' } : { result: 1 }));
  await api('/job', { code: 'return "secret-in-code"', label: 'Rename layers' });
  await api('/job', { code: 'return 2', label: 'Try it', dryRun: true, file: 'FILE' });
  await api('/job', { code: 'fail', label: 'Breaks' });
  await api('/job', { code: 'return 1', label: 'Nobody home', file: 'OTHERFILEKEY0123456', timeoutMs: 50 });
  const jobs = lines.filter(l => l.startsWith('job '));
  assert.equal(jobs.length, 4, lines.join('\n'));
  assert.match(jobs[0], /^job j\d+-\d+ "Rename layers" file=FILE ok \d+ ms$/);
  assert.match(jobs[1], /^job j\d+-\d+ "Try it" file=FILE dry-run ok \d+ ms$/);
  assert.match(jobs[2], /^job j\d+-\d+ "Breaks" file=FILE failed \d+ ms: boom$/);
  assert.match(jobs[3], /^job j\d+-\d+ "Nobody home" file=OTHERFILEKEY0123456 timeout \d+ ms$/);
  assert.ok(!lines.join('\n').includes('secret-in-code'));
});

test('A09: requests with a wrong token are logged, a burst of them as one line', async () => {
  const lines = [];
  const { api } = await start({ log: (...a) => lines.push(a.join(' ')) });
  // A request without any token is refused but is no news: mcp.mjs asks that way whether a server is there,
  // before every tool call.
  for (let i = 0; i < 3; i++) assert.equal((await api('/status', undefined, {})).status, 401);
  assert.deepEqual(lines.filter(l => /^rejected/.test(l)), []);
  for (let i = 0; i < 20; i++) await api('/job', { code: 'x' }, { 'X-Bridge-Token': 'guess' + i, 'Content-Type': 'application/json' });
  const rejected = lines.filter(l => /^rejected/.test(l));
  assert.equal(rejected.length, 1, lines.join('\n'));
  assert.match(rejected[0], /^rejected: bad token on POST \/job/);
  assert.ok(!rejected[0].includes('guess0'), 'what was tried is not written down');
});

// ---- A10 Mishandling of exceptional conditions (2025) / A04 Insecure design

test('A10: a body that is not JSON, or not an object, is an error answer and the server goes on', async () => {
  const { base, api, H } = await start();
  for (const body of ['{not json', 'null', '[1]', '"text"', '7']) {
    const r = await fetch(base + '/plan', { method: 'POST', headers: H, body });
    assert.equal(r.status, 400, body + ' → ' + r.status);
    assert.match((await r.json()).error, /^bad request: /);
  }
  assert.deepEqual((await api('/plan')).body.tasks, []);
  assert.equal((await api('/status')).status, 200);
});
