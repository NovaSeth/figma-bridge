// install.mjs and add-token.sh, only ever against a temporary HOME/BRIDGE_HOME with fake `claude`, `launchctl`,
// `pbpaste` and `pbcopy` first on PATH: nothing here may touch the real LaunchAgents, MCP config or bridge home.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root } from './harness.mjs';
import { compare, isRuntimeFile, protectedFolder, LABEL } from '../install.mjs';

const dirs = [];
after(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

// The installer also writes into the checkout it runs from (ui.html next to the manifest Figma imports), so it
// runs from a copy of the checkout here: a test must not replace the plugin window of the real one.
function sandbox() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'bridge-install-'))); // the installer names real paths
  dirs.push(dir);
  const bin = join(dir, 'bin'), home = join(dir, 'home'), log = join(dir, 'calls.log'), checkout = join(dir, 'checkout');
  mkdirSync(bin); mkdirSync(home);
  cpSync(root, checkout, { recursive: true, filter: src => !/\/(\.git|node_modules|test|data|projects|out)$|\/ui\.html$/.test(src) });
  writeFileSync(join(dir, 'fake.cjs'), `require('fs').appendFileSync(process.env.FAKE_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.argv[2] === 'pbpaste') process.stdout.write(process.env.FAKE_CLIPBOARD || '');`);
  for (const name of ['claude', 'launchctl', 'pbpaste', 'pbcopy']) {
    writeFileSync(join(bin, name), `#!/bin/sh\nexec "${process.execPath}" "${join(dir, 'fake.cjs')}" ${name} "$@"\n`);
    chmodSync(join(bin, name), 0o755);
  }
  const env = { PATH: [bin, dirname(process.execPath), '/usr/bin', '/bin'].join(':'), HOME: home, BRIDGE_HOME: join(home, 'bridge'), FAKE_LOG: log };
  const run = (file, args = [], extra = {}) => new Promise(ok => execFile(file === 'add-token.sh' ? '/bin/sh' : process.execPath, [join(checkout, file), ...args],
    { env: { ...env, ...extra } }, (err, stdout, stderr) => ok({ code: err ? err.code : 0, stdout, stderr })));
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []);
  const clearCalls = () => rmSync(log, { force: true });
  return { dir, bin, env, home, checkout, bridge: env.BRIDGE_HOME, app: join(env.BRIDGE_HOME, 'app'), data: join(env.BRIDGE_HOME, 'data'), plist: join(home, 'Library', 'LaunchAgents', LABEL + '.plist'), run, calls, clearCalls };
}

const uid = process.getuid();

test('folders macOS privacy protection (TCC) closes to launchd agents are detected', () => {
  const home = '/home/ann';
  assert.equal(protectedFolder('/home/ann/Documents/projects/figma-bridge', home), '~/Documents');
  assert.equal(protectedFolder('/home/ann/desktop/bridge', home), '~/Desktop'); // APFS is case-insensitive
  assert.equal(protectedFolder('/home/ann/Downloads', home), '~/Downloads');
  assert.equal(protectedFolder('/home/ann/Library/Mobile Documents/com~apple~CloudDocs/b', home), '~/Library/Mobile Documents');
  assert.equal(protectedFolder('/Volumes/USB/bridge', home), '/Volumes');
  assert.equal(protectedFolder('/home/ann/Library/Application Support/Claude Figma Bridge', home), null);
  assert.equal(protectedFolder('/home/ann/DocumentsOld/bridge', home), null);
});

test('only runtime files are installed: no tests, docs, installer, npm scripts or local state', () => {
  for (const p of ['server.mjs', 'code.js', 'manifest.json', 'ui.template.html', 'add-token.sh', 'tools/sheet.mjs', 'tools/package.json']) assert.ok(isRuntimeFile(p), p);
  // package.json only carries dev scripts (test, install) that need files app/ does not have
  for (const p of ['package.json', 'install.mjs', 'test/plugin.test.mjs', 'README.md', 'AGENTS.md', 'token.txt', 'figma-token.txt', 'ui.html', 'events.jsonl', 'plan.json', 'out/x.png', 'data/token.txt', '.gitignore']) assert.ok(!isRuntimeFile(p), p);
});

