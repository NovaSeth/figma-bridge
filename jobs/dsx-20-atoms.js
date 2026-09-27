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
//# DS v2: atomy (stany, API po angielsku, nowe atomy)
const { s, b } = await board('Atomy', 2000);
const out = [];
// Button v2
removeDoc('Button');
{ const STYLES = { Primary: ['inverse-surface', 'on-inverse-surface'], Secondary: ['neutral-container', 'on-surface'], Outline: [null, 'on-surface'], Text: [null, 'primary'] }; const comps = [];
  for (const [style, [bg, fg]] of Object.entries(STYLES)) for (const state of ['Default', 'Pressed', 'Disabled']) {
    const c = figma.createComponent(); c.name = 'Style=' + style + ', State=' + state; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.counterAxisSizingMode = 'FIXED'; c.resize(120, 44); c.primaryAxisSizingMode = 'AUTO';
    sizeVar(c, 'height', 'touch'); c.setBoundVariable('itemSpacing', V('spacing/xs')); for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/xl')); radius(c, style === 'Outline' ? 'full' : 'md');
    const dis = state === 'Disabled'; c.fills = dis && bg ? paint('disabled-container') : bg ? paint(bg) : [];
    if (style === 'Outline') { c.strokes = paint(dis ? 'outline-variant' : 'outline'); c.strokeWeight = 1.5; c.strokeAlign = 'INSIDE'; }
    const color = dis ? 'on-disabled' : fg; const ic = iconInst('reply', 20, color); ic.name = 'Icon'; c.appendChild(ic); const t = await txt('Zrobione', 'label/lg', color); t.name = 'Label'; c.appendChild(t);
    if (state === 'Pressed') { const o = figma.createFrame(); o.name = 'State layer'; o.resize(120, 44); o.fills = paint(style === 'Primary' ? 'on-inverse-surface' : 'state-pressed'); if (style === 'Primary') o.opacity = 0.16; c.appendChild(o); o.layoutPositioning = 'ABSOLUTE'; o.x = 0; o.y = 0; o.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }; }
    comps.push(c); }
  const set = variants('Button', comps, 'Przycisk 44 px. Primary: jedna główna akcja w karcie lub arkuszu (czarny, w ciemnym motywie biały). Secondary: akcje poboczne („Szczegóły", „Anuluj", „Archiwizuj"). Outline: akcja kontekstowa w pasku („Dziś"). Text: akcja w tekście („Odśwież teraz"). Stany: Default, Pressed (nakładka state-pressed), Disabled. Etykieta to czasownik, bez słów „symuluj" czy „prototyp".');
  set.resize(760, set.height); const k = { l: prop(set, 'Label', 'TEXT', 'Zrobione'), si: prop(set, 'Show icon', 'BOOLEAN', false), i: prop(set, 'Icon', 'INSTANCE_SWAP', findComp('Icon/reply').id) };
  for (const c of set.children) { c.findOne(n => n.name === 'Label').componentPropertyReferences = { characters: k.l }; c.findOne(n => n.name === 'Icon').componentPropertyReferences = { visible: k.si, mainComponent: k.i }; }
  await entry(b, 'Button', set.description, set); out.push('Button ' + set.children.length); }
// Chip: bez ikony końcowej, API po angielsku
{ const set = findComp('Chip'); for (const c of set.children) { const tr = c.findOne(n => n.name === 'Trailing icon'); if (tr) tr.remove(); c.counterAxisSizingMode = 'FIXED'; sizeVar(c, 'height', 'chip'); }
  for (const [key, def] of Object.entries(set.componentPropertyDefinitions)) { const base = key.split('#')[0]; if (base === 'Ikona końcowa') set.deleteComponentProperty(key); else if (base === 'Ikona') set.editComponentProperty(key, { name: 'Show icon' }); else if (base === 'Ikona ↔') set.editComponentProperty(key, { name: 'Icon' }); }
  set.description = 'Tag metadanych (data, źródło, rola, stan). Reguła terminu zadania: po terminie = Warning, termin dziś = Success, termin w przyszłości = Neutral. Info = „Nowe" (nieprzeczytane) i legenda lekcji. Rola nadawcy („Wychowawczyni") to zawsze chip, nie dopisek w tekście.'; out.push('Chip'); }
