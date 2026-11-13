// Where the bridge keeps its code, runtime data and local projects. Everything else imports this.
//   <home>/app/        installed copy of the runtime files (+ the generated ui.html)
//   <home>/data/       token.txt, figma-token*.txt, out/, events.jsonl, plan.json, seen-comments.json, state.json, logs/, …
//   <home>/projects/   local project material, never in a repo
// The home sits outside ~/Documents, ~/Desktop and ~/Downloads: macOS privacy protection (TCC) denies launchd
// jobs any access there.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const codeDir = dirname(fileURLToPath(import.meta.url));
// install.mjs drops this file into <home>/app, so an installed copy knows its home even when it was installed
// with a custom BRIDGE_HOME and is started without it (Claude Code runs mcp.mjs with its own environment).
export const INSTALL_MARKER = 'install.json';
export const installedHome = () => join(homedir(), 'Library', 'Application Support', 'Claude Figma Bridge');

// BRIDGE_HOME, else the home of this installed copy, else the installed default, else (development, running
// straight from the repo) the repo directory itself. Read on every call: tests switch BRIDGE_HOME at will.
export function bridgeHome() {
  if (process.env.BRIDGE_HOME) return resolve(process.env.BRIDGE_HOME);
  if (existsSync(join(codeDir, INSTALL_MARKER))) return dirname(codeDir);
  return existsSync(installedHome()) ? installedHome() : codeDir;
}
export const appDir = () => { const home = bridgeHome(); return home === codeDir ? codeDir : join(home, 'app'); };
export const dataDir = () => join(bridgeHome(), 'data');
export const projectsDir = () => join(bridgeHome(), 'projects');

// The manifest lets the plugin reach localhost:8765 only; BRIDGE_PORT is for tests.
export const port = () => Number(process.env.BRIDGE_PORT) || 8765;
export const baseUrl = () => 'http://127.0.0.1:' + port();

// The bridge token (created by server.mjs on its first start).
export function readToken() {
  const file = join(dataDir(), 'token.txt');
  if (!existsSync(file)) throw new Error('no ' + file + ': start the bridge server first (node server.mjs)');
  return readFileSync(file, 'utf8').trim();
}
