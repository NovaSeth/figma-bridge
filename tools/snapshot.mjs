// Screenshots of every frame on a page (top-level frames and frames directly inside sections) into
// out/<label>/ of the bridge's data directory, for before/after comparisons (tools/sheet.mjs lays them out).
// Usage: node tools/snapshot.mjs [label=after] [page name]     without a page name: the page open in Figma
import { writeFileSync, mkdirSync, mkdtempSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codeDir as bridge, dataDir } from '../paths.mjs';

const out = join(dataDir(), 'out'), BATCH = 8;
const [label = 'after', pageName = null] = process.argv.slice(2);
// The label names a folder under out/ and is written into the job: a plain name, nothing that is a path or code.
if (!/^[\w.-]+$/.test(label) || /^\.+$/.test(label)) { console.error('usage: node tools/snapshot.mjs [label] [page name]   label: letters, digits, "." "_" "-"'); process.exit(2); }
const tmp = mkdtempSync(join(tmpdir(), 'bridge-snapshot-')), jobFile = join(tmp, 'snapshot.js');
mkdirSync(join(out, label), { recursive: true });
// Batches keep each job under the plugin's timeout; every batch recomputes the same frame list, so slices line up.
for (let start = 0; ; start += BATCH) {
  writeFileSync(jobFile, `//# Zrzuty ekranów (${label}) ${start + 1}–${start + BATCH}
${pageName ? `const page = figma.root.children.find(p => p.name === ${JSON.stringify(pageName)});
if (!page) throw new Error(${JSON.stringify('brak strony „' + pageName + '"')});
await figma.setCurrentPageAsync(page);` : 'const page = figma.currentPage;'}
const safe = s => s.replace(/[^0-9a-z]+/gi, '-').replace(/^-|-$/g, '') || 'frame', taken = {};
const found = page.children.flatMap(n => n.type === 'FRAME' ? [{ f: n, name: safe(n.name) }]
  : n.type === 'SECTION' ? n.children.filter(c => c.type === 'FRAME').map(f => ({ f, name: safe(n.name) + '__' + safe(f.name) })) : []);
// case-insensitive: on macOS "Home" and "home" would be one file
for (const s of found) { let n = s.name, i = 1; while (taken[n.toLowerCase()]) n = s.name + '-' + ++i; taken[n.toLowerCase()] = true; s.name = n; }
const part = found.slice(${start}, ${start + BATCH}); let done = 0;
for (const { f, name } of part) { await shot(f, { name: 'snap__' + name, scale: 1 }); await progress(++done / part.length); }
return { total: found.length, done: part.length };`);
  let result;
  // No prelude: the job needs no helpers, and a project prelude may switch the current page or load fonts first.
  try { result = JSON.parse(execFileSync(process.execPath, [join(bridge, 'run.mjs'), jobFile, '240000', '--no-prelude'], { encoding: 'utf8', maxBuffer: 1e8 })).result; }
  catch (e) { console.error(e.stdout || e.message); process.exitCode = 1; break; }
  for (const f of readdirSync(out).filter(n => n.startsWith('snap__'))) renameSync(join(out, f), join(out, label, f.replace('snap__', '')));
  process.stdout.write(`${start + result.done}/${result.total} `);
  if (start + BATCH >= result.total) { console.log('gotowe'); break; }
}
rmSync(tmp, { recursive: true, force: true });
