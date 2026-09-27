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
const inst = (setName, variant) => { const c = findComp(setName); return (c.type === 'COMPONENT_SET' ? (c.children.find(v => v.name === variant) || c.defaultVariant) : c).createInstance(); };
const setProp = (i, name, value) => { const key = Object.keys(i.componentProperties).find(k => k === name || k.startsWith(name + '#')); if (key) i.setProperties({ [key]: value }); return i; };
const comp = (name, dir, o) => { const c = figma.createComponent(); c.name = name; c.fills = []; c.layoutMode = dir; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO'; const f = box('tmp', dir, o || {}); for (const k of ['itemSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) { const bv = f.boundVariables && f.boundVariables[k]; if (bv) c.setBoundVariable(k, figma.variables.getVariableById ? V(_vars.find(v => v.id === bv.id).name) : null); } if (o && o.fill) c.fills = paint(o.fill); if (o && o.radius) radius(c, o.radius); for (const k of ['primaryAxisAlignItems', 'counterAxisAlignItems']) if (o && o[k]) c[k] = o[k]; f.remove(); return c; };
const fixedW = (c, w) => { if (c.layoutMode === 'VERTICAL') { c.counterAxisSizingMode = 'FIXED'; c.resize(w, c.height); c.primaryAxisSizingMode = 'AUTO'; } else { c.primaryAxisSizingMode = 'FIXED'; c.resize(w, c.height); c.counterAxisSizingMode = 'AUTO'; } };
//# DS P3: naprawa rzędu akcji w Action card
const card = findComp('Action card');
for (const v of card.children) {
  const act = v.findOne(n => n.name === 'Actions'); [...act.children].forEach(c => c.remove());
  act.layoutMode = 'VERTICAL'; act.layoutWrap = 'NO_WRAP'; act.setBoundVariable('itemSpacing', V('spacing/sm')); act.primaryAxisSizingMode = 'AUTO'; act.layoutSizingHorizontal = 'FILL';
  const msg = v.name.includes('Message');
  const r1 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r1); r1.layoutSizingHorizontal = 'FILL';
  const p = inst('Button', 'Style=Primary'); setProp(p, 'Label', msg ? 'Ogarnięte' : 'Zrobione'); r1.appendChild(p); p.layoutGrow = 1;
  const d = inst('Button', 'Style=Secondary'); setProp(d, 'Label', 'Szczegóły'); r1.appendChild(d);
  if (msg) { const r2 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r2); const r = inst('Button', 'Style=Secondary'); setProp(r, 'Label', 'Odpowiedz'); setProp(r, 'Ikona', true); r2.appendChild(r); }
}
await shot(card, { name: 'ds-card', scale: 1 });
return { ok: true };