test('install: runtime copy, data, token, ui.html, LaunchAgent, MCP for all projects, the two manual steps', async () => {
  const s = sandbox();
  const r = await s.run('install.mjs');
  assert.equal(r.code, 0, r.stderr + r.stdout);
  assert.deepEqual(compare(s.app), []);
  for (const f of ['manifest.json', 'code.js', 'server.mjs', 'agent.mjs', 'paths.mjs', 'ui.html', 'install.json']) assert.ok(existsSync(join(s.app, f)), f);
  for (const f of ['test', 'install.mjs', 'README.md', 'package.json']) assert.ok(!existsSync(join(s.app, f)), f);
  const token = readFileSync(join(s.data, 'token.txt'), 'utf8');
  assert.equal(statSync(join(s.data, 'token.txt')).mode & 0o777, 0o600);
  const ui = readFileSync(join(s.app, 'ui.html'), 'utf8');
  assert.ok(ui.includes("TOKEN = '" + token + "'") && ui.includes("'http://localhost:8765'"));
  assert.ok(existsSync(join(s.data, 'logs')) && existsSync(join(s.bridge, 'projects')));

  const plist = readFileSync(s.plist, 'utf8');
  for (const part of ['<key>KeepAlive</key><true/>', '<key>RunAtLoad</key><true/>', `<string>${join(s.app, 'server.mjs')}</string>`,
    `<key>BRIDGE_HOME</key><string>${s.bridge}</string>`, `<key>HOME</key><string>${s.home}</string>`, `<string>${join(s.data, 'logs', 'server.log')}</string>`]) assert.ok(plist.includes(part), part);
  const path = plist.match(/<key>PATH<\/key><string>([^<]*)</)[1].split(':');
  assert.ok(path.includes(dirname(process.execPath)) && path.includes(s.bin), 'node and claude dirs on the agent PATH: ' + path);
  if (existsSync('/usr/bin/plutil')) execFileSync('/usr/bin/plutil', ['-lint', s.plist], { stdio: 'ignore' });

  assert.deepEqual(s.calls().filter(c => c[0] !== 'launchctl'), [
    ['claude', 'mcp', 'remove', '--scope', 'user', 'figma-bridge'],
    ['claude', 'mcp', 'add', '--scope', 'user', 'figma-bridge', '--', 'node', join(s.app, 'mcp.mjs')],
  ]);
  assert.deepEqual(s.calls().filter(c => c[0] === 'launchctl'), [['launchctl', 'bootout', `gui/${uid}/${LABEL}`], ['launchctl', 'bootstrap', `gui/${uid}`, s.plist]]);
  // The plugin is imported from the project folder: its manifest is the one named, and the window next to it is
  // the same as the installed one, private like it.
  assert.ok(r.stdout.includes('Import plugin from manifest… → ' + join(s.checkout, 'manifest.json')), r.stdout);
  assert.equal(readFileSync(join(s.checkout, 'ui.html'), 'utf8'), ui);
  assert.equal(statSync(join(s.checkout, 'ui.html')).mode & 0o777, 0o600);
  assert.match(r.stdout, /file_comments:read, file_comments:write/);
  assert.ok(r.stdout.includes(join(s.app, 'add-token.sh')));
});

test('install is idempotent: same token and plist, stale app files removed, MCP entry replaced', async () => {
  const s = sandbox();
  assert.equal((await s.run('install.mjs')).code, 0);
  const token = readFileSync(join(s.data, 'token.txt'), 'utf8'), plist = readFileSync(s.plist, 'utf8'), files = readdirSync(s.app).sort();
  writeFileSync(join(s.app, 'auto-agent.mjs'), 'stale');
  writeFileSync(join(s.data, 'figma-token.txt'), 'figd_x');
  s.clearCalls();
  const r = await s.run('install.mjs');
  assert.equal(r.code, 0, r.stderr);
  assert.equal(readFileSync(join(s.data, 'token.txt'), 'utf8'), token);
  assert.equal(readFileSync(s.plist, 'utf8'), plist);
  assert.deepEqual(readdirSync(s.app).sort(), files);
  assert.deepEqual(s.calls().filter(c => c[0] === 'claude').map(c => c[2]), ['remove', 'add']);
  assert.match(r.stdout, /Token Figmy już jest/);
});

