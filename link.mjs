// Links a repo's optional .figma-bridge.json into the bridge home: the config becomes projects/<name>/project.json
// and every file it references is copied next to it with the same relative layout.
//   node link.mjs [dir]      dir (default: the working directory) or the nearest parent with .figma-bridge.json
import { cpSync, existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectsDir } from './paths.mjs';
import { findRepoProject } from './project.mjs';

const PATH_KEYS = ['agentPrompt', 'designMd', 'jobsDir'];

// repoProject = { name, root, configPath, config } as findRepoProject (project.mjs) returns it.
// readProject has checked the name and the types already.
export function linkProject({ name, root, config }) {
  const paths = [].concat(Array.isArray(config.preludes) ? config.preludes : [], PATH_KEYS.map(k => config[k])).filter(p => p != null);
  for (const p of paths) {
    // The copy keeps the relative layout, so nothing may point outside the repo, nor at the repo itself ("", ".").
    if (typeof p !== 'string' || isAbsolute(p) || normalize(p) === '.' || normalize(p).split(sep)[0] === '..') throw new Error('.figma-bridge.json: ' + JSON.stringify(p) + ' must be a path inside ' + root);
    if (!existsSync(join(root, p))) throw new Error('.figma-bridge.json: ' + p + ' not found in ' + root);
  }
  const dir = join(projectsDir(), name);
  mkdirSync(dir, { recursive: true });
  for (const p of paths) { mkdirSync(dirname(join(dir, p)), { recursive: true }); cpSync(join(root, p), join(dir, p), { recursive: true }); }
  writeFileSync(join(dir, 'project.json'), JSON.stringify(config, null, 2) + '\n');
  return { name, dir };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const start = resolve(process.argv[2] || '.');
  try {
    const found = findRepoProject(start);
    if (!found) { console.error('no .figma-bridge.json in ' + start + ' or above'); process.exit(1); }
    const { name, dir } = linkProject(found);
    console.log('linked ' + name + ' → ' + dir);
  } catch (e) { console.error(e.message); process.exit(1); }
}
