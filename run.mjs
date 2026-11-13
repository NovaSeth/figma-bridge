// node run.mjs <script.js> [timeoutMs] [--step "plan text"] [--dry-run] [--project name] [--prelude file]... [--no-prelude] [--file key]
// node run.mjs --status
// Polish aliases: --krok = --step, --na-sucho = --dry-run.
//
// --file (or FIGMA_FILE): the job, its plan step and its project belong to that Figma file: a file key, or a part
// of the name of a file the plugin is open in. Without it the job goes to the window the plugin was opened in last.
//
// --step ties the job to a plan entry: active before the run, done after a successful one. A failed run leaves
// it active, so the plugin window shows what really happened, not what I remember to tick off.
// A dry run never touches the plan.
//
// Prelude: prelude.js, then the preludes of the project (--project, else the local project whose "files" list
// the file the plugin runs in), then every --prelude file, each in its own scope around the job (later files
// and the job may redeclare earlier names). --no-prelude sends none.
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { baseUrl, readToken } from './paths.mjs';
import { buildPrelude, selectProject } from './project.mjs';

const USAGE = 'usage: node run.mjs <script.js> [timeoutMs] [--step "plan text"] [--dry-run] [--project name] [--prelude file]... [--no-prelude] [--file key] | --status';
const fail = (message, code = 2) => { console.error(message); process.exit(code); };

const opts = { script: null, timeoutMs: 120000, step: null, dryRun: false, project: null, preludes: [], noPrelude: false, status: false, file: process.env.FIGMA_FILE || null };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const value = () => { if (i + 1 >= argv.length) fail(a + ' needs a value\n' + USAGE); return argv[++i]; };
  if (a === '--step' || a === '--krok') opts.step = value();
  else if (a === '--prelude') opts.preludes.push(value());
  else if (a === '--project') opts.project = value();
  else if (a === '--file') opts.file = value();
  else if (a === '--dry-run' || a === '--na-sucho') opts.dryRun = true;
  else if (a === '--no-prelude') opts.noPrelude = true;
  else if (a === '--status') opts.status = true;
  else if (a.startsWith('--')) fail('unknown option ' + a + '\n' + USAGE);
  else if (!opts.script) opts.script = a;
  else if (/^\d+$/.test(a)) opts.timeoutMs = Number(a);
  else fail('unexpected argument ' + a + '\n' + USAGE);
}
if (!opts.status && !opts.script) fail(USAGE);
if (opts.noPrelude && (opts.preludes.length || opts.project)) fail('--no-prelude excludes --prelude and --project');

let token;
try { token = readToken(); } catch (e) { fail(e.message, 1); }
const H = { 'X-Bridge-Token': token, 'Content-Type': 'application/json' };
const request = async (path, init) => {
  try { return await fetch(baseUrl() + path, Object.assign({ headers: H }, init)); }
  catch (e) {
    console.log(JSON.stringify({ ok: false, error: 'bridge server not reachable at ' + baseUrl() + ' (node server.mjs): ' + ((e.cause && e.cause.code) || e.message) }, null, 1));
    process.exit(1);
  }
};
if (opts.status) { console.log(await (await request('/status')).text()); process.exit(0); }

// The job's file: --file, else the plugin's current file, which the server knows. The job, its plan step and its
// project all go by this one answer: left to the server, the job could land in another file when the current
// window closes in between.
const status = await (await request('/status')).json().catch(() => ({}));
const named = opts.file && (status.files || [status.file || {}]).find(f => f.fileKey === opts.file || (f.fileName || '').toLowerCase().includes(opts.file.toLowerCase()));
const fileKey = opts.file ? (named ? named.fileKey : opts.file) : (status.file || {}).fileKey || null;
const target = opts.file || fileKey || undefined;

const readPrelude = () => {
  if (opts.noPrelude) return '';
  const extra = opts.preludes.map(p => resolve(p));
  const missing = extra.find(f => !existsSync(f));
  if (missing) fail('prelude file not found: ' + missing);
  // Without --project the job's file picks the project.
  try { return buildPrelude({ project: selectProject({ name: opts.project, fileKey: opts.project ? null : fileKey }), extra }); } catch (e) { return fail(e.message); }
};
const mark = async state => {
  if (!opts.step || opts.dryRun) return;
  try { await fetch(baseUrl() + '/plan', { method: 'POST', headers: H, body: JSON.stringify({ mark: opts.step, state, file: target }) }); } catch (e) {}
};

if (!existsSync(opts.script)) fail('no such script: ' + opts.script);
const code = readFileSync(opts.script, 'utf8');
const prelude = readPrelude();
// Label for the plugin window: a "//# description" line in the script, else the file name.
const label = (code.match(/^\/\/#\s*(.+)$/m) || [])[1] || basename(opts.script).replace(/\.js$/, '');
await mark('active');
const r = await request('/job', { method: 'POST', body: JSON.stringify({ code, label, timeoutMs: opts.timeoutMs, dryRun: opts.dryRun, prelude, file: target }) });
const out = await r.json();
// A pipe takes about 64 KB at once and queues the rest: exiting before the write is through cuts a long answer off.
await new Promise(written => process.stdout.write(JSON.stringify(out, null, 1) + '\n', written));
// A failed step stays active: the plan has to tell the truth, not comfort.
await mark(out.ok ? 'done' : 'active');
process.exit(out.ok ? 0 : 1);
