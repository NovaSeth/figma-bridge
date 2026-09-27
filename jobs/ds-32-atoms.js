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
//# DS P3.d–e: poprawka Chip/Button + Avatar, Badge, Unread dot, Checkbox, Switch, Icon tile, Divider
const { s, b } = await board('Atomy', 2000);
for (const n of ['Chip', 'Button']) for (const c of findComp(n).children) { c.primaryAxisSizingMode = 'AUTO'; }
const out = {};
const circle = (c, size) => { c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(size, size); radius(c, 'full'); };
if (!findComp('Avatar')) {
  const comps = [];
  for (const [size, style] of [[40, 'label-lg'], [44, 'title-lg'], [72, 'headline-lg']]) { const c = figma.createComponent(); c.name = 'Size=' + size; circle(c, size); c.fills = paint('primary-container'); const t = await txt('J', style, 'on-primary-container'); t.name = 'Initial'; c.appendChild(t); comps.push(c); }
  const set = variants('Avatar', comps, 'Awatar z inicjałem na primary-container. 44: dziecko w nagłówku, 40: nadawca wiadomości (dwa inicjały), 72: arkusz zdjęcia. Gdy jest zdjęcie (z Librusa albo własne), wypełnia koło.');
  const k = set.addComponentProperty('Inicjał', 'TEXT', 'J'); for (const c of set.children) c.findOne(n => n.name === 'Initial').componentPropertyReferences = { characters: k };
  await entry(b, 'Avatar', set.description, set); out.avatar = set.id;
}
if (!findComp('Badge')) {
  const c = figma.createComponent(); c.name = 'Badge'; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.counterAxisSizingMode = 'FIXED'; c.resize(18, 18); c.primaryAxisSizingMode = 'AUTO'; c.minWidth = 18;
  for (const p of ['paddingLeft', 'paddingRight']) c.setBoundVariable(p, V('spacing/xs')); radius(c, 'full'); c.fills = paint('badge');
  const t = await txt('7', 'label-sm', 'on-badge'); t.name = 'Count'; c.appendChild(t); const k = c.addComponentProperty('Liczba', 'TEXT', '7'); t.componentPropertyReferences = { characters: k };
  c.description = 'Licznik: otwarte sprawy na zakładce Teraz, nieprzeczytane na „Odebrane". Tylko prawdziwe liczby.';
  await entry(b, 'Badge', c.description, c); out.badge = c.id;
}
if (!findComp('Unread dot')) {
  const c = figma.createComponent(); c.name = 'Unread dot'; c.resize(8, 8); radius(c, 'full'); c.fills = paint('primary'); c.description = 'Znacznik nieprzeczytanej wiadomości lub ogłoszenia, przed tytułem. Tytuł nieprzeczytany: title-md, przeczytany: title-md-read.';
  await entry(b, 'Unread dot', c.description, c); out.dot = c.id;
}
if (!findComp('Checkbox')) {
  const comps = [];
  for (const on of [false, true]) { const c = figma.createComponent(); c.name = 'Checked=' + (on ? 'True' : 'False'); circle(c, 26); if (on) { c.fills = paint('primary'); c.appendChild(iconInst('check', 16, 'on-primary')); } else { c.fills = []; c.strokes = paint('outline'); c.strokeWeight = 2; c.strokeAlign = 'INSIDE'; } comps.push(c); }
  const set = variants('Checkbox', comps, 'Kółko zadania jak w Google Tasks. Pole dotyku 44 px zapewnia wiersz. Zaznaczenie przekreśla tytuł i przenosi zadanie do „Zrobione".');
  await entry(b, 'Checkbox', set.description, set); out.checkbox = set.id;
}
if (!findComp('Switch')) {
  const comps = [];
  for (const on of [true, false]) { const c = figma.createComponent(); c.name = 'On=' + (on ? 'True' : 'False'); c.layoutMode = 'HORIZONTAL'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisAlignItems = on ? 'MAX' : 'MIN'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(51, 31); c.paddingLeft = c.paddingRight = 2; radius(c, 'full'); c.fills = paint(on ? 'primary' : 'outline'); if (!on) c.opacity = 1; const k = figma.createEllipse(); k.name = 'Knob'; k.resize(27, 27); k.fills = paint('surface'); c.appendChild(k); comps.push(c); }
  const set = variants('Switch', comps, 'Przełącznik ustawień (iOS). Włączony: primary, wyłączony: outline.');
  await entry(b, 'Switch', set.description, set); out.sw = set.id;
}
if (!findComp('Icon tile')) {
  const comps = [];
  for (const [tone, bg, fg, ic] of [['Primary', 'primary', 'on-primary', 'record_voice_over'], ['Success', 'success', 'on-primary', 'event_available'], ['Warning', 'warning-strong', 'on-primary', 'campaign'], ['Neutral', 'neutral-container', 'on-surface-variant', 'grading']]) { const c = figma.createComponent(); c.name = 'Tone=' + tone; c.layoutMode = 'HORIZONTAL'; c.primaryAxisAlignItems = 'CENTER'; c.counterAxisAlignItems = 'CENTER'; c.primaryAxisSizingMode = 'FIXED'; c.counterAxisSizingMode = 'FIXED'; c.resize(32, 32); c.cornerRadius = 9; c.fills = paint(bg); const i = iconInst(ic, 20, fg); i.name = 'Icon'; c.appendChild(i); comps.push(c); }
  const set = variants('Icon tile', comps, 'Kwadrat z ikoną jak w Ustawieniach iOS. Kolor oznacza rodzaj informacji: Primary = informacja, Success = frekwencja, Warning = ogłoszenia, Neutral = brak danych.');
  const k = set.addComponentProperty('Ikona ↔', 'INSTANCE_SWAP', findComp('Icon/grading').id); for (const c of set.children) c.findOne(n => n.name === 'Icon').componentPropertyReferences = { mainComponent: k };
  await entry(b, 'Icon tile', set.description, set); out.tile = set.id;
}
if (!findComp('Divider')) { const c = figma.createComponent(); c.name = 'Divider'; c.resize(338, 1); c.fills = paint('outline-variant'); c.description = 'Separator wierszy w liście, z wcięciem do początku tekstu.'; await entry(b, 'Divider', c.description, c); out.divider = c.id; }
fitSection(s, b);
await shot(b, { name: 'ds-atoms', scale: 0.55 });
return out;
