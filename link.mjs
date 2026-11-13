// Links a repo's optional .figma-bridge.json into the bridge home: the config becomes projects/<name>/project.json
// and every file it references is copied next to it with the same relative layout.
//   node link.mjs [--force] [dir]      dir (default: the working directory) or the nearest parent with .figma-bridge.json
// mcp.mjs links the repo a Claude Code session starts in without asking, so a repo can only add a project of its
// own or update the one it linked before. It cannot replace a project that came from elsewhere (--force can),
// claim a Figma file another project lists, or pull in files from outside itself.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectsDir } from './paths.mjs';
import { findRepoProject, listProjects } from './project.mjs';

const PATH_KEYS = ['agentPrompt', 'designMd', 'jobsDir'];
// Next to project.json in a linked project: where it was linked from.
const MARKER = '.linked.json';

// repoProject = { name, root, configPath, config } as findRepoProject (project.mjs) returns it.
// readProject has checked the name and the types already.
export function linkProject({ name, root, config }, { force = false } = {}) {
  const paths = [].concat(Array.isArray(config.preludes) ? config.preludes : [], PATH_KEYS.map(k => config[k])).filter(p => p != null);
  const repo = realpathSync(root);
  for (const p of paths) {
    // The copy keeps the relative layout, so nothing may point outside the repo, nor at the repo itself ("", ".").
    if (typeof p !== 'string' || isAbsolute(p) || normalize(p) === '.' || normalize(p).split(sep)[0] === '..') throw new Error('.figma-bridge.json: ' + JSON.stringify(p) + ' must be a path inside ' + root);
    if (!existsSync(join(root, p))) throw new Error('.figma-bridge.json: ' + p + ' not found in ' + root);
    // Nor by way of a link: its target would be copied, or read later as the agent's prompt.
    if (!realpathSync(join(root, p)).startsWith(repo + sep)) throw new Error('.figma-bridge.json: ' + p + ' points outside ' + root);
  }
  const dir = join(projectsDir(), name);
  if (existsSync(join(dir, 'project.json')) && !force) {
    let from = null;
    try { from = JSON.parse(readFileSync(join(dir, MARKER), 'utf8')).source; } catch (e) {}
    const replace = ' (to replace it: node link.mjs --force ' + root + ')';
    if (!from) throw new Error('project ' + JSON.stringify(name) + ' in ' + dir + ' was not linked from a repo' + replace);
    if (from !== repo) throw new Error('project ' + JSON.stringify(name) + ' in ' + dir + ' was linked from ' + from + ', not from ' + repo + replace);
  }
  // The project that lists a file gets its preludes into every job there and its prompt into every comment.
  let others = [];
  try { others = listProjects().filter(p => p.root !== dir); } catch (e) {}
  for (const key of config.files || []) {
    const owner = others.find(p => (p.config.files || []).includes(key));
    if (owner) throw new Error('.figma-bridge.json: file ' + key + ' belongs to project ' + JSON.stringify(owner.name) + ' (' + owner.root + ')');
  }
  mkdirSync(dir, { recursive: true });
  for (const p of paths) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    cpSync(realpathSync(join(root, p)), join(dir, p), { recursive: true, filter: src => !lstatSync(src).isSymbolicLink() });
  }
  writeFileSync(join(dir, 'project.json'), JSON.stringify(config, null, 2) + '\n');
  writeFileSync(join(dir, MARKER), JSON.stringify({ source: repo }) + '\n');
  return { name, dir };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), force = args.includes('--force');
  const start = resolve(args.find(a => a !== '--force') || '.');
  try {
    const found = findRepoProject(start);
    if (!found) { console.error('no .figma-bridge.json in ' + start + ' or above'); process.exit(1); }
    const { name, dir } = linkProject(found, { force });
    console.log('linked ' + name + ' → ' + dir);
  } catch (e) { console.error(e.message); process.exit(1); }
}
