// Installs the bridge for this user (macOS): runtime copy in <home>/app, data in <home>/data, a LaunchAgent that
// keeps server.mjs running, and the figma-bridge MCP server registered in Claude Code for all projects.
//   node install.mjs               install or update (idempotent)
//   node install.mjs --verify      does <home>/app match this repo?
//   node install.mjs --uninstall   LaunchAgent, MCP entry and app/ go; data/ and projects/ stay
//   node install.mjs --purge       --uninstall and data/ too (projects/ always stays: it is the user's material)
// <home> = BRIDGE_HOME or ~/Library/Application Support/Claude Figma Bridge.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, rmdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { delimiter, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTALL_MARKER, installedHome } from './paths.mjs';
import { ensureToken, writeUi } from './server.mjs';

const repo = dirname(fileURLToPath(import.meta.url));
export const LABEL = 'local.claude-figma-bridge';
const LEGACY_LABELS = [LABEL + '.server', LABEL + '.auto-agent']; // launchd/install.mjs of the first version
const PORT = 8765; // the manifest allows localhost:8765 only

// Runtime files only: no tests, docs, dev scripts or the local files a development checkout keeps. Not package.json
// either: nothing in app/ needs it, and its scripts (test, install) name files app/ does not have.
export const isRuntimeFile = path => /^(?:[\w.-]+\.(?:mjs|js)|manifest\.json|ui\.template\.html|add-token\.sh|tools\/.+)$/.test(path) && path !== 'install.mjs';
const walk = (dir, base = dir) => readdirSync(dir, { withFileTypes: true }).flatMap(d => {
  const path = join(dir, d.name);
  return d.isDirectory() ? (d.name.startsWith('.') || d.name === 'node_modules' ? [] : walk(path, base)) : [relative(base, path).split(sep).join('/')];
});
// Only the top level and tools/ are looked at: a development checkout keeps private runtime state (out/, data/) too.
export const runtimeFiles = (dir = repo) => readdirSync(dir, { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name)
  .concat(existsSync(join(dir, 'tools')) ? walk(join(dir, 'tools'), dir) : []).filter(isRuntimeFile).sort();
const GENERATED = new Set(['ui.html', INSTALL_MARKER]);

// macOS privacy protection (TCC) answers "Operation not permitted" when a launchd job touches these, even for
// the user's own files; a terminal gets asked for consent, a background job never does.
const PROTECTED = ['Desktop', 'Documents', 'Downloads', 'Library/Mobile Documents', 'Library/CloudStorage'];
export const protectedFolder = (dir, home = homedir()) => {
  const path = dir.toLowerCase() + '/';
  const hit = PROTECTED.find(p => path.startsWith((home + '/' + p).toLowerCase() + '/'));
  return hit ? '~/' + hit : path.startsWith('/volumes/') ? '/Volumes' : null;
};

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const plist = ({ node, app, home, path, logs, user = homedir() }) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>${xml(node)}</string><string>${xml(join(app, 'server.mjs'))}</string></array>
  <key>WorkingDirectory</key><string>${xml(app)}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${xml(path)}</string><key>HOME</key><string>${xml(user)}</string><key>BRIDGE_HOME</key><string>${xml(home)}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(join(logs, 'server.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(join(logs, 'server.err'))}</string>
</dict>
</plist>
`;

const which = name => (process.env.PATH || '').split(delimiter).filter(Boolean).map(d => join(d, name)).find(p => { try { return statSync(p).isFile(); } catch (e) { return false; } }) || null;
// A PATH entry such as /opt/homebrew/bin/node survives Node upgrades; the versioned execPath does not.
const nodeBinary = () => {
  const real = realpathSync(process.execPath);
  const found = (process.env.PATH || '').split(delimiter).filter(Boolean).map(d => join(d, 'node')).find(p => { try { return realpathSync(p) === real; } catch (e) { return false; } });
  return found || process.execPath;
};
const run = (cmd, args) => { try { execFileSync(cmd, args, { stdio: 'ignore' }); return true; } catch (e) { return false; } };
const same = (a, b) => existsSync(b) && readFileSync(a).equals(readFileSync(b));

// Differences between the repo's runtime files and app/: [{ path, problem: 'missing'|'changed'|'extra' }].
export function compare(app, source = repo) {
  const want = runtimeFiles(source), have = existsSync(app) ? walk(app).filter(p => !GENERATED.has(p)) : [];
  return want.filter(p => !same(join(source, p), join(app, p))).map(p => ({ path: p, problem: existsSync(join(app, p)) ? 'changed' : 'missing' }))
    .concat(have.filter(p => !want.includes(p)).map(p => ({ path: p, problem: 'extra' })));
}

async function main(argv) {
  // Never as a side effect of `npm install` (a lifecycle script named "install" would run on every install).
  if (['preinstall', 'install', 'postinstall'].includes(process.env.npm_lifecycle_event)) {
    console.log('npm install nie instaluje mostu. Instalacja: npm run setup (albo node install.mjs).');
    return;
  }
  const has = flag => argv.includes(flag);
  const home = process.env.BRIDGE_HOME ? resolve(process.env.BRIDGE_HOME) : installedHome();
  const app = join(home, 'app'), data = join(home, 'data'), logs = join(data, 'logs');
  const agents = join(homedir(), 'Library', 'LaunchAgents'), plistFile = join(agents, LABEL + '.plist');
  const uid = process.getuid ? process.getuid() : 0, mac = process.platform === 'darwin';
  const bootout = label => mac && run('launchctl', ['bootout', `gui/${uid}/${label}`]);
  const claude = which('claude');

  if (has('--verify')) {
    const diff = compare(app);
    if (!diff.length) { console.log('app/ zgodne z repo (' + runtimeFiles().length + ' plików): ' + app); return; }
    diff.forEach(d => console.log(d.problem.padEnd(8) + d.path));
    console.log('app/ różni się od repo: node install.mjs aktualizuje.');
    process.exit(1);
  }

  if (has('--uninstall') || has('--purge')) {
    for (const label of [LABEL, ...LEGACY_LABELS]) { bootout(label); const f = join(agents, label + '.plist'); if (existsSync(f)) unlinkSync(f); }
    if (claude) run(claude, ['mcp', 'remove', '--scope', 'user', 'figma-bridge']);
    rmSync(app, { recursive: true, force: true });
    if (has('--purge')) rmSync(data, { recursive: true, force: true });
    try { rmdirSync(home); } catch (e) {} // only when nothing (no projects/) is left
    console.log('Odinstalowano: LaunchAgent, wpis MCP figma-bridge i app/.' + (has('--purge') ? ' Usunięto też data/.' : ' data/ zostaje (--purge usuwa).') + (existsSync(join(home, 'projects')) ? ' projects/ zostaje.' : ''));
    return;
  }

  const folder = protectedFolder(home);
  if (folder) {
    console.error(`Katalog mostu leży w ${folder} (${home}).
macOS (TCC) nie daje zadaniom launchd dostępu do ~/Documents, ~/Desktop, ~/Downloads, iCloud Drive, folderów
chmurowych ani dysków zewnętrznych. Ustaw BRIDGE_HOME poza nimi albo pomiń go (domyślnie ${installedHome()}).`);
    process.exit(1);
  }
  if (repo === app || repo.startsWith(app + sep)) { console.error('Uruchom instalator z repozytorium, nie z ' + app + '.'); process.exit(1); }

  // 1. Runtime copy: changed files replaced, files the repo no longer has removed.
  mkdirSync(app, { recursive: true });
  for (const p of runtimeFiles()) { if (same(join(repo, p), join(app, p))) continue; mkdirSync(dirname(join(app, p)), { recursive: true }); copyFileSync(join(repo, p), join(app, p)); }
  for (const d of compare(app).filter(d => d.problem === 'extra')) unlinkSync(join(app, d.path));
  writeFileSync(join(app, INSTALL_MARKER), JSON.stringify({ source: repo }) + '\n');

  // 2. Data, token, the plugin window.
  for (const d of [data, logs, join(home, 'projects')]) mkdirSync(d, { recursive: true });
  writeUi(ensureToken(data), PORT, app, app);

  // 3. LaunchAgent: node and claude must be on its PATH, and claude needs HOME for its settings and login.
  const node = nodeBinary();
  const path = [...new Set([dirname(node), claude && dirname(claude), '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'].filter(Boolean))].join(delimiter);
  const plistXml = plist({ node, app, home, path, logs });
  if (mac) {
    mkdirSync(agents, { recursive: true });
    for (const label of LEGACY_LABELS) { const f = join(agents, label + '.plist'); if (existsSync(f)) { bootout(label); unlinkSync(f); } }
    writeFileSync(plistFile, plistXml);
    bootout(LABEL); // a reinstall restarts the server on the new code
    // bootout finishes asynchronously; an immediate bootstrap of the same label can fail with "Input/output error"
    let ok = false;
    for (let i = 0; i < 6 && !(ok = run('launchctl', ['bootstrap', `gui/${uid}`, plistFile])); i++) await new Promise(r => setTimeout(r, 500));
    console.log(ok ? 'LaunchAgent działa: ' + plistFile : 'launchctl bootstrap nie przyjął ' + plistFile + ' (logi: ' + logs + ')');
  } else console.log('To nie macOS: bez LaunchAgenta, serwer uruchom sam (node ' + join(app, 'server.mjs') + ').');

  // 4. MCP for every project of this user; an old entry (another path) is replaced.
  const mcpArgs = ['mcp', 'add', '--scope', 'user', 'figma-bridge', '--', 'node', join(app, 'mcp.mjs')];
  if (claude) {
    run(claude, ['mcp', 'remove', '--scope', 'user', 'figma-bridge']);
    console.log(run(claude, mcpArgs) ? 'MCP figma-bridge zarejestrowany (wszystkie projekty).' : 'claude mcp add nie zadziałał: claude ' + mcpArgs.join(' '));
  } else console.log('Nie ma claude w PATH. Zarejestruj MCP sam: claude ' + mcpArgs.join(' '));

  const token = existsSync(join(data, 'figma-token.txt'));
  console.log(`
Gotowe (${home}). Kroki ręczne:
1. Figma desktop → Plugins → Development → Import plugin from manifest… → ${join(app, 'manifest.json')}
2. ${token ? 'Token Figmy już jest. Nowy: ' : ''}utwórz w Figmie token osobisty z zakresem File comments: read i write (file_comments:read, file_comments:write), skopiuj go i uruchom: sh "${join(app, 'add-token.sh')}"`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
