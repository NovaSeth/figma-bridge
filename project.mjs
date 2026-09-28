// Projects: one project's local material (preludes, agent prompt, design-md config, jobs) lives in the runtime
// home under projects/<name>/project.json, never in the plugin repo. A repo may carry an optional
// .figma-bridge.json with the same keys (found by walking up from a directory); link.mjs copies it into the home.
// project = { name, root, configPath, config }; paths inside config are relative to root.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { codeDir, projectsDir } from './paths.mjs';

export const PROJECT_FILE = 'project.json';
export const REPO_FILE = '.figma-bridge.json';
// code.js splits the prelude on this marker (keep both copies equal).
export const PRELUDE_SEPARATOR = '\n/*@bridge:prelude-scope*/\n';

// The name becomes a folder under projects/, so it may not climb out of it.
const safeName = name => typeof name === 'string' && /^[^./\\\0][^/\\\0]*$/.test(name);

// A broken file is an error naming it, never a silent "no project".
export function readProject(configPath) {
  let config;
  try { config = JSON.parse(readFileSync(configPath, 'utf8')); }
  catch (e) { throw new Error(configPath + ': ' + (e.code === 'ENOENT' ? 'not found' : 'invalid JSON (' + e.message + ')')); }
  const bad = what => { throw new Error(configPath + ': ' + what); };
  if (!config || typeof config !== 'object' || Array.isArray(config)) bad('expected a JSON object');
  if (!safeName(config.name)) bad('"name" must be a folder name (no slashes, not starting with a dot)');
  for (const key of ['files', 'preludes']) {
    if (config[key] != null && (!Array.isArray(config[key]) || config[key].some(v => typeof v !== 'string'))) bad('"' + key + '" must be an array of strings');
  }
  for (const key of ['agentPrompt', 'designMd', 'jobsDir']) if (config[key] != null && typeof config[key] !== 'string') bad('"' + key + '" must be a path or null');
  return { name: config.name, root: dirname(configPath), configPath, config };
}

export function listProjects() {
  const dir = projectsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(join(dir, d.name, PROJECT_FILE)))
    .map(d => readProject(join(dir, d.name, PROJECT_FILE)));
}

// The folder of that name, else a project whose project.json carries the name.
export function projectByName(name) {
  if (!safeName(name)) return null;
  const file = join(projectsDir(), name, PROJECT_FILE);
  return existsSync(file) ? readProject(file) : listProjects().find(p => p.name === name) || null;
}

export const projectForFile = fileKey => (fileKey ? listProjects().find(p => (p.config.files || []).includes(fileKey)) || null : null);

export function findRepoProject(startDir = process.cwd()) {
  for (let dir = resolve(startDir); ; dir = dirname(dir)) {
    if (existsSync(join(dir, REPO_FILE))) return readProject(join(dir, REPO_FILE));
    if (dirname(dir) === dir) return null;
  }
}

// Absolute paths; a key naming a missing file stops here, not halfway through a job.
export function projectFiles(project) {
  const { root, config, configPath } = project;
  const path = (key, rel) => {
    const abs = resolve(root, rel);
    if (!existsSync(abs)) throw new Error(configPath + ': "' + key + '" names a missing file: ' + abs);
    return abs;
  };
  const optional = key => (config[key] ? path(key, config[key]) : null);
  return { preludes: (config.preludes || []).map(p => path('preludes', p)), agentPrompt: optional('agentPrompt'), designMd: optional('designMd'), jobsDir: optional('jobsDir') };
}

// Explicit name (unknown → error listing the projects), else the project listing the Figma file, else null.
export function selectProject({ name = null, fileKey = null } = {}) {
  if (!name) return projectForFile(fileKey);
  const project = projectByName(name);
  if (!project) throw new Error('no project ' + JSON.stringify(name) + ' (projects: ' + (listProjects().map(p => p.name).join(', ') || 'none') + ' in ' + projectsDir() + ')');
  return project;
}

// prelude.js next to this file, then the project's preludes, then extra files: code.js gives each its own
// scope around the job, so later files and the job may redeclare earlier names.
export function buildPrelude({ project = null, extra = [] } = {}) {
  const files = [join(codeDir, 'prelude.js')].concat(project ? projectFiles(project).preludes : [], extra);
  return files.map(f => {
    if (!existsSync(f)) throw new Error('prelude file not found: ' + f);
    return readFileSync(f, 'utf8');
  }).join(PRELUDE_SEPARATOR);
}
