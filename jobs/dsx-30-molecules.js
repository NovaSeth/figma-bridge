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
//# DS v2: molekuły, część 1 (wiersze, karty, nagłówki)
for (const v of findComp('Button').children.filter(c => c.name.includes('Pressed'))) { v.clipsContent = true; const o = v.findOne(n => n.name === 'State layer'); o.resize(600, 44); o.x = -200; }
for (const name of ['Molekuły', 'Organizmy']) { const old = section(name); if (old) old.remove(); }
const { s, b } = await board('Molekuły', 3300);
const grow = n => { n.layoutGrow = 1; return n; }; const out = [];
const chipSlots = async (parent, n, topPad) => { const r = box('Chips', 'HORIZONTAL', { gap: 's6' }); r.paddingTop = topPad; r.layoutWrap = 'WRAP'; r.counterAxisSpacing = 6; parent.appendChild(r); const chips = []; for (let i = 1; i <= n; i++) { const c = inst('Chip', 'Tone=Neutral'); c.name = 'Chip ' + i; r.appendChild(c); chips.push(c); } return { r, chips }; };
const chevron = color => { const w = box('Chevron', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); w.appendChild(iconInst('chevron_right', 24, color || 'on-surface-variant')); return w; };
const bindChips = (set, comps, n, defaults) => { const keys = []; for (let i = 2; i <= n; i++) keys[i] = prop(set, 'Show chip ' + i, 'BOOLEAN', defaults ? !!defaults[i] : false); for (const c of comps) for (let i = 2; i <= n; i++) { const ch = c.findOne(x => x.name === 'Chip ' + i); if (ch) ch.componentPropertyReferences = { visible: keys[i] }; } };

{ const c = comp('Section heading', 'VERTICAL', { gap: 'xs' }); c.setBoundVariable('paddingLeft', V('spacing/xs')); c.setBoundVariable('paddingRight', V('spacing/xs')); fixedW(c, 370);
  const t = await txt('Wymaga Twojego działania', 'title/lg'); t.name = 'Title'; c.appendChild(t); fillW(t); t.textAutoResize = 'HEIGHT'; const sub = await txt('3 dotyczą klasy Julii, 1 nowe', 'body/sm', 'on-surface-variant'); sub.name = 'Subtitle'; c.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
  const k1 = prop(c, 'Title', 'TEXT', 'Wymaga Twojego działania'), k2 = prop(c, 'Show subtitle', 'BOOLEAN', false), k3 = prop(c, 'Subtitle', 'TEXT', '3 dotyczą klasy Julii, 1 nowe'); t.componentPropertyReferences = { characters: k1 }; sub.componentPropertyReferences = { visible: k2, characters: k3 };
  c.description = 'Nagłówek sekcji ekranu. Sekcje „Teraz" w kolejności: Wymaga Twojego działania, Po terminie, Warto wiedzieć, Ogłoszenia szkolne. Podtytuł to jedno zdanie policzone z danych. Grupę zawsze otwiera nagłówek, nigdy wiersz-pudełko.'; await entry(b, 'Section heading', c.description, c); out.push('Section heading'); }

