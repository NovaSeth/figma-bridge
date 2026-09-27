// Wspólna biblioteka zadań DS: strona, zmienne, style, pomocnicze konstruktory.
let dsPage = figma.root.children.find(p => p.name === 'Design System');
if (!dsPage) { dsPage = figma.createPage(); dsPage.name = 'Design System'; }
await figma.setCurrentPageAsync(dsPage);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const MI = { family: 'Material Icons', style: 'Regular' }; await figma.loadFontAsync(MI);
const _cols = await figma.variables.getLocalVariableCollectionsAsync(), _vars = await figma.variables.getLocalVariablesAsync();
const colId = n => _cols.find(c => c.name === n).id;
const SP = { '2xs': '50', xs: '100', s6: '150', sm: '200', s10: '250', md: '300', lg: '400', xl: '500', '2xl': '600', s28: '700', '3xl': '800' };
const V = (name0, collection) => { const name = name0.startsWith('spacing/') && SP[name0.slice(8)] ? 'spacing/' + SP[name0.slice(8)] : name0; return _V(name, collection); };
const _V = (name, collection) => _vars.find(v => v.name === name && v.variableCollectionId === colId(collection || (name.startsWith('color/') ? 'Color' : 'Size')));
const paint = (name, collection) => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V('color/' + name, collection))];
const _ts = await figma.getLocalTextStylesAsync(), _es = await figma.getLocalEffectStylesAsync();
const _OLD = { 'label-md': 'label/sm', 'label-sm': 'label/xs', caption: 'body/xs' };
const texts = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const TS = n => { const s = _ts.find(x => x.name === n) || _ts.find(x => x.name === (_OLD[n] || n.replace('-', '/'))); if (!s) throw new Error('brak stylu tekstu: ' + n); return s; }, ES = n => _es.find(s => s.name === n);
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
const comp = (name, dir, o) => { const c = figma.createComponent(); c.name = name; c.fills = []; c.layoutMode = dir; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO'; const f = box('tmp', dir, o || {}); for (const k of ['itemSpacing', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight']) { const bv = f.boundVariables && f.boundVariables[k]; if (bv) c.setBoundVariable(k, _vars.find(v => v.id === bv.id)); } if (o && o.fill) c.fills = paint(o.fill); if (o && o.radius) radius(c, o.radius); for (const k of ['primaryAxisAlignItems', 'counterAxisAlignItems']) if (o && o[k]) c[k] = o[k]; f.remove(); return c; };
const fixedW = (c, w) => { if (c.layoutMode === 'VERTICAL') { c.counterAxisSizingMode = 'FIXED'; c.resize(w, c.height); c.primaryAxisSizingMode = 'AUTO'; } else { c.primaryAxisSizingMode = 'FIXED'; c.resize(w, c.height); c.counterAxisSizingMode = 'AUTO'; } };

const sizeVar = (n, prop, key) => n.setBoundVariable(prop, V('size/' + key));
const exposeAll = c => { for (const i of c.findAll(n => n.type === 'INSTANCE' && !n.name.startsWith('Icon') && n.parent.type !== 'INSTANCE')) { try { i.isExposedInstance = true; } catch (e) {} } };
const prop = (set, name, type, def) => set.addComponentProperty(name, type, def);
const removeDoc = name => { const d = dsPage.findOne(n => n.name === 'Doc · ' + name); if (d) d.remove(); const c = findComp(name); if (c && !c.removed) c.remove(); };
//# #60: chipy nad tytułem w List row (spójność z kartami na „Teraz")
const set = findComp('List row');
const has = set.children[0].findOne(n => n.name === 'Chips top');
let keyTop;
if (!has) {
  for (const v of set.children) {
    const col = v.findOne(n => n.name === 'Text' && n.layoutMode === 'VERTICAL');
    const bottom = col.children.find(c => c.name === 'Chips');
    const top = bottom.clone(); top.name = 'Chips top'; top.paddingTop = 0; top.paddingBottom = 5;
    col.insertChild(0, top); top.layoutSizingHorizontal = 'FILL';
  }
  keyTop = prop(set, 'Show chips top', 'BOOLEAN', false);
  for (const v of set.children) { const top = v.findOne(n => n.name === 'Chips top'); top.componentPropertyReferences = { visible: keyTop };
    // chipy w górnym slocie sterowane osobno
    top.children.forEach((c, i) => { c.name = 'Chip top ' + (i + 1); }); }
  for (let i = 2; i <= 2; i++) { const k = prop(set, 'Show chip top ' + i, 'BOOLEAN', false); for (const v of set.children) { const c = v.findOne(n => n.name === 'Chip top ' + i); if (c) c.componentPropertyReferences = { visible: k }; } }
  set.description = set.description + ' Chipy mogą stać nad tytułem (Show chips top) tam, gdzie termin jest ważniejszy od nazwy, jak na kartach „Teraz".';
}
// zastosowanie w Zadaniach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
const setPr = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const getPr = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
let moved = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'List row' && (x.componentProperties['Leading'] || {}).value === 'Checkbox')) {
    if (!getPr(row, 'Show chips')) continue;
    const bottom = row.findOne(n => n.name === 'Chips'), top = row.findOne(n => n.name === 'Chips top');
    if (!bottom || !top) continue;
    const src = bottom.children.filter(c => c.type === 'INSTANCE'), dst = top.children.filter(c => c.type === 'INSTANCE');
    src.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
      for (const p of ['Label', 'Show icon']) setPr(d, p, getPr(c, p)); const ic = getPr(c, 'Icon'); if (ic) setPr(d, 'Icon', ic); });
    setPr(row, 'Show chips top', true); setPr(row, 'Show chip top 2', !!getPr(row, 'Show chip 2')); setPr(row, 'Show chips', false); moved++; }
}
await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('04 '), { name: 'c-04', scale: 0.5 });
return { moved };
