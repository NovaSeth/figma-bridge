// Project model: local projects under <BRIDGE_HOME>/projects, the optional repo file, prelude order.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPrelude, findRepoProject, listProjects, projectByName, projectFiles, projectForFile, selectProject, PRELUDE_SEPARATOR } from '../project.mjs';
import { builtInPrelude } from './harness.mjs';

let home, saved;
const write = (path, content) => { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content)); };

before(() => {
  saved = process.env.BRIDGE_HOME;
  home = mkdtempSync(join(tmpdir(), 'bridge-project-'));
  process.env.BRIDGE_HOME = home;
  const alpha = join(home, 'projects', 'alpha');
  write(join(alpha, 'project.json'), { name: 'alpha', files: ['KEY_A', 'KEY_B'], preludes: ['jobs/_one.js', 'jobs/_two.js'], agentPrompt: 'prompt.md', jobsDir: 'jobs' });
  write(join(alpha, 'jobs', '_one.js'), 'const one = 1;');
  write(join(alpha, 'jobs', '_two.js'), 'const two = 2;');
  write(join(alpha, 'prompt.md'), 'Hi {{text}}');
  // folder name differs from the project name
  write(join(home, 'projects', 'folder-b', 'project.json'), { name: 'beta', files: ['KEY_C'] });
  write(join(home, 'projects', 'no-config', 'readme.txt'), 'not a project');
});
after(() => {
  if (saved === undefined) delete process.env.BRIDGE_HOME; else process.env.BRIDGE_HOME = saved;
  rmSync(home, { recursive: true, force: true });
});

test('projects are found by name (folder or project name) and by a Figma file key', () => {
  assert.deepEqual(listProjects().map(p => p.name).sort(), ['alpha', 'beta']);
  const alpha = projectByName('alpha');
  assert.equal(alpha.root, join(home, 'projects', 'alpha'));
  assert.equal(alpha.configPath, join(home, 'projects', 'alpha', 'project.json'));
  assert.deepEqual(alpha.config.files, ['KEY_A', 'KEY_B']);
  assert.equal(projectByName('beta').root, join(home, 'projects', 'folder-b'));
  assert.equal(projectByName('gamma'), null);
  assert.equal(projectByName('../alpha'), null);
  assert.equal(projectForFile('KEY_B').name, 'alpha');
  assert.equal(projectForFile('KEY_C').name, 'beta');
  assert.equal(projectForFile('KEY_X'), null);
  assert.equal(projectForFile(null), null);
});

test('selectProject: an explicit name wins over the file; an unknown name lists the projects', () => {
  assert.equal(selectProject({ name: 'beta', fileKey: 'KEY_A' }).name, 'beta');
  assert.equal(selectProject({ fileKey: 'KEY_A' }).name, 'alpha');
  assert.equal(selectProject({ fileKey: 'nope' }), null);
  assert.throws(() => selectProject({ name: 'gamma' }), /no project "gamma" \(projects: alpha, beta in /);
});

test('projectFiles gives absolute paths and names the key of a missing file', () => {
  const files = projectFiles(projectByName('alpha'));
  const root = join(home, 'projects', 'alpha');
  assert.deepEqual(files, { preludes: [join(root, 'jobs/_one.js'), join(root, 'jobs/_two.js')], agentPrompt: join(root, 'prompt.md'), designMd: null, jobsDir: join(root, 'jobs') });
  assert.deepEqual(projectFiles(projectByName('beta')), { preludes: [], agentPrompt: null, designMd: null, jobsDir: null });
  const broken = { name: 'x', root, configPath: join(root, 'project.json'), config: { name: 'x', designMd: 'design.json' } };
  assert.throws(() => projectFiles(broken), /project\.json: "designMd" names a missing file: .*design\.json/);
});

test('a broken project.json is an error naming the file', () => {
  const dir = join(home, 'projects', 'broken');
  write(join(dir, 'project.json'), '{');
  assert.throws(() => projectByName('broken'), /broken\/project\.json: invalid JSON/);
  write(join(dir, 'project.json'), { name: 'broken', files: 'KEY' });
  assert.throws(() => projectByName('broken'), /"files" must be an array of strings/);
  write(join(dir, 'project.json'), { files: [] });
  assert.throws(() => projectForFile('KEY_A'), /"name" must be a folder name/);
  rmSync(dir, { recursive: true });
});

test('findRepoProject walks up from a directory to the nearest .figma-bridge.json', () => {
  const repo = join(home, 'repo');
  write(join(repo, '.figma-bridge.json'), { name: 'repo-project', preludes: ['design/prelude.js'] });
  write(join(repo, 'design', 'prelude.js'), 'const repo = 1;');
  mkdirSync(join(repo, 'src', 'deep'), { recursive: true });
  const found = findRepoProject(join(repo, 'src', 'deep'));
  assert.equal(found.name, 'repo-project');
  assert.equal(found.root, repo);
  assert.deepEqual(projectFiles(found).preludes, [join(repo, 'design', 'prelude.js')]);
  assert.equal(findRepoProject(join(home, 'projects')), null);
});

test('buildPrelude: prelude.js, then the project preludes, then extra files, one scope each', () => {
  const extra = join(home, 'extra.js');
  write(extra, 'const extra = 3;');
  assert.equal(buildPrelude(), builtInPrelude());
  assert.equal(buildPrelude({ project: projectByName('alpha'), extra: [extra] }),
    [builtInPrelude(), 'const one = 1;', 'const two = 2;', 'const extra = 3;'].join(PRELUDE_SEPARATOR));
  assert.throws(() => buildPrelude({ extra: [join(home, 'nope.js')] }), /prelude file not found: .*nope\.js/);
});