{ const comps = [];
  for (const lead of ['None', 'Icon tile', 'Avatar', 'Checkbox']) for (const trail of ['None', 'Chevron', 'Value', 'Switch']) {
    const c = comp('Leading=' + lead + ', Trailing=' + trail, 'HORIZONTAL', { gap: 'md', pad: ['md', 'lg'], fill: 'surface' }); fixedW(c, 370); c.counterAxisAlignItems = 'MIN';
    if (lead !== 'None') { const l = lead === 'Icon tile' ? inst('Icon tile', 'Tone=Primary') : lead === 'Avatar' ? inst('Avatar', 'Size=44') : inst('Checkbox', 'Checked=False'); l.name = 'Leading'; c.appendChild(l); }
    const col = box('Text', 'VERTICAL', { gap: '2xs' }); c.appendChild(col); grow(col);
    const t = await txt('Frekwencja: pełna obecność', 'title/md'); t.name = 'Title'; col.appendChild(t); fillW(t); t.textAutoResize = 'HEIGHT';
    const sub = await txt('Wrzesień: 0 nieobecności, 0 spóźnień', 'body/sm', 'on-surface-variant'); sub.name = 'Subtitle'; col.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
    await chipSlots(col, 2, 5);
    if (trail === 'Value') { const w = box('Trailing', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); const v = await txt('100%', 'headline/xs', 'success'); v.name = 'Value'; w.appendChild(v); c.appendChild(w); w.layoutSizingVertical = 'FILL'; }
    if (trail === 'Switch') { const w = box('Trailing', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); const sw = inst('Switch', 'On=True'); sw.name = 'Switch'; w.appendChild(sw); c.appendChild(w); w.layoutSizingVertical = 'FILL'; }
    if (trail === 'Chevron' || trail === 'Value') { const ch = chevron(); c.appendChild(ch); ch.layoutSizingVertical = 'FILL'; }
    comps.push(c); }
  const set = variants('List row', comps, 'Wiersz listy w karcie (iOS inset grouped). Leading: brak, kafel ikony, awatar, kółko zadania. Trailing: brak, szewron, wartość z szewronem, przełącznik. Szewron zawsze wyśrodkowany w pionie i tylko gdy wiersz dokądś prowadzi. Data to chip pod tekstem, nie dopisek przy tytule.'); set.resize(1700, set.height);
  const k = { t: prop(set, 'Title', 'TEXT', 'Frekwencja: pełna obecność'), ss: prop(set, 'Show subtitle', 'BOOLEAN', true), st: prop(set, 'Subtitle', 'TEXT', 'Wrzesień: 0 nieobecności, 0 spóźnień'), sc: prop(set, 'Show chips', 'BOOLEAN', false), v: prop(set, 'Value', 'TEXT', '100%') };
  for (const c of set.children) { c.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: k.t }; c.findOne(n => n.name === 'Subtitle').componentPropertyReferences = { visible: k.ss, characters: k.st }; c.findOne(n => n.name === 'Chips').componentPropertyReferences = { visible: k.sc }; const v = c.findOne(n => n.name === 'Value'); if (v) v.componentPropertyReferences = { characters: k.v }; exposeAll(c); }
  bindChips(set, set.children, 2); await entry(b, 'List row', set.description, set); out.push('List row ' + set.children.length); }