for (const [name, from, to] of [['Avatar', 'Inicjał', 'Initials'], ['Badge', 'Liczba', 'Count'], ['Icon tile', 'Ikona ↔', 'Icon']]) { const c = findComp(name); for (const key of Object.keys(c.componentPropertyDefinitions)) if (key.split('#')[0] === from) c.editComponentProperty(key, { name: to }); }
for (const v of findComp('Avatar').children) sizeVar(v, 'width', 'avatar-' + ({ 40: 'sm', 44: 'md', 72: 'lg' }[Math.round(v.width)])), sizeVar(v, 'height', 'avatar-' + ({ 40: 'sm', 44: 'md', 72: 'lg' }[Math.round(v.height)]));
for (const v of findComp('Icon tile').children) { radius(v, 'sm'); sizeVar(v, 'width', 'tile'); sizeVar(v, 'height', 'tile'); if (v.name.includes('Success')) v.findOne(n => n.name === 'Icon').children[0].fills = paint('on-success'); }
for (const v of findComp('Checkbox').children) { sizeVar(v, 'width', 'checkbox'); sizeVar(v, 'height', 'checkbox'); }
for (const v of findComp('Switch').children) { sizeVar(v, 'width', 'switch-width'); sizeVar(v, 'height', 'switch-height'); v.paddingLeft = v.paddingRight = 2; v.setBoundVariable('paddingLeft', V('spacing/2xs')); v.setBoundVariable('paddingRight', V('spacing/2xs')); }
removeDoc('Unread dot');
progress(0.6, 'Nowe atomy');
if (!findComp('FAB')) { const c = comp('FAB', 'HORIZONTAL', { gap: 'sm', fill: 'inverse-surface', radius: 'xl', counterAxisAlignItems: 'CENTER' }); c.counterAxisSizingMode = 'FIXED'; c.resize(140, 52); c.primaryAxisSizingMode = 'AUTO'; c.setBoundVariable('paddingLeft', V('spacing/lg')); c.setBoundVariable('paddingRight', V('spacing/xl')); await c.setEffectStyleIdAsync(ES('elevation/fab').id);
  const ic = iconInst('edit', 24, 'on-inverse-surface'); ic.name = 'Icon'; c.appendChild(ic); const t = await txt('Napisz', 'title/sm', 'on-inverse-surface'); t.name = 'Label'; c.appendChild(t);
  const k1 = prop(c, 'Label', 'TEXT', 'Napisz'), k2 = prop(c, 'Icon', 'INSTANCE_SWAP', findComp('Icon/edit').id); t.componentPropertyReferences = { characters: k1 }; ic.componentPropertyReferences = { mainComponent: k2 };
  c.description = 'Przycisk pływający nad listą (jedyny element z cieniem elevation/fab): „Napisz" w Wiadomościach, „Dodaj zajęcia" w Planie. 16 px od prawej krawędzi, 13 px nad dolną nawigacją.'; await entry(b, 'FAB', c.description, c); out.push('FAB'); }
if (!findComp('Progress bar')) { const comps = []; for (const v of [0, 25, 50, 75, 100]) { const c = figma.createComponent(); c.name = 'Value=' + v; c.resize(338, 6); radius(c, 'full'); c.fills = paint('summary-track'); c.clipsContent = true; const bar = figma.createFrame(); bar.name = 'Bar'; bar.resize(Math.max(338 * v / 100, 0.01), 6); radius(bar, 'full'); bar.fills = paint('primary'); c.appendChild(bar); bar.constraints = { horizontal: 'SCALE', vertical: 'STRETCH' }; if (!v) bar.visible = false; comps.push(c); }
  const set = variants('Progress bar', comps, 'Pasek prawdziwego postępu (zamknięte sprawy z otwartych). Tor: summary-track, wypełnienie: primary. Wartość zaokrąglana do najbliższego wariantu.'); set.layoutMode = 'VERTICAL'; set.itemSpacing = 16; await entry(b, 'Progress bar', set.description, set); out.push('Progress bar'); }
if (!findComp('Scrim')) { const c = figma.createComponent(); c.name = 'Scrim'; c.resize(402, 874); c.fills = paint('scrim'); c.description = 'Przyciemnienie tła (42%) pod arkuszem dolnym i listą dzieci. Tap zamyka warstwę.'; const holder = box('Scrim preview', 'VERTICAL', {}); holder.appendChild(c); c.resize(402, 120); await entry(b, 'Scrim', c.description, holder); out.push('Scrim'); }
if (!findComp('Grabber')) { const c = comp('Grabber', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(402, 44); sizeVar(c, 'height', 'touch'); const pill = figma.createFrame(); pill.name = 'Pill'; pill.resize(36, 5); radius(pill, 'full'); pill.fills = paint('outline'); sizeVar(pill, 'width', 'grabber-width'); c.appendChild(pill); c.description = 'Uchwyt arkusza dolnego. Tap przełącza połowę i pełną wysokość.'; await entry(b, 'Grabber', c.description, c); out.push('Grabber'); }
if (!findComp('Spinner')) { const c = figma.createComponent(); c.name = 'Spinner'; c.resize(18, 18); c.fills = []; const arc = figma.createEllipse(); arc.resize(18, 18); arc.fills = paint('on-surface'); arc.arcData = { startingAngle: 0, endingAngle: Math.PI * 1.5, innerRadius: 0.78 }; c.appendChild(arc); arc.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }; c.description = 'Wskaźnik odświeżania po przeciągnięciu listy.'; await entry(b, 'Spinner', c.description, c); out.push('Spinner'); }
fitSection(s, b);
await shot(findComp('Button'), { name: 'ds-button', scale: 0.8 });
return out;
