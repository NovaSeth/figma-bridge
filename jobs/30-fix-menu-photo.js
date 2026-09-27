const T = { bg: '#F2F2F7', card: '#FFFFFF', ink: '#111113', sec: '#5F6368', sep: '#E3E3E8', ring: '#80868B', tint: '#0B57D0', tonal: '#D3E3FD', onTonal: '#041E49', chip: '#EDEDF2' };
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = (h, opacity) => [opacity == null ? { type: 'SOLID', color: hex(h) } : { type: 'SOLID', color: hex(h), opacity }];
const texts = n => n.findAllWithCriteria({ types: ['TEXT'] });
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const light = page.children.find(n => n.type === 'SECTION' && n.name === 'Jasny motyw');
const byName = prefix => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(prefix));
const mk = (chars, style, size, color, lh) => { const t = figma.createText(); t.fontName = { family: 'Inter', style }; t.fontSize = size; if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }; t.characters = chars; t.fills = solid(color); return t; };
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; Object.assign(f, props || {}); return f; };
const iconSrc = byName('01 ').findAll(n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material')).find(n => n.characters === 'task_alt' && n.fontSize === 24);
await figma.loadFontAsync(iconSrc.fontName);
const icon = (chars, size, color) => { const t = iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const fill = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const placeSheet = (frame, sheet) => { sheet.y = frame.height - sheet.height; };
// Szlif arkuszy + ekrany: wybór dziecka i zdjęcie dziecka
const fitSheet = (frame, fullHeight) => {
  const sheet = frame.findOne(n => n.name === 'Bottom sheet'); if (!sheet) return;
  const body = sheet.findOne(n => n.name === 'Body'), actions = sheet.findOne(n => n.name === 'Actions'), bar = sheet.findOne(n => n.name === 'Bar');
  if (actions) for (const b of actions.children) { b.layoutSizingVertical = 'FIXED'; b.resize(b.width, 48); }
  if (actions) actions.counterAxisSizingMode = 'AUTO';
  const target = fullHeight ? 874 - 52 : Math.round(874 * 0.64);
  const rest = 44 + (bar ? bar.height : 0) + (actions ? actions.height : 0);
  body.layoutSizingVertical = 'HUG';
  if (fullHeight || sheet.height > target) { body.layoutSizingVertical = 'FIXED'; body.resize(body.width, target - rest); }
  sheet.y = frame.height - sheet.height;
};
const b = byName('02b');
for (const n of b.findAll(x => x.name.startsWith('Field '))) { n.counterAxisSizingMode = 'AUTO'; n.layoutSizingHorizontal = 'FILL'; }
const gap = b.findOne(x => x.name === 'Gap'); if (gap) { gap.primaryAxisSizingMode = 'AUTO'; gap.layoutSizingHorizontal = 'FILL'; }
const lab = b.findOne(x => x.name === 'Label'); if (lab) { lab.primaryAxisSizingMode = 'AUTO'; lab.layoutSizingHorizontal = 'FILL'; }
fitSheet(byName('02 '), false); fitSheet(byName('02a'), true); fitSheet(b, true); fitSheet(byName('02c'), false);

// ---------- 02d wybór dziecka: lista rozwija się spod imienia ----------
const d = byName('02d');
if (!d.findOne(n => n.name === 'Kid menu')) {
  const main = d.children[1];
  main.clipsContent = true; d.clipsContent = true;
  d.primaryAxisSizingMode = 'FIXED'; d.resize(d.width, 874); main.layoutSizingVertical = 'FILL';
  const chev = d.children[0].findOne(n => n.name === 'expand_more'); if (chev) { chev.characters = 'expand_less'; chev.name = 'expand_less'; }
  const menu = al('Kid menu', 'VERTICAL', { cornerRadius: 20, clipsContent: true });
  menu.fills = solid(T.card);
  menu.effects = [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.22 }, offset: { x: 0, y: 12 }, radius: 32, spread: 0, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: 0, y: 1 }, radius: 2, spread: 0, visible: true, blendMode: 'NORMAL' },
  ];
  const row = (initial, name, sub, current, top) => {
    const r = al('Row ' + name, 'HORIZONTAL', { itemSpacing: 12, paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16, counterAxisAlignItems: 'CENTER' });
    if (top) { r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeTopWeight = 1; }
    const av = al('Avatar', 'HORIZONTAL', { cornerRadius: 22, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
    av.primaryAxisSizingMode = 'FIXED'; av.counterAxisSizingMode = 'FIXED'; av.resize(44, 44);
    av.fills = solid(current ? T.tonal : T.chip); av.appendChild(mk(initial, 'Extra Bold', 20, current ? T.onTonal : T.sec));
    r.appendChild(av);
    const col = al('Text', 'VERTICAL', { itemSpacing: 1 });
    col.appendChild(mk(name, 'Semi Bold', 17, T.ink, 130));
    const s = mk(sub, 'Regular', 15, T.sec, 135); col.appendChild(s);
    r.appendChild(col); col.layoutGrow = 1; s.layoutSizingHorizontal = 'FILL'; s.textAutoResize = 'HEIGHT';
    if (current) r.appendChild(icon('check', 24, T.tint));
    menu.appendChild(r); fill(r);
  };
  row('J', 'Julia', 'klasa 1, SP Łady', true, false);
  row('+', 'Drugie dziecko', 'Przykład: pojawi się, gdy konto rodzica ma więcej dzieci', false, true);
  const note = al('Note', 'VERTICAL', { paddingTop: 11, paddingBottom: 13, paddingLeft: 16, paddingRight: 16 });
  note.strokes = solid(T.sep); note.strokeWeight = 1; note.strokeAlign = 'INSIDE'; note.strokeBottomWeight = 0; note.strokeLeftWeight = 0; note.strokeRightWeight = 0; note.strokeTopWeight = 1;
  const nt = mk('Lista dzieci pochodzi z konta rodzica w Librusie.', 'Regular', 13, T.sec, 145);
  note.appendChild(nt); menu.appendChild(note); fill(note); fill(nt); nt.textAutoResize = 'HEIGHT';
  d.appendChild(menu);
  menu.layoutPositioning = 'ABSOLUTE';
  menu.counterAxisSizingMode = 'FIXED'; menu.resize(370, menu.height); menu.primaryAxisSizingMode = 'AUTO';
  menu.x = 16; menu.y = Math.round(d.children[0].height) + 6;
}
await shot(d, { name: 's-02d', scale: 1 });

// ---------- 02e zdjęcie dziecka ----------
const e = byName('02e');
const sheet = e.findOne(n => n.name === 'Bottom sheet'), body = sheet.findOne(n => n.name === 'Body');
if (!body.findOne(n => n.name === 'Photo hero')) {
  texts(sheet.findOne(n => n.name === 'Bar'))[0].characters = 'Zdjęcie dziecka';
  [...body.children].forEach(c => c.remove());
  const act = sheet.findOne(n => n.name === 'Actions'); if (act) act.remove();
  body.itemSpacing = 0;
  const hero = al('Photo hero', 'HORIZONTAL', { itemSpacing: 16, counterAxisAlignItems: 'CENTER', paddingBottom: 18 });
  const av = al('Avatar', 'HORIZONTAL', { cornerRadius: 36, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  av.primaryAxisSizingMode = 'FIXED'; av.counterAxisSizingMode = 'FIXED'; av.resize(72, 72); av.fills = solid(T.tonal);
  av.appendChild(mk('J', 'Extra Bold', 32, T.onTonal)); hero.appendChild(av);
  const col = al('Text', 'VERTICAL', { itemSpacing: 3 });
  col.appendChild(mk('Julia', 'Extra Bold', 24, T.ink, 120));
  const meta = mk('W Librusie nie ma zdjęcia, dlatego widzisz inicjał', 'Regular', 15, T.sec, 135);
  col.appendChild(meta); hero.appendChild(col); col.layoutGrow = 1; meta.layoutSizingHorizontal = 'FILL'; meta.textAutoResize = 'HEIGHT';
  body.appendChild(hero); fill(hero);
  const list = al('List', 'VERTICAL', { cornerRadius: 20, clipsContent: true }); list.fills = solid(T.bg);
  ['Wybierz zdjęcie z telefonu', 'Zrób zdjęcie'].forEach((label, i) => {
    const r = al('Option', 'HORIZONTAL', { paddingLeft: 16, paddingRight: 12, counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: 'SPACE_BETWEEN' });
    if (i) { r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeTopWeight = 1; }
    r.appendChild(mk(label, 'Semi Bold', 17, T.ink, 130)); r.appendChild(icon('chevron_right', 24, T.sec));
    list.appendChild(r); fill(r); r.counterAxisSizingMode = 'FIXED'; r.resize(r.width, 52);
  });
  body.appendChild(list); fill(list);
  const foot = al('Foot', 'VERTICAL', { paddingTop: 12, paddingLeft: 4, paddingRight: 4 });
  const ft = mk('Gdy Librus udostępni zdjęcie dziecka, pokażemy je tutaj automatycznie. Własne zdjęcie zostaje tylko w FLibrusie na tym telefonie.', 'Regular', 13, T.sec, 145);
  foot.appendChild(ft); body.appendChild(foot); fill(foot); fill(ft); ft.textAutoResize = 'HEIGHT';
  body.paddingBottom = 28;
}
fitSheet(e, false);
await shot(e, { name: 's-02e', scale: 1 });
await shot(b, { name: 's-02b', scale: 1 });
return { ok: true };
