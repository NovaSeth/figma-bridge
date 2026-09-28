// link.mjs: a repo's optional .figma-bridge.json and its files become projects/<name>/ in the bridge home.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root } from './harness.mjs';
import { linkProject } from '../link.mjs';
import { findRepoProject, projectByName, projectFiles, projectForFile } from '../project.mjs';

let dir, repo, home, saved;
const write = (path, content) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); };
const config = { name: 'demo', files: ['KEY1'], preludes: ['bridge/_helpers.js'], agentPrompt: 'bridge/prompt.md', designMd: 'bridge/design.json', jobsDir: 'bridge/jobs' };
before(() => {
  saved = process.env.BRIDGE_HOME;
  dir = mkdtempSync(join(tmpdir(), 'bridge-link-'));
  repo = join(dir, 'repo');
  home = process.env.BRIDGE_HOME = join(dir, 'home');
  write(join(repo, '.figma-bridge.json'), JSON.stringify(config));
  write(join(repo, 'bridge', '_helpers.js'), 'const helper = 1;');
  write(join(repo, 'bridge', 'prompt.md'), 'Do {{text}}');
  write(join(repo, 'bridge', 'design.json'), '{}');
  write(join(repo, 'bridge', 'jobs', 'a.js'), 'return 1');
  write(join(repo, 'bridge', 'jobs', 'nested', 'b.js'), 'return 2');
  write(join(repo, 'src', 'app.js'), 'not referenced');
});
after(() => {
  if (saved === undefined) delete process.env.BRIDGE_HOME; else process.env.BRIDGE_HOME = saved;
  rmSync(dir, { recursive: true, force: true });
});

test('the config and every file it names are copied with their layout; nothing else', () => {
  const { name, dir: target } = linkProject(findRepoProject(join(repo, 'src')));
  assert.deepEqual({ name, target }, { name: 'demo', target: join(home, 'projects', 'demo') });
  assert.deepEqual(JSON.parse(readFileSync(join(target, 'project.json'), 'utf8')), config);
  assert.equal(readFileSync(join(target, 'bridge', 'jobs', 'nested', 'b.js'), 'utf8'), 'return 2');
  assert.throws(() => readFileSync(join(target, 'src', 'app.js')));
  // The linked copy is a working project.
  assert.equal(projectForFile('KEY1').root, target);
  assert.equal(projectFiles(projectByName('demo')).agentPrompt, join(target, 'bridge', 'prompt.md'));
});

test('linking again updates changed files', () => {
  write(join(repo, 'bridge', 'prompt.md'), 'Changed {{text}}');
  linkProject(findRepoProject(repo));
  assert.equal(readFileSync(join(home, 'projects', 'demo', 'bridge', 'prompt.md'), 'utf8'), 'Changed {{text}}');
});

test('paths outside the repo and missing files are refused', () => {
  const p = findRepoProject(repo);
  assert.throws(() => linkProject({ ...p, config: { ...config, agentPrompt: '../secret.md' } }), /"\.\.\/secret\.md" must be a path inside/);
  assert.throws(() => linkProject({ ...p, config: { ...config, preludes: ['/etc/hosts'] } }), /must be a path inside/);
  assert.throws(() => linkProject({ ...p, config: { ...config, designMd: 'bridge/nope.json' } }), /bridge\/nope\.json not found/);
  // The repo itself would copy everything, .git included.
  assert.throws(() => linkProject({ ...p, config: { ...config, jobsDir: '.' } }), /"\." must be a path inside/);
  assert.throws(() => linkProject({ ...p, config: { ...config, preludes: ['bridge/..'] } }), /must be a path inside/);
  assert.throws(() => linkProject({ ...p, config: { ...config, jobsDir: '' } }), /must be a path inside/);
});

test('CLI: node link.mjs [dir]', async () => {
  const run = cwdArg => new Promise(ok => execFile(process.execPath, [join(root, 'link.mjs'), cwdArg], { env: { ...process.env, BRIDGE_HOME: home } },
    (err, stdout, stderr) => ok({ code: err ? err.code : 0, stdout, stderr })));
  const linked = await run(join(repo, 'bridge'));
  assert.equal(linked.code, 0, linked.stderr);
  assert.equal(linked.stdout.trim(), 'linked demo → ' + join(home, 'projects', 'demo'));
  const none = await run(dir);
  assert.equal(none.code, 1);
  assert.match(none.stderr, /no \.figma-bridge\.json in .* or above/);
});
