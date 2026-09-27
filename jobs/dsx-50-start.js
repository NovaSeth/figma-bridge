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
//# DS v2: strona startowa (zasady, konwencje, kontrasty)
const sec = section('Start') || (() => { const x = figma.createSection(); x.name = 'Start'; dsPage.appendChild(x); x.x = -2200; x.y = 0; return x; })();
let root = sec.children.find(n => n.name === 'Start board'); if (root) root.remove();
root = box('Start board', 'VERTICAL', { gap: '2xl', pad: ['3xl', '3xl'], fill: 'background' }); sec.appendChild(root); root.x = 80; root.y = 80; root.counterAxisSizingMode = 'FIXED'; root.resize(1500, 100); root.primaryAxisSizingMode = 'AUTO';
const h = async (t, style) => { const w = box('H', 'VERTICAL', {}); root.appendChild(w); fillW(w); const x = await txt(t, style); w.appendChild(x); fillW(x); x.textAutoResize = 'HEIGHT'; return x; };
const p = async (t) => { const x = await txt(t, 'body/md', 'on-surface-variant'); root.appendChild(x); fillW(x); x.textAutoResize = 'HEIGHT'; return x; };
await h('FLibrus Design System', 'headline/lg');
await p('Źródło prawdy dla makiet FLibrusa. Strona „Mockupy" składa się z instancji tych komponentów: zmiana tutaj zmienia wszystkie ekrany. Nazwy tokenów i komponentów są zgodne z formatem DESIGN.md (Stitch), więc plik da się wyeksportować dla agentów kodujących.');
await h('Jak korzystać', 'title/lg');
await p('1. Nie odczepiaj instancji. Jeśli czegoś brakuje, dodaj właściwość do komponentu albo nowy wariant.\n2. Nie wpisuj kolorów ani odstępów ręcznie: wszystko wiąż ze zmiennymi (Fill → zmienna, padding/gap → spacing/…).\n3. Tekst tylko ze stylów (headline/…, title/…, body/…, label/…, calendar/…).\n4. Ikony to komponenty Icon/… podmieniane przez właściwość Icon (INSTANCE_SWAP), nigdy nowy wariant na ikonę.\n5. Motyw ciemny to kolekcja „Color Dark" o tych samych nazwach tokenów (plan Starter daje 1 tryb na kolekcję).');
await h('Konwencje nazw', 'title/lg');
await p('Komponenty: Nazwa po angielsku (Button, List row, Bottom sheet). Warianty: Property=Value (Style=Primary, State=Default). Właściwości: Label, Show icon, Icon, Value, Show chips. Opisy komponentów po polsku, bo są instrukcją dla projektanta i dla agenta.\nZmienne: color/…, spacing/… (skala liczbowa 50–800), radius/…, size/…, font/…. Prymitywy (blue/600, neutral/900) są ukryte przed pickerem: komponenty wiążą się wyłącznie z tokenami semantycznymi.');
await h('Kontrast (WCAG AA)', 'title/lg');
const PAIRS = [['on-surface', 'surface', 'Tekst główny'], ['on-surface-variant', 'surface', 'Tekst pomocniczy'], ['on-surface-variant', 'background', 'Tekst pomocniczy na tle'], ['on-primary-container', 'primary-container', 'Karta podsumowania'], ['summary-secondary', 'primary-container', 'Szczegół na karcie'], ['primary', 'surface', 'Link, akcent'], ['warning', 'warning-container', 'Chip po terminie'], ['on-success-container', 'success-container', 'Chip na dziś'], ['success', 'surface', 'Wartość pozytywna'], ['error', 'background', 'Błąd walidacji'], ['on-badge', 'badge', 'Licznik'], ['on-inverse-surface', 'inverse-surface', 'Przycisk główny']];
const lum = c => { const f = v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const byId = Object.fromEntries(_vars.map(v => [v.id, v])); const resolve = v => { let val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; while (val && val.type === 'VARIABLE_ALIAS') { v = byId[val.id]; val = v.valuesByMode[Object.keys(v.valuesByMode)[0]]; } return val; };
const rows = []; for (const [fg, bg, use] of PAIRS) for (const theme of ['Color', 'Color Dark']) { const a = lum(resolve(V('color/' + fg, theme))), b2 = lum(resolve(V('color/' + bg, theme))); const cr = (Math.max(a, b2) + 0.05) / (Math.min(a, b2) + 0.05); rows.push({ fg, bg, use, theme: theme === 'Color' ? 'jasny' : 'ciemny', cr: Math.round(cr * 100) / 100 }); }
const table = box('Contrast', 'VERTICAL', { fill: 'surface', radius: 'xl' }); table.clipsContent = true; root.appendChild(table); fillW(table);
for (const [i, r] of rows.entries()) { const line = box('Row', 'HORIZONTAL', { gap: 'lg', pad: ['sm', 'lg'], counterAxisAlignItems: 'CENTER' }); if (i) { line.strokes = paint('outline-variant'); line.strokeWeight = 1; line.strokeAlign = 'INSIDE'; line.strokeTopWeight = 1; line.strokeBottomWeight = line.strokeLeftWeight = line.strokeRightWeight = 0; } table.appendChild(line); fillW(line);
  const sw = box('Sample', 'HORIZONTAL', { pad: ['xs', 'sm'], radius: 'sm' }); sw.fills = paint('color/' + r.bg === 'color/' ? r.bg : r.bg, r.theme === 'jasny' ? 'Color' : 'Color Dark'); const st = await txt('Aa', 'label/md', r.fg, r.theme === 'jasny' ? 'Color' : 'Color Dark'); sw.appendChild(st); line.appendChild(sw); sw.resize(56, sw.height);
  const l1 = await txt(r.fg + ' na ' + r.bg, 'body/sm'); line.appendChild(l1); l1.resize(420, l1.height); const l2 = await txt(r.theme, 'body/sm', 'on-surface-variant'); line.appendChild(l2); l2.resize(90, l2.height);
  const l3 = await txt(r.cr.toFixed(2) + ':1  ' + (r.cr >= 4.5 ? 'AA' : r.cr >= 3 ? 'AA large / UI' : 'PONIŻEJ AA'), 'label/md', r.cr >= 4.5 ? 'success' : r.cr >= 3 ? 'warning' : 'error'); line.appendChild(l3); l3.resize(260, l3.height);
  const l4 = await txt(r.use, 'body/sm', 'on-surface-variant'); line.appendChild(l4); l4.layoutGrow = 1; }
sec.resizeWithoutConstraints(root.width + 160, root.height + 160);
await shot(root, { name: 'ds-start', scale: 0.42 });
return { rows: rows.length, fails: rows.filter(r => r.cr < 3).map(r => r.fg + '/' + r.bg + ' ' + r.theme + ' ' + r.cr), belowAA: rows.filter(r => r.cr < 4.5 && r.cr >= 3).map(r => r.fg + '/' + r.bg + ' ' + r.theme + ' ' + r.cr) };
