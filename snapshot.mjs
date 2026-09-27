// Zrzuty wszystkich ekranów makiet do out/<etykieta>/ (porównania przed/po). Użycie: node snapshot.mjs before|after
import { writeFileSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), label = process.argv[2] || 'after', BATCH = 8;
mkdirSync(join(here, 'out', label), { recursive: true });
for (let start = 0; start < 80; start += BATCH) {
  const job = `//# Zrzuty ekranów (${label}) ${start + 1}–${start + BATCH}
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.filter(n => n.type === 'SECTION').flatMap(s => s.children.filter(n => n.type === 'FRAME').sort((a, b) => a.y - b.y || a.x - b.x).map(f => ({ f, t: s.name[0] })));
const part = frames.slice(${start}, ${start + BATCH}); let i = 0;
for (const { f, t } of part) { await shot(f, { name: 'snap__' + t + '_' + f.name.split(' ')[0].replace(/[^0-9a-z]/gi, ''), scale: 1 }); progress(++i / part.length); }
return { total: frames.length, done: part.length };`;
  writeFileSync(join(here, 'jobs/gen/snap.js'), job);
  const out = JSON.parse(execFileSync('node', [join(here, 'run.mjs'), join(here, 'jobs/gen/snap.js'), '240000'], { encoding: 'utf8', maxBuffer: 1e8 }));
  for (const f of readdirSync(join(here, 'out')).filter(n => n.startsWith('snap__'))) renameSync(join(here, 'out', f), join(here, 'out', label, f.replace('snap__', '')));
  process.stdout.write(`${start + out.result.done}/${out.result.total} `);
  if (start + BATCH >= out.result.total) break;
}
console.log('gotowe');
