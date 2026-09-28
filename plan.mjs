// Work plan in the plugin window.
//   node plan.mjs "x:done" ">:in progress" "-:to do"   sets the plan (comment entries stay)
//   node plan.mjs --add "text"        adds a step in progress     node plan.mjs --active "#47" / --done "#47" / --done "text prefix"
//   node plan.mjs --clear-done        removes finished steps
import { baseUrl, readToken } from './paths.mjs';

const H = { 'X-Bridge-Token': readToken(), 'Content-Type': 'application/json' };
const a = process.argv.slice(2);
let body;
if (a[0] === '--add') body = { add: a[1], state: 'active' };
else if (a[0] === '--active') body = { mark: a[1], state: 'active' };
else if (a[0] === '--done') body = { mark: a[1], state: 'done' };
else if (a[0] === '--clear-done') body = { clearDone: true };
else { const STATE = { x: 'done', '>': 'active', '-': 'todo' }; body = { tasks: a.map(s => ({ state: STATE[s[0]] || 'todo', text: s.replace(/^[x>-]:/, '') })) }; }
const r = await (await fetch(baseUrl() + '/plan', { method: 'POST', headers: H, body: JSON.stringify(body) })).json();
console.log(r.tasks.filter(t => t.state === 'done').length + '/' + r.tasks.length);
