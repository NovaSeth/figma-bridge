// Wspólna biblioteka zadań DS: strona, zmienne, style, pomocnicze konstruktory.
let dsPage = figma.root.children.find(p => p.name === 'Design System');
if (!dsPage) { dsPage = figma.createPage(); dsPage.name = 'Design System'; }
await figma.setCurrentPageAsync(dsPage);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const MI = { family: 'Material Icons', style: 'Regular' }; await figma.loadFontAsync(MI);
const _cols = await figma.variables.getLocalVariableCollectionsAsync(), _vars = await figma.variables.getLocalVariablesAsync();
const colId = n => _cols.find(c => c.name === n).id;
const V = (name, collection) => _vars.find(v => v.name === name && v.variableCollectionId === colId(collection || (name.startsWith('color/') ? 'Color' : 'Size')));
const paint = (name, collection) => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V('color/' + name, collection))];
const _ts = await figma.getLocalTextStylesAsync(), _es = await figma.getLocalEffectStylesAsync();
const TS = n => _ts.find(s => s.name === n), ES = n => _es.find(s => s.name === n);
const txt = async (chars, style, color, collection) => { const t = figma.createText(); await t.setTextStyleIdAsync(TS(style).id); t.characters = chars; t.fills = paint(color || 'on-surface', collection); return t; };
const box = (name, dir, o = {}) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO';
  for (const [k, v] of Object.entries(o)) { if (k === 'gap') f.setBoundVariable('itemSpacing', V('spacing/' + v)); else if (k === 'pad') { const [y, x] = v; for (const s of ['paddingTop', 'paddingBottom']) f.setBoundVariable(s, V('spacing/' + y)); for (const s of ['paddingLeft', 'paddingRight']) f.setBoundVariable(s, V('spacing/' + x)); } else if (k === 'radius') { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) f.setBoundVariable(c, V('radius/' + v)); } else if (k === 'fill') f.fills = paint(v); else f[k] = v; }
  return f; };
const fillW = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const section = name => dsPage.children.find(n => n.type === 'SECTION' && n.name === name);
// --- komponenty ---
const board = async (name, x) => { let s = section(name); if (!s) { s = figma.createSection(); s.name = name; dsPage.appendChild(s); s.x = x; s.y = 0; }
  let b = s.children.find(n => n.name === 'Board'); if (!b) { b = box('Board', 'VERTICAL', { gap: '3xl', pad: ['3xl', '3xl'], fill: 'background' }); s.appendChild(b); b.x = 80; b.y = 80; } return { s, b }; };
const fitSection = (s, b) => s.resizeWithoutConstraints(b.width + 160, b.height + 160);
const entry = async (b, title, desc, node) => { const g = box('Doc · ' + title, 'VERTICAL', { gap: 'md' }); b.appendChild(g); g.appendChild(await txt(title, 'title-lg')); const d = await txt(desc, 'body-sm', 'on-surface-variant'); g.appendChild(d); d.resize(900, d.height); d.textAutoResize = 'HEIGHT'; g.appendChild(node); return g; };
const findComp = name => dsPage.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === name);
const iconInst = (name, size, color) => { const i = findComp('Icon/' + name).createInstance(); if (size && size !== 24) i.resize(size, size); if (color) i.children[0].fills = paint(color); return i; };
const variants = (name, comps, desc) => { const set = figma.combineAsVariants(comps, dsPage); set.name = name; set.description = desc || ''; set.layoutMode = 'HORIZONTAL'; set.layoutWrap = 'WRAP'; set.itemSpacing = 24; set.counterAxisSpacing = 24; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 24; set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO'; set.fills = paint('surface'); set.cornerRadius = 16; return set; };
const radius = (n, key) => { for (const c of ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']) n.setBoundVariable(c, V('radius/' + key)); };
//# DS P3.a: ikony Material jako komponenty wektorowe
const NAMES = ['home', 'task_alt', 'grading', 'mail', 'calendar_month', 'chevron_right', 'chevron_left', 'expand_more', 'expand_less', 'check', 'close', 'add', 'error', 'settings', 'reply', 'send', 'attach_file', 'arrow_back', 'add_a_photo', 'campaign', 'event_available', 'record_voice_over', 'person', 'face', 'edit', 'inbox'];
const { s, b } = await board('Atomy', 2000);
let grid = b.findOne(n => n.name === 'Icon grid');
if (!grid) { grid = box('Icon grid', 'HORIZONTAL', { gap: 'lg', layoutWrap: 'WRAP', pad: ['xl', 'xl'], fill: 'surface' }); grid.counterAxisSpacing = 16; radius(grid, 'xl'); await entry(b, 'Icon', 'Ikonografia: Material Icons (Material Design). Każda ikona to komponent wektorowy 24 px z wypełnieniem color/on-surface. W komponentach ikony podmienia się przez INSTANCE_SWAP, kolor nadpisuje się na warstwie wektora. Rozmiary: 16 (chipy), 20 (kafle), 24 (wiersze, nawigacja), 28 (ustawienia).', grid); grid.counterAxisSizingMode = 'AUTO'; grid.primaryAxisSizingMode = 'FIXED'; grid.resize(900, grid.height); }
let made = 0;
for (const [i, name] of NAMES.entries()) {
  if (findComp('Icon/' + name)) continue;
  const t = figma.createText(); t.fontName = MI; t.fontSize = 24; t.lineHeight = { unit: 'PIXELS', value: 24 }; t.characters = name;
  const c = figma.createComponent(); c.name = 'Icon/' + name; c.resize(24, 24); c.fills = []; c.clipsContent = false; c.description = 'Material Icons: ' + name;
  c.appendChild(t); t.x = 0; t.y = 0;
  const v = figma.flatten([t], c); v.name = 'Vector'; v.fills = paint('on-surface'); v.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
  grid.appendChild(c); made++;
  if (i % 6 === 0) progress(i / NAMES.length, 'Ikona ' + name);
}
fitSection(s, b);
await shot(grid, { name: 'ds-icons', scale: 1 });
return { made, total: NAMES.length, boardId: b.id };