test('--verify reports drift; --uninstall keeps data, --purge drops it, projects always stay', async () => {
  const s = sandbox();
  assert.equal((await s.run('install.mjs')).code, 0);
  assert.equal((await s.run('install.mjs', ['--verify'])).code, 0);
  writeFileSync(join(s.app, 'code.js'), '// edited');
  const drift = await s.run('install.mjs', ['--verify']);
  assert.equal(drift.code, 1);
  assert.match(drift.stdout, /changed +code\.js/);
  // The plugin window in the checkout is part of what must match: Figma loads that one.
  assert.equal((await s.run('install.mjs')).code, 0);
  assert.equal((await s.run('install.mjs', ['--verify'])).code, 0);
  rmSync(join(s.checkout, 'ui.html'));
  const gone = await s.run('install.mjs', ['--verify']);
  assert.deepEqual([gone.code, /missing +ui\.html \(w repo/.test(gone.stdout)], [1, true], gone.stdout);
  writeFileSync(join(s.checkout, 'ui.html'), 'an old window');
  assert.match((await s.run('install.mjs', ['--verify'])).stdout, /changed +ui\.html \(w repo/);
  assert.equal((await s.run('install.mjs')).code, 0);
  assert.equal((await s.run('install.mjs', ['--verify'])).code, 0);

  mkdirSync(join(s.bridge, 'projects', 'demo'), { recursive: true });
  writeFileSync(join(s.bridge, 'projects', 'demo', 'project.json'), '{"name":"demo"}');
  s.clearCalls();
  assert.equal((await s.run('install.mjs', ['--uninstall'])).code, 0);
  assert.ok(!existsSync(s.plist) && !existsSync(s.app));
  assert.ok(!existsSync(join(s.checkout, 'ui.html')), 'the window in the checkout holds the bridge token: it goes too');
  assert.ok(existsSync(join(s.data, 'token.txt')));
  assert.deepEqual(s.calls().find(c => c[0] === 'claude'), ['claude', 'mcp', 'remove', '--scope', 'user', 'figma-bridge']);
  assert.ok(s.calls().some(c => c[0] === 'launchctl' && c[1] === 'bootout'));
  assert.equal((await s.run('install.mjs', ['--purge'])).code, 0);
  assert.ok(!existsSync(s.data));
  assert.ok(existsSync(join(s.bridge, 'projects', 'demo', 'project.json')));
});

test('a home under ~/Documents is refused before anything is written', async () => {
  const s = sandbox();
  const inside = join(s.home, 'Documents', 'bridge');
  const r = await s.run('install.mjs', [], { BRIDGE_HOME: inside });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /~\/Documents/);
  assert.ok(!existsSync(inside) && !existsSync(s.plist));
  assert.deepEqual(s.calls(), []);
});

test('an npm install lifecycle hook installs nothing; npm run setup does', async () => {
  const s = sandbox();
  for (const hookName of ['preinstall', 'install', 'postinstall']) {
    const hook = await s.run('install.mjs', [], { npm_lifecycle_event: hookName, npm_command: 'install' });
    assert.equal(hook.code, 0, hook.stderr);
    assert.match(hook.stdout, /npm run setup/);
  }
  assert.ok(!existsSync(s.bridge) && !existsSync(s.plist));
  assert.deepEqual(s.calls(), []);
  const asked = await s.run('install.mjs', [], { npm_lifecycle_event: 'setup', npm_command: 'run-script' });
  assert.equal(asked.code, 0, asked.stderr);
  assert.ok(existsSync(s.plist));
});

test('add-token.sh saves the clipboard token to data/ privately, never prints it, and clears the clipboard', async () => {
  const s = sandbox();
  const r = await s.run('add-token.sh', [], { FAKE_CLIPBOARD: ' figd_secret\n' });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const file = join(s.data, 'figma-token.txt');
  assert.equal(readFileSync(file, 'utf8'), 'figd_secret');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.ok(!r.stdout.includes('figd_secret'));
  assert.ok(s.calls().some(c => c[0] === 'pbcopy'));
  // A second account gets a file of its own; the name cannot leave data/.
  assert.equal((await s.run('add-token.sh', ['work'], { FAKE_CLIPBOARD: 'figd_other' })).code, 0);
  assert.equal(readFileSync(join(s.data, 'figma-token-work.txt'), 'utf8'), 'figd_other');
  assert.equal(readFileSync(file, 'utf8'), 'figd_secret');
  assert.equal((await s.run('add-token.sh', ['../x'], { FAKE_CLIPBOARD: 'figd_other' })).code, 1);
  const wrong = await s.run('add-token.sh', [], { FAKE_CLIPBOARD: 'hello' });
  assert.equal(wrong.code, 1);
  assert.match(wrong.stdout, /file_comments|File comments/);
});

test('install says so when Figma has the plugin imported from another copy than this checkout: Figma would keep running that copy', async () => {
  const s = sandbox();
  const figma = join(s.home, 'Library', 'Application Support', 'Figma');
  mkdirSync(figma, { recursive: true });
  const settings = entries => writeFileSync(join(figma, 'settings.json'), JSON.stringify({ localFileExtensions: entries }));
  // As Figma keeps them: the manifest of a checkout, another plugin, and stray files that were once picked.
  mkdirSync(join(s.dir, 'other'), { recursive: true });
  writeFileSync(join(s.dir, 'other', 'manifest.json'), JSON.stringify({ name: 'Something else', id: 'another-plugin' }));
  // An older clone of the bridge somewhere else on the disk.
  mkdirSync(join(s.dir, 'old-clone'));
  writeFileSync(join(s.dir, 'old-clone', 'manifest.json'), readFileSync(join(root, 'manifest.json')));
  settings([{ id: 3, manifestPath: join(s.dir, 'old-clone', 'manifest.json'), lastKnownName: 'Claude Bridge (localhost)' }, { id: 2, manifestPath: join(s.dir, 'other', 'manifest.json') },
    { id: 4, manifestPath: join(s.checkout, 'code.js') }, { id: 5, manifestPath: join(s.dir, 'gone', 'manifest.json') }]);
  const elsewhere = await s.run('install.mjs');
  assert.equal(elsewhere.code, 0, elsewhere.stderr);
  assert.ok(elsewhere.stdout.includes('Figma ma tę wtyczkę zaimportowaną z ' + join(s.dir, 'old-clone', 'manifest.json')), elsewhere.stdout);
  assert.doesNotMatch(elsewhere.stdout, /other\/manifest\.json|gone\/manifest\.json/);
  // Imported from this checkout, as the README says, or from the installed copy: nothing to warn about, and the
  // installer says the import is done. A settings file that cannot be read is no error.
  settings([{ id: 6, manifestPath: join(s.checkout, 'manifest.json') }]);
  const here = await s.run('install.mjs');
  assert.doesNotMatch(here.stdout, /Figma ma tę wtyczkę zaimportowaną z/);
  assert.ok(here.stdout.includes('Wtyczka jest już zaimportowana w Figmie z ' + join(s.checkout, 'manifest.json')), here.stdout);
  settings([{ id: 7, manifestPath: join(s.app, 'manifest.json') }]);
  assert.doesNotMatch((await s.run('install.mjs')).stdout, /Figma ma tę wtyczkę zaimportowaną z/);
  // The same checkout under another name (a link, /var for /private/var) is still this checkout.
  symlinkSync(s.checkout, join(s.dir, 'alias'));
  settings([{ id: 8, manifestPath: join(s.dir, 'alias', 'manifest.json') }]);
  assert.doesNotMatch((await s.run('install.mjs')).stdout, /Figma ma tę wtyczkę zaimportowaną z/);
  writeFileSync(join(figma, 'settings.json'), '{ broken');
  const broken = await s.run('install.mjs');
  assert.equal(broken.code, 0, broken.stderr);
  assert.doesNotMatch(broken.stdout, /Figma ma tę wtyczkę zaimportowaną z/);
});
