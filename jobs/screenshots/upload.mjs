// Uploads the iOS screenshot catalog (~/.flibrus-lustro/catalog/<Class>/<theme>/*.png)
// to the "[Tests] User Front" page (120:13632): one section per theme, one row per area.
//
//   node jobs/screenshots/upload.mjs [--only light|dark] [--dry-run]
//
// Idempotent: a frame with the same name in the same section gets the new image, a new
// frame takes its place in the row, frames of screenshots that no longer exist are
// removed. Images go as 2x JPEG (804×1748) so the Figma file does not grow by hundreds
// of MB while text stays sharp when zoomed in. Section titles and frame names stay in
// Polish — they are what Michał reads in Figma.
import { readFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bridge = join(here, '..', '..');
const TOKEN = readFileSync(join(bridge, 'token.txt'), 'utf8').trim();
const HEADERS = { 'X-Bridge-Token': TOKEN, 'Content-Type': 'application/json' };
const CATALOG = join(homedir(), '.flibrus-lustro', 'catalog');
const CACHE = join(homedir(), '.flibrus-lustro', 'catalog-jpg');
const PAGE_ID = '120:13632';
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
const dryRun = argv.includes('--dry-run');

const AREAS = [
  ['T', 'Teraz'], ['Z', 'Zadania'], ['O', 'Oceny'], ['W', 'Wiadomości'], ['P', 'Plan'],
  ['F', 'Frekwencja'], ['U', 'Ustawienia'], ['S', 'Parowanie i stany specjalne'],
];
const THEMES = [['light', 'Jasny motyw'], ['dark', 'Ciemny motyw']].filter(([theme]) => !only || theme === only);
const WIDTH = 402, HEIGHT = 874, GAP_X = 64, GAP_Y = 120, PER_ROW = 12, PADDING = 120, ROW_HEADER = 140;

// 1. Collect screenshots: { theme, area, id, name, file }
const shots = [];
for (const testClass of existsSync(CATALOG) ? readdirSync(CATALOG) : []) {
  for (const [theme] of THEMES) {
    const dir = join(CATALOG, testClass, theme);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.png')) continue;
      const name = file.replace(/\.png$/, '');
      const match = name.match(/^([A-Z])(\d+[a-z]?)\s/);
      if (!match || !AREAS.some(([prefix]) => prefix === match[1])) continue;
      shots.push({ theme, area: match[1], id: match[1] + match[2], name, file: join(dir, file) });
    }
  }
}
const orderOf = shot => [AREAS.findIndex(([prefix]) => prefix === shot.area), parseInt(shot.id.slice(1), 10), shot.id];
shots.sort((a, b) => { const x = orderOf(a), y = orderOf(b); return x[0] - y[0] || x[1] - y[1] || String(x[2]).localeCompare(y[2]); });

// 2. Layout: a section per theme with rows of areas (wrapped every PER_ROW screens).
const layout = [];
let sectionY = 0;
for (const [theme, title] of THEMES) {
  const own = shots.filter(shot => shot.theme === theme);
  let y = PADDING, width = 0;
  const rows = [];
  for (const [prefix, areaName] of AREAS) {
    const inArea = own.filter(shot => shot.area === prefix);
    if (!inArea.length) continue;
    rows.push({ text: areaName + ' (' + inArea.length + ')', x: PADDING, y });
    y += ROW_HEADER;
    inArea.forEach((shot, i) => {
      const column = i % PER_ROW, line = Math.floor(i / PER_ROW);
      shot.x = PADDING + column * (WIDTH + GAP_X); shot.y = y + line * (HEIGHT + GAP_Y);
      width = Math.max(width, shot.x + WIDTH + PADDING);
    });
    y += Math.ceil(inArea.length / PER_ROW) * (HEIGHT + GAP_Y) + 80;
  }
  layout.push({ theme, title, x: 0, y: sectionY, w: Math.max(width, 2000), h: y + PADDING, rows, count: own.length });
  sectionY += y + PADDING + 400;
}
console.log(layout.map(section => `${section.title}: ${section.count} screenshots, section ${section.w}×${section.h}`).join('\n'));
if (dryRun) { for (const shot of shots) console.log(shot.theme, shot.id, shot.x, shot.y, shot.name); process.exit(0); }

// 3. 2x JPEG cache (rebuilt when the PNG is newer).
mkdirSync(CACHE, { recursive: true });
for (const shot of shots) {
  const jpg = join(CACHE, shot.theme + '-' + shot.name.replace(/[^\p{L}\p{N}]+/gu, '_') + '.jpg');
  if (!existsSync(jpg) || statSync(jpg).mtimeMs < statSync(shot.file).mtimeMs)
    execFileSync('sips', ['-Z', '1748', '-s', 'format', 'jpeg', '-s', 'formatOptions', '88', shot.file, '--out', jpg], { stdio: 'ignore' });
  shot.jpg = jpg;
}

async function job(code, label, timeoutMs = 180000) {
  const response = await fetch('http://127.0.0.1:8765/job', { method: 'POST', headers: HEADERS, body: JSON.stringify({ code, label, timeoutMs }) });
  const out = await response.json();
  if (!out.ok) throw new Error(label + ': ' + out.error);
  return out.result;
}