progress(0.35, 'Feed row');
{ const comps = [];
  for (const lead of ['None', 'Avatar']) for (const read of ['False', 'True']) {
    const c = comp('Leading=' + lead + ', Read=' + read, 'HORIZONTAL', { gap: 'md', pad: ['md', 'lg'], fill: 'surface' }); fixedW(c, 370); c.counterAxisAlignItems = 'MIN';
    if (lead === 'Avatar') { const a = inst('Avatar', 'Size=40'); a.name = 'Avatar'; setProp(a, 'Initials', 'JO'); c.appendChild(a); }
    const col = box('Text', 'VERTICAL', { gap: '2xs' }); c.appendChild(col); grow(col);
    const head = box('Head', 'HORIZONTAL', { gap: 'sm' }); head.counterAxisAlignItems = 'MIN'; col.appendChild(head); fillW(head);
    const t = await txt('Joanna Osęka-Więcławicz', read === 'True' ? 'title/md-read' : 'title/md'); t.name = 'Title'; head.appendChild(t); grow(t); t.textAutoResize = 'HEIGHT';
    const w = await txt('15:13', 'body/xs', 'on-surface-variant'); w.name = 'When'; head.appendChild(w);
    const sub = await txt('Ćwiczenia', 'body/sm', lead === 'Avatar' ? 'on-surface' : 'on-surface-variant'); sub.name = 'Subtitle'; col.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
    const pv = await txt('Dzień dobry, od dwóch dni Julia nie ma małych zielonych ćwiczeń. Proszę dopilnować, aby trafiły do plecaka.', 'body/sm', 'on-surface-variant'); pv.name = 'Preview'; col.appendChild(pv); fillW(pv); pv.textAutoResize = 'HEIGHT'; pv.textTruncation = 'ENDING'; pv.maxLines = 2;
    const { chips } = await chipSlots(col, 3, 5); if (read === 'False') { chips[0].setProperties({ 'Tone': 'Info' }); setProp(chips[0], 'Label', 'Nowe'); setProp(chips[0], 'Show icon', false); } else setProp(chips[0], 'Label', 'dziś');
    const ch = chevron(); c.appendChild(ch); ch.layoutSizingVertical = 'FILL'; comps.push(c); }
  const set = variants('Feed row', comps, 'Wiersz wiadomości (z awatarem) i ogłoszenia (bez). Nowe = tytuł title/md + chip „Nowe" (Info) jako pierwszy; przeczytane = title/md-read bez chipa „Nowe". Podgląd maks. 2 linie. Tap: wiadomość otwiera wątek, ogłoszenie otwiera arkusz dolny.');
  const k = { t: prop(set, 'Title', 'TEXT', 'Joanna Osęka-Więcławicz'), sw: prop(set, 'Show when', 'BOOLEAN', true), w: prop(set, 'When', 'TEXT', '15:13'), ss: prop(set, 'Show subtitle', 'BOOLEAN', true), st: prop(set, 'Subtitle', 'TEXT', 'Ćwiczenia'), sp: prop(set, 'Show preview', 'BOOLEAN', true), p: prop(set, 'Preview', 'TEXT', 'Dzień dobry, od dwóch dni Julia nie ma małych zielonych ćwiczeń. Proszę dopilnować, aby trafiły do plecaka.'), sc: prop(set, 'Show chips', 'BOOLEAN', true) };
  for (const c of set.children) { c.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: k.t }; c.findOne(n => n.name === 'When').componentPropertyReferences = { visible: k.sw, characters: k.w }; c.findOne(n => n.name === 'Subtitle').componentPropertyReferences = { visible: k.ss, characters: k.st }; c.findOne(n => n.name === 'Preview').componentPropertyReferences = { visible: k.sp, characters: k.p }; c.findOne(n => n.name === 'Chips').componentPropertyReferences = { visible: k.sc }; exposeAll(c); }
  bindChips(set, set.children, 3); await entry(b, 'Feed row', set.description, set); out.push('Feed row'); }
