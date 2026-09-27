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
//# DS P3.b–c: Button i Chip
const { s, b } = await board('Atomy', 2000);
const link = (set, defs) => { const keys = {}; for (const [name, type, def] of defs) keys[name] = set.addComponentProperty(name, type, def); return keys; };
const out = {};
if (!findComp('Button')) {
  const STYLES = { Primary: ['inverse-surface', 'on-inverse-surface'], Secondary: ['neutral-container', 'on-surface'], Text: [null, 'primary'] };
  const comps = [];
  for (const [style, [bg, fg]] of Object.entries(STYLES)) {
    const c = figma.createComponent(); c.name = 'Style=' + style; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(120, 44);
    c.setBoundVariable('height', V('size/touch')); c.setBoundVariable('itemSpacing', V('spacing/xs')); for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/xl')); radius(c, 'md');
    c.fills = bg ? paint(bg) : [];
    const ic = iconInst('reply', 20, fg); ic.name = 'Icon'; c.appendChild(ic);
    const t = await txt('Zrobione', 'label-lg', fg); t.name = 'Label'; c.appendChild(t);
    comps.push(c);
  }
  const set = variants('Button', comps, 'Przycisk 44 px. Primary: jedna główna akcja w karcie lub arkuszu (czarny, w ciemnym motywie biały). Secondary: akcje poboczne („Szczegóły", „Anuluj"). Text: akcje w tekście („Odśwież teraz"). Etykieta to jedno słowo-czasownik, bez słów „symuluj" czy „prototyp".');
  const k = link(set, [['Label', 'TEXT', 'Zrobione'], ['Ikona', 'BOOLEAN', false], ['Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/reply').id]]);
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k['Label'] }; c.findOne(n => n.name === 'Icon').componentPropertyReferences = { visible: k['Ikona'], mainComponent: k['Ikona ↔'] }; }
  await entry(b, 'Button', set.description, set); out.button = set.id;
}
if (!findComp('Chip')) {
  const TONES = { Neutral: ['neutral-container', 'on-surface-variant'], Warning: ['warning-container', 'warning'], Success: ['success-container', 'on-success-container'], Info: ['primary-container', 'on-primary-container'] };
  const comps = [];
  for (const [tone, [bg, fg]] of Object.entries(TONES)) {
    const c = figma.createComponent(); c.name = 'Tone=' + tone; c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; c.resize(80, 26);
    c.setBoundVariable('itemSpacing', V('spacing/xs')); for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/sm')); radius(c, 'sm'); c.fills = paint(bg);
    const lead = iconInst('calendar_month', 16, fg); lead.name = 'Leading icon'; c.appendChild(lead);
    const t = await txt('pon. 21 wrz', 'label-md', fg); t.name = 'Label'; c.appendChild(t);
    const trail = iconInst('error', 16, fg); trail.name = 'Trailing icon'; c.appendChild(trail);
    comps.push(c);
  }
  const set = variants('Chip', comps, 'Tag metadanych (data, źródło, rola, stan). Reguła terminu zadania: po terminie = Warning + ikona końcowa error; termin dziś = Success; termin w przyszłości = Neutral. Info = legenda lekcji. Rola nadawcy („Wychowawczyni") to zawsze chip, nie dopisek w tekście.');
  const k = link(set, [['Label', 'TEXT', 'pon. 21 wrz'], ['Ikona', 'BOOLEAN', true], ['Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/calendar_month').id], ['Ikona końcowa', 'BOOLEAN', false]]);
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k['Label'] }; c.findOne(n => n.name === 'Leading icon').componentPropertyReferences = { visible: k['Ikona'], mainComponent: k['Ikona ↔'] }; c.findOne(n => n.name === 'Trailing icon').componentPropertyReferences = { visible: k['Ikona końcowa'] }; }
  await entry(b, 'Chip', set.description, set); out.chip = set.id;
}
fitSection(s, b);
for (const n of ['Button', 'Chip']) await shot(findComp(n), { name: 'ds-' + n.toLowerCase(), scale: 1.5 });
return out;