const prelude = `
const page = await figma.getNodeByIdAsync('${PAGE_ID}');
await page.loadAsync();
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
const sectionByTitle = title => page.children.find(n => n.type === 'SECTION' && n.name === title);
`;

// 4. Sections, row headers and the page title.
await job(prelude + `
const LAYOUT = ${JSON.stringify(layout)};
for (const s of LAYOUT) {
  let section = sectionByTitle(s.title);
  if (!section) { section = figma.createSection(); section.name = s.title; page.appendChild(section); }
  section.x = s.x; section.y = s.y; section.resizeWithoutConstraints(s.w, s.h);
  section.fills = [{ type: 'SOLID', color: s.theme === 'dark' ? { r: 0.11, g: 0.11, b: 0.12 } : { r: 0.96, g: 0.96, b: 0.97 } }];
  for (const n of section.children.filter(n => n.type === 'TEXT' && n.getPluginData('rola') === 'rzad')) n.remove();
  for (const row of s.rows) {
    const text = figma.createText();
    text.fontName = { family: 'Inter', style: 'Bold' }; text.fontSize = 56; text.characters = row.text;
    text.fills = [{ type: 'SOLID', color: s.theme === 'dark' ? { r: 0.95, g: 0.95, b: 0.96 } : { r: 0.07, g: 0.07, b: 0.08 } }];
    text.setPluginData('rola', 'rzad');
    section.appendChild(text); text.x = row.x; text.y = row.y;
  }
}
let title = page.children.find(n => n.type === 'TEXT' && n.getPluginData('rola') === 'tytul');
if (!title) { title = figma.createText(); page.appendChild(title); title.setPluginData('rola', 'tytul'); }
title.fontName = { family: 'Inter', style: 'Bold' }; title.fontSize = 96;
title.characters = 'Aplikacja iOS · zrzuty z symulatora';
title.x = 0; title.y = -420;
let note = page.children.find(n => n.type === 'TEXT' && n.getPluginData('rola') === 'opis');
if (!note) { note = figma.createText(); page.appendChild(note); note.setPluginData('rola', 'opis'); }
note.fontName = { family: 'Inter', style: 'Regular' }; note.fontSize = 40;
note.characters = ${JSON.stringify(`Prawdziwe dane z produkcji (lustro na symulatorze iPhone 17 Pro), stan z ${new Date().toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}. Rząd „Parowanie i stany specjalne" pokazuje stany z danych podglądowych (pusto, błąd, brak sieci), których na koncie teraz nie widać.`)};
note.x = 0; note.y = -280; note.resize(3600, note.height); note.textAutoResize = 'HEIGHT';
return true;`, 'Screenshots · sections and rows');

// 5. Images in batches (~3 MB per job).
let batch = [], size = 0, done = 0;
const send = async () => {
  if (!batch.length) return;
  const data = batch.map(shot => ({ title: THEMES.find(([theme]) => theme === shot.theme)[1], name: shot.name, x: shot.x, y: shot.y, b64: readFileSync(shot.jpg).toString('base64') }));
  const result = await job(prelude + `
const DATA = ${JSON.stringify(data)};
let created = 0, replaced = 0;
for (const d of DATA) {
  const section = sectionByTitle(d.title);
  if (!section) throw new Error('Missing section ' + d.title);
  const image = figma.createImage(figma.base64Decode(d.b64));
  let frame = section.children.find(n => n.type === 'FRAME' && n.name === d.name);
  if (!frame) { frame = figma.createFrame(); frame.name = d.name; section.appendChild(frame); created++; } else replaced++;
  frame.resizeWithoutConstraints(${WIDTH}, ${HEIGHT});
  frame.x = d.x; frame.y = d.y; frame.cornerRadius = 0; frame.clipsContent = true;
  frame.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  frame.setPluginData('zrodlo', 'katalog-zrzutow-ios');
}
return { created, replaced };`, 'Screenshots · ' + (done + batch.length) + '/' + shots.length);
  done += batch.length;
  console.log(`${done}/${shots.length}`, JSON.stringify(result));
  batch = []; size = 0;
};
for (const shot of shots) {
  batch.push(shot); size += statSync(shot.jpg).size;
  if (size > 3_000_000 || batch.length >= 12) await send();
}
await send();

// 6. Cleanup: catalog frames no longer among the screenshots are removed (ours only, by pluginData).
const wanted = {};
for (const [theme, title] of THEMES) wanted[title] = shots.filter(shot => shot.theme === theme).map(shot => shot.name);
const removed = await job(prelude + `
const WANTED = ${JSON.stringify(wanted)};
const removed = [];
for (const [title, names] of Object.entries(WANTED)) {
  const section = sectionByTitle(title); if (!section) continue;
  const keep = new Set(names);
  for (const frame of section.children.filter(n => n.type === 'FRAME' && n.getPluginData('zrodlo') === 'katalog-zrzutow-ios'))
    if (!keep.has(frame.name)) { removed.push(frame.name); frame.remove(); }
}
return removed;`, 'Screenshots · cleanup');
console.log('Removed stale frames:', removed.length ? removed.join(', ') : 'none');