progress(0.6, 'Karty');
{ const comps = [];
  for (const kind of ['Task', 'Message']) { const c = comp('Kind=' + kind, 'VERTICAL', { pad: ['lg', 'lg'], fill: 'surface', radius: 'xl' }); fixedW(c, 370);
    const { chips } = await chipSlots(c, 2, 0); chips[0].setProperties({ Tone: kind === 'Task' ? 'Warning' : 'Success' }); setProp(chips[0], 'Label', kind === 'Task' ? 'Po terminie · pt. 11 wrz' : 'dziś 15:13'); setProp(chips[1], 'Label', kind === 'Task' ? 'Zadanie' : 'Wychowawczyni'); setProp(chips[1], 'Show icon', false);
    const col = box('Text', 'VERTICAL', { gap: '2xs' }); col.paddingTop = 10; c.appendChild(col); fillW(col);
    const t = await txt(kind === 'Task' ? 'Nazwy obrazków: podziel na sylaby (zeszyt)' : 'Julia od 2 dni nie ma małych zielonych ćwiczeń', 'title/md'); t.name = 'Title'; col.appendChild(t); fillW(t); t.textAutoResize = 'HEIGHT';
    const m = await txt(kind === 'Task' ? 'Edukacja polonistyczna' : 'Joanna Osęka-Więcławicz', 'body/sm', 'on-surface-variant'); m.name = 'Meta'; col.appendChild(m); fillW(m); m.textAutoResize = 'HEIGHT';
    const act = box('Actions', 'VERTICAL', { gap: 'sm' }); act.paddingTop = 14; c.appendChild(act); fillW(act);
    const r1 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r1); fillW(r1); const p = inst('Button', 'Style=Primary, State=Default'); p.name = 'Primary'; r1.appendChild(p); grow(p); const d = inst('Button', 'Style=Secondary, State=Default'); d.name = 'Details'; setProp(d, 'Label', 'Szczegóły'); r1.appendChild(d);
    if (kind === 'Message') { const r2 = box('Row', 'HORIZONTAL', { gap: 'sm' }); act.appendChild(r2); const r = inst('Button', 'Style=Secondary, State=Default'); r.name = 'Reply'; setProp(r, 'Label', 'Odpowiedz'); setProp(r, 'Show icon', true); r2.appendChild(r); }
    comps.push(c); }
  const set = variants('Action card', comps, 'Karta sprawy wymagającej rodzica. Jedna akcja główna („Zrobione"), „Szczegóły" otwiera arkusz dolny, „Odpowiedz" otwiera okno odpowiedzi. Termin i rola nadawcy to chipy (reguła kolorów w opisie Chip).');
  const k = { t: prop(set, 'Title', 'TEXT', 'Nazwy obrazków: podziel na sylaby (zeszyt)'), m: prop(set, 'Meta', 'TEXT', 'Edukacja polonistyczna') }; for (const c of set.children) { c.findOne(n => n.name === 'Title').componentPropertyReferences = { characters: k.t }; c.findOne(n => n.name === 'Meta').componentPropertyReferences = { characters: k.m }; exposeAll(c); }
  await entry(b, 'Action card', set.description, set); out.push('Action card'); }
{ const c = comp('Summary card', 'VERTICAL', { pad: ['md', 'lg'], fill: 'primary-container', radius: '2xl' }); fixedW(c, 370);
  const lead = await txt('7 spraw do załatwienia', 'headline/sm', 'on-primary-container'); lead.name = 'Lead'; c.appendChild(lead); fillW(lead); lead.textAutoResize = 'HEIGHT';
  const dw = box('Detail wrap', 'VERTICAL', {}); dw.paddingTop = 6; c.appendChild(dw); fillW(dw); const sub = await txt('Julia od 2 dni nie ma małych zielonych ćwiczeń', 'body/md', 'summary-secondary'); sub.name = 'Detail'; dw.appendChild(sub); fillW(sub); sub.textAutoResize = 'HEIGHT';
  const pw = box('Progress wrap', 'VERTICAL', { gap: 'sm' }); pw.paddingTop = 18; c.appendChild(pw); fillW(pw); const pb = inst('Progress bar', 'Value=25'); pb.name = 'Progress bar'; pw.appendChild(pb); fillW(pb);
  const count = await txt('2 z 7 zamknięte (zrobione lub archiwum)', 'label/sm', 'summary-secondary'); count.name = 'Progress label'; pw.appendChild(count);
  const k = { l: prop(c, 'Lead', 'TEXT', '7 spraw do załatwienia'), sd: prop(c, 'Show detail', 'BOOLEAN', true), d: prop(c, 'Detail', 'TEXT', 'Julia od 2 dni nie ma małych zielonych ćwiczeń'), sp: prop(c, 'Show progress', 'BOOLEAN', true), p: prop(c, 'Progress label', 'TEXT', '2 z 7 zamknięte (zrobione lub archiwum)') };
  lead.componentPropertyReferences = { characters: k.l }; dw.componentPropertyReferences = { visible: k.sd }; sub.componentPropertyReferences = { characters: k.d }; pw.componentPropertyReferences = { visible: k.sp }; count.componentPropertyReferences = { characters: k.p }; exposeAll(c);
  c.description = 'Tonalna karta otwierająca „Teraz": zdanie policzone z danych + prawdziwy postęp. Jedyny duży akcent ekranu. Nigdy czarna: czerń jest tylko na przycisku głównym.'; await entry(b, 'Summary card', c.description, c); out.push('Summary card'); }
fitSection(s, b);
await shot(b, { name: 'ds-mol-1', scale: 0.4 });
return out;
