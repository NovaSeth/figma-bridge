// paths.mjs: where the home, app, data and projects are, and the token.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root } from './harness.mjs';
import { appDir, baseUrl, bridgeHome, dataDir, port, projectsDir, readToken } from '../paths.mjs';

// Real path: macOS tmpdir() is behind a symlink (/var → /private/var) and import.meta.url is not.
const dir = realpathSync(mkdtempSync(join(tmpdir(), 'bridge-paths-')));
after(() => rmSync(dir, { recursive: true, force: true }));
// paths.mjs from `file`, in a child with only HOME set: what does it resolve?
const resolved = (file, env = {}) => JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e',
  `const p = await import(${JSON.stringify(file)}); console.log(JSON.stringify({ home: p.bridgeHome(), app: p.appDir(), data: p.dataDir(), projects: p.projectsDir() }))`],
  { env: { PATH: process.env.PATH, HOME: join(dir, 'user'), ...env }, encoding: 'utf8' }));

test('BRIDGE_HOME wins and is read on every call', () => {
  const saved = process.env.BRIDGE_HOME;
  try {
    process.env.BRIDGE_HOME = join(dir, 'h1');
    assert.deepEqual([bridgeHome(), appDir(), dataDir(), projectsDir()], [join(dir, 'h1'), join(dir, 'h1', 'app'), join(dir, 'h1', 'data'), join(dir, 'h1', 'projects')]);
    process.env.BRIDGE_HOME = join(dir, 'h2');
    assert.equal(dataDir(), join(dir, 'h2', 'data'));
    assert.throws(readToken, /no .*h2\/data\/token\.txt: start the bridge server first/);
    mkdirSync(join(dir, 'h2', 'data'), { recursive: true });
    writeFileSync(join(dir, 'h2', 'data', 'token.txt'), 'abc\n');
    assert.equal(readToken(), 'abc');
  } finally { if (saved === undefined) delete process.env.BRIDGE_HOME; else process.env.BRIDGE_HOME = saved; }
});

test('without BRIDGE_HOME: the repo itself for development, the installed home once it exists', () => {
  assert.deepEqual(resolved(join(root, 'paths.mjs')), { home: root, app: root, data: join(root, 'data'), projects: join(root, 'projects') });
  const installed = join(dir, 'user', 'Library', 'Application Support', 'Claude Figma Bridge');
  mkdirSync(installed, { recursive: true });
  assert.deepEqual(resolved(join(root, 'paths.mjs')), { home: installed, app: join(installed, 'app'), data: join(installed, 'data'), projects: join(installed, 'projects') });
});

test('an installed copy knows its own home, even at a custom place', () => {
  const app = join(dir, 'custom', 'app');
  mkdirSync(app, { recursive: true });
  copyFileSync(join(root, 'paths.mjs'), join(app, 'paths.mjs'));
  writeFileSync(join(app, 'install.json'), '{}');
  assert.equal(resolved(join(app, 'paths.mjs')).home, join(dir, 'custom'));
  assert.equal(resolved(join(app, 'paths.mjs'), { BRIDGE_HOME: join(dir, 'other') }).home, join(dir, 'other'));
});

test('port 8765 unless BRIDGE_PORT says otherwise', () => {
  const saved = process.env.BRIDGE_PORT;
  delete process.env.BRIDGE_PORT;
  assert.equal(port(), 8765);
  process.env.BRIDGE_PORT = '9000';
  assert.equal(baseUrl(), 'http://127.0.0.1:9000');
  if (saved === undefined) delete process.env.BRIDGE_PORT; else process.env.BRIDGE_PORT = saved;
});
