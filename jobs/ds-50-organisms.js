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
//# DS P3: organizmy
const { s, b } = await board('Organizmy', 4900);
const out = {}; const grow = n => { n.layoutGrow = 1; return n; };
const border = (n, side) => { n.strokes = paint('outline-variant'); n.strokeWeight = 1; n.strokeAlign = 'INSIDE'; n.strokeTopWeight = side === 'top' ? 1 : 0; n.strokeBottomWeight = side === 'bottom' ? 1 : 0; n.strokeLeftWeight = 0; n.strokeRightWeight = 0; };
if (!findComp('App header')) {
  const c = comp('App header', 'HORIZONTAL', { gap: 'md', pad: ['md', 'xl'], fill: 'background', counterAxisAlignItems: 'CENTER' }); fixedW(c, 402); border(c, 'bottom'); c.paddingTop = 14;
  const av = inst('Avatar', 'Size=44'); av.name = 'Avatar'; c.appendChild(av);
  const col = box('Child', 'VERTICAL', { gap: '2xs' }); c.appendChild(col); grow(col);
  const nr = box('Name', 'HORIZONTAL', { gap: '2xs', counterAxisAlignItems: 'CENTER' }); col.appendChild(nr); const name = await txt('Julia', 'headline-lg'); name.name = 'Name text'; nr.appendChild(name); nr.appendChild(iconInst('expand_more', 28, 'on-surface-variant'));
  const cls = await txt('klasa 1, SP Łady', 'body-sm', 'on-surface-variant'); cls.name = 'Class'; col.appendChild(cls);
  const set = box('Button - Ustawienia', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); set.primaryAxisSizingMode = 'FIXED'; set.counterAxisSizingMode = 'FIXED'; set.resize(44, 44); set.appendChild(iconInst('settings', 28, 'on-surface-variant')); c.appendChild(set);
  const badge = box('Photo badge', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', fill: 'surface' }); badge.primaryAxisSizingMode = 'FIXED'; badge.counterAxisSizingMode = 'FIXED'; badge.resize(22, 22); radius(badge, 'full'); badge.strokes = paint('outline-variant'); badge.strokeWeight = 1.5; badge.strokeAlign = 'OUTSIDE'; badge.appendChild(iconInst('add_a_photo', 14, 'on-surface')); c.appendChild(badge); badge.layoutPositioning = 'ABSOLUTE'; badge.x = 20 + 44 - 17; badge.y = 14 + 44 - 17;
  const k1 = c.addComponentProperty('Imię', 'TEXT', 'Julia'), k2 = c.addComponentProperty('Klasa', 'TEXT', 'klasa 1, SP Łady'); name.componentPropertyReferences = { characters: k1 }; cls.componentPropertyReferences = { characters: k2 };
  c.description = 'Stały nagłówek zakładek. Awatar otwiera arkusz zdjęcia, imię ze strzałką otwiera listę dzieci (z przyciemnieniem tła), ikona otwiera Ustawienia. Bez daty, bez stempla danych, bez ikony odświeżania: odświeża się przeciągnięciem listy w dół.';
  await entry(b, 'App header', c.description, c); out.header = c.id;
}
if (!findComp('Tab bar')) {
  const c = comp('Tab bar', 'HORIZONTAL', { pad: ['xs', 'xs'], fill: 'surface-bar' }); fixedW(c, 402); border(c, 'top');
  for (const [i, [label, ic]] of [['Teraz', 'home'], ['Zadania', 'task_alt'], ['Oceny', 'grading'], ['Wiadomości', 'mail'], ['Plan', 'calendar_month']].entries()) { const t = inst('Tab item', i ? 'Active=False' : 'Active=True'); setProp(t, 'Etykieta', label); setProp(t, 'Ikona ↔', findComp('Icon/' + ic).id); c.appendChild(t); grow(t); }
  c.description = 'Dolna nawigacja: 5 zakładek, zawsze przyklejona do dołu ekranu, także gdy treść jest krótka. Ekrany przykrywające (Ustawienia, Frekwencja) i arkusze jej nie pokazują.';
  await entry(b, 'Tab bar', c.description, c); out.tabbar = c.id;
}
progress(0.4, 'Bottom sheet');
if (!findComp('Bottom sheet')) {
  const c = comp('Bottom sheet', 'VERTICAL', { fill: 'surface' }); fixedW(c, 402); c.topLeftRadius = 24; c.topRightRadius = 24; c.setBoundVariable('topLeftRadius', V('radius/2xl')); c.setBoundVariable('topRightRadius', V('radius/2xl')); c.clipsContent = true;
  const grab = box('Grabber', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); grab.counterAxisSizingMode = 'FIXED'; grab.resize(402, 44); const pill = figma.createFrame(); pill.resize(36, 5); radius(pill, 'full'); pill.fills = paint('outline'); grab.appendChild(pill); c.appendChild(grab); fillW(grab);
  const body = box('Body', 'VERTICAL', { gap: 'sm' }); body.paddingLeft = body.paddingRight = 20; body.paddingBottom = 20; c.appendChild(body); fillW(body);
  const kick = await txt('Wiadomość', 'label-md', 'on-surface-variant'); kick.name = 'Kicker'; body.appendChild(kick);
  const chips = box('Chips', 'HORIZONTAL', { gap: 'xs' }); body.appendChild(chips); const c1 = inst('Chip', 'Tone=Neutral'); setProp(c1, 'Label', 'dziś 15:13'); chips.appendChild(c1); const c2 = inst('Chip', 'Tone=Neutral'); setProp(c2, 'Label', 'Wychowawczyni'); setProp(c2, 'Ikona', false); chips.appendChild(c2);
  const title = await txt('Ćwiczenia', 'headline-md'); title.name = 'Title'; body.appendChild(title);
  const meta = await txt('Joanna Osęka-Więcławicz', 'body-sm', 'on-surface-variant'); meta.name = 'Meta'; body.appendChild(meta);
  const text = await txt('Dzień dobry, od dwóch dni Julia nie ma małych zielonych ćwiczeń. Proszę dopilnować, aby trafiły do plecaka.', 'body-lg'); text.name = 'Text'; body.appendChild(text); fillW(text); text.textAutoResize = 'HEIGHT';
  const act = box('Actions', 'HORIZONTAL', { gap: 'sm', pad: ['md', 'xl'], fill: 'surface' }); border(act, 'top'); c.appendChild(act); fillW(act);
  const p = inst('Button', 'Style=Primary'); setProp(p, 'Label', 'Ogarnięte'); act.appendChild(p); grow(p); const r = inst('Button', 'Style=Secondary'); setProp(r, 'Label', 'Odpowiedz'); setProp(r, 'Ikona', true); act.appendChild(r);
  const k = { k: c.addComponentProperty('Nadtytuł', 'TEXT', 'Wiadomość'), t: c.addComponentProperty('Tytuł', 'TEXT', 'Ćwiczenia'), m: c.addComponentProperty('Meta', 'TEXT', 'Joanna Osęka-Więcławicz'), a: c.addComponentProperty('Akcje', 'BOOLEAN', true) };
  kick.componentPropertyReferences = { characters: k.k }; title.componentPropertyReferences = { characters: k.t }; meta.componentPropertyReferences = { characters: k.m }; act.componentPropertyReferences = { visible: k.a };
  c.description = 'Arkusz szczegółów (sprawa, ogłoszenie, zdjęcie, nowe zajęcia). Otwiera się na 64% wysokości nad przyciemnieniem 42%, przewinięcie treści rozwija go na pełny ekran. Bez przycisku „Zamknij": zamyka gest w dół lub tap w tło. Przyciski 44 px. Rola nadawcy jako chip.';
  await entry(b, 'Bottom sheet', c.description, c); out.sheet = c.id;
}
if (!findComp('Child menu')) {
  const c = comp('Child menu', 'VERTICAL', { fill: 'surface', radius: 'xl' }); fixedW(c, 370); c.clipsContent = true; await c.setEffectStyleIdAsync(ES('elevation/menu').id);
  for (const [i, [n, sub, cur]] of [['Julia', 'klasa 1, SP Łady', true], ['Drugie dziecko', 'klasa 4, SP Łady', false]].entries()) { const r = box('Row', 'HORIZONTAL', { gap: 'md', pad: ['md', 'lg'], counterAxisAlignItems: 'CENTER' }); if (i) border(r, 'top'); c.appendChild(r); fillW(r);
    const a = inst('Avatar', 'Size=44'); setProp(a, 'Inicjał', n[0]); r.appendChild(a); const col = box('Text', 'VERTICAL', { gap: '2xs' }); r.appendChild(col); grow(col); col.appendChild(await txt(n, 'title-md')); col.appendChild(await txt(sub, 'body-sm', 'on-surface-variant')); if (cur) r.appendChild(iconInst('check', 24, 'primary')); }
  const note = box('Note', 'VERTICAL', { pad: ['md', 'lg'] }); border(note, 'top'); c.appendChild(note); fillW(note); note.appendChild(await txt('Lista dzieci pochodzi z konta rodzica w Librusie.', 'caption', 'on-surface-variant'));
  c.description = 'Lista dzieci rozwijana spod imienia w nagłówku. Pływa nad treścią (elevation/menu), tło jest przyciemnione jak pod arkuszem dolnym.';
  await entry(b, 'Child menu', c.description, c); out.menu = c.id;
}
if (!findComp('Cover top bar')) {
  const c = comp('Cover top bar', 'HORIZONTAL', { primaryAxisAlignItems: 'SPACE_BETWEEN', counterAxisAlignItems: 'CENTER', pad: ['md', 'xl'] }); fixedW(c, 402);
  const t = await txt('Ustawienia', 'headline-lg'); t.name = 'Title'; c.appendChild(t);
  const x = box('Button - Zamknij', 'HORIZONTAL', { primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER', fill: 'neutral-container' }); x.primaryAxisSizingMode = 'FIXED'; x.counterAxisSizingMode = 'FIXED'; x.resize(44, 44); radius(x, 'full'); x.appendChild(iconInst('close', 24, 'on-surface')); c.appendChild(x);
  const k = c.addComponentProperty('Tytuł', 'TEXT', 'Ustawienia'); t.componentPropertyReferences = { characters: k };
  c.description = 'Pasek ekranu przykrywającego (Ustawienia, Frekwencja): zakrywa nagłówek aplikacji i dolną nawigację, jedyna kontrolka wyjścia to „X".';
  await entry(b, 'Cover top bar', c.description, c); out.cover = c.id;
}
fitSection(s, b);
await shot(b, { name: 'ds-organisms', scale: 0.5 });
return out;
