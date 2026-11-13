// Work plan in the plugin window, one per Figma file (a window shows the plan of its own file).
//   node plan.mjs [--file key] "x:done" ">:in progress" "-:to do"   sets the file's plan (its comment entries stay)
//   node plan.mjs [--file key] --add "text"        adds a step in progress
//   node plan.mjs [--file key] --active "#47" / --done "#47" / --done "text prefix"
//   node plan.mjs [--file key] --clear-done        removes finished steps
// --file (or FIGMA_FILE): a file key, or a part of the name of a file the plugin is open in. Without it: the file
// of the window the plugin was opened in last.
import { baseUrl, readToken } from './paths.mjs';

const fail = message => { console.error('plan: ' + message); process.exit(1); };
let a = process.argv.slice(2), file = process.env.FIGMA_FILE || null;
const at = a.indexOf('--file');
if (at >= 0) { if (at + 1 >= a.length) fail('--file needs a value'); file = a[at + 1]; a = a.filter((_, i) => i !== at && i !== at + 1); }
let body;
if (a[0] === '--add') body = { add: a[1], state: 'active' };
else if (a[0] === '--active') body = { mark: a[1], state: 'active' };
else if (a[0] === '--done') body = { mark: a[1], state: 'done' };
else if (a[0] === '--clear-done') body = { clearDone: true };
else { const STATE = { x: 'done', '>': 'active', '-': 'todo' }; body = { tasks: a.map(s => ({ state: STATE[s[0]] || 'todo', text: s.replace(/^[x>-]:/, '') })) }; }
if (file) body.file = file;
let token, res;
try { token = readToken(); } catch (e) { fail(e.message); }
try { res = await fetch(baseUrl() + '/plan', { method: 'POST', headers: { 'X-Bridge-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
catch (e) { fail('bridge server not reachable at ' + baseUrl() + ' (node server.mjs)'); }
const r = await res.json().catch(() => ({}));
if (!res.ok) fail(r.error || 'HTTP ' + res.status);
console.log(r.tasks.filter(t => t.state === 'done').length + '/' + r.tasks.length + (r.fileName || r.file ? ' · ' + (r.fileName || r.file) : ''));
