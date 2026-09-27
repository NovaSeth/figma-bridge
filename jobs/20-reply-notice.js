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
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; Object.assign(f, props || {}); return f; };
const iconSrc = byName('01 ').findAll(n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material')).find(n => n.characters === 'task_alt' && n.fontSize === 24);
await figma.loadFontAsync(iconSrc.fontName);
const icon = (chars, size, color) => { const t = iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const fill = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const placeSheet = (frame, sheet) => { sheet.y = frame.height - sheet.height; };
// Ekrany: okno odpowiedzi jak w poczcie + arkusz szczegółów ogłoszenia
const btnLabel = (btn, label) => { const t = texts(btn).find(x => !x.fontName.family.startsWith('Material')); t.characters = label; };
const dropIcon = btn => btn.findAll(n => n.type === 'TEXT' && n.fontName.family.startsWith('Material')).forEach(n => (n.parent !== btn && n.parent.children.length === 1 ? n.parent : n).remove());

// ---------- 02b odpowiedź ----------
const b = byName('02b');
let sheet = b.findOne(n => n.name === 'Bottom sheet'), body = sheet.findOne(n => n.name === 'Body'), actions = sheet.findOne(n => n.name === 'Actions');
if (!body.findOne(n => n.name === 'Reply field')) {
  const bar = sheet.findOne(n => n.name === 'Bar'); if (bar) bar.remove();
  [...body.children].forEach(c => c.remove());
  body.itemSpacing = 0;
  body.appendChild(mk('Odpowiedź', 'Extra Bold', 24, T.ink, 120));
  const field = (label, value, top) => {
    const r = al('Field ' + label, 'HORIZONTAL', { itemSpacing: 10, paddingTop: top, paddingBottom: 12, counterAxisAlignItems: 'MIN' });
    r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeTopWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeBottomWeight = 1;
    const l = mk(label, 'Regular', 15, T.sec, 140); r.appendChild(l); l.resize(56, l.height); l.textAutoResize = 'HEIGHT';
    const v = mk(value, 'Semi Bold', 16, T.ink, 140); r.appendChild(v); v.layoutGrow = 1; v.textAutoResize = 'HEIGHT';
    body.appendChild(r); fill(r);
  };
  field('Do', 'Joanna Osęka-Więcławicz (wychowawczyni)', 16);
  field('Temat', 'Re: Ćwiczenia', 12);
  const lab = al('Label', 'VERTICAL', { paddingTop: 16, paddingBottom: 6 }); lab.appendChild(mk('Twoja odpowiedź', 'Semi Bold', 14, T.ink, 140)); body.appendChild(lab); fill(lab);
  const ta = al('Reply field', 'VERTICAL', { paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14, cornerRadius: 14 });
  ta.fills = solid(T.bg); ta.strokes = solid(T.tint); ta.strokeWeight = 2; ta.strokeAlign = 'INSIDE';
  ta.appendChild(mk('Napisz odpowiedź', 'Regular', 16, T.sec, 150));
  body.appendChild(ta); fill(ta); ta.layoutSizingVertical = 'FIXED'; ta.resize(ta.width, 148);
  const gap = al('Gap', 'VERTICAL', { paddingTop: 16 }); body.appendChild(gap); fill(gap);
  const q = al('Quote', 'VERTICAL', { itemSpacing: 6, paddingTop: 14, paddingBottom: 14, paddingLeft: 16, paddingRight: 16, cornerRadius: 14 });
  q.fills = solid(T.bg);
  q.appendChild(mk('Joanna Osęka-Więcławicz, dziś, 15:13:', 'Semi Bold', 13, T.sec, 140));
  const qt = mk('Dzień dobry, od dwóch dni Julia nie ma małych zielonych ćwiczeń. Proszę dopilnować, aby trafiły do plecaka.\n\nPozdrawiam', 'Regular', 15, T.sec, 150);
  q.appendChild(qt); body.appendChild(q); fill(q); fill(qt); qt.textAutoResize = 'HEIGHT';
  const [primary, second] = actions.children;
  btnLabel(primary, 'Wyślij');
  if (primary.layoutMode === 'NONE') primary.layoutMode = 'HORIZONTAL';
  primary.itemSpacing = 6; primary.primaryAxisAlignItems = 'CENTER'; primary.counterAxisAlignItems = 'CENTER';
  primary.insertChild(0, icon('send', 20, '#FFFFFF'));
  dropIcon(second); btnLabel(second, 'Anuluj');
  body.layoutSizingVertical = 'FIXED';
  body.resize(body.width, 874 - 52 - 44 - actions.height);
  placeSheet(b, sheet);
}
await shot(b, { name: 's-02b', scale: 1 });

// ---------- 02c ogłoszenie ----------
const c = byName('02c');
sheet = c.findOne(n => n.name === 'Bottom sheet'); body = sheet.findOne(n => n.name === 'Body'); actions = sheet.findOne(n => n.name === 'Actions');
if (!texts(body).some(t => t.characters === 'Sprzątanie Świata')) {
  texts(sheet.findOne(n => n.name === 'Bar'))[0].characters = 'Ogłoszenie szkolne';
  const kids = [...body.children];
  const chipRow = kids[0];
  const chipTexts = texts(chipRow).filter(t => !t.fontName.family.startsWith('Material'));
  chipTexts[0].characters = 'dziś'; chipTexts[1].characters = 'Widoczne 13 do 20 września';
  kids.slice(1).forEach(k => k.remove());
  body.appendChild(mk('Sprzątanie Świata', 'Extra Bold', 24, T.ink, 120));
  body.appendChild(mk('Koordynatorzy szkolni: A. Juszczyk, I. Ignaczak', 'Regular', 15, T.sec, 135));
  const full = 'Szanowni Uczniowie, Rodzice i Nauczyciele!\n18 września 2026 r. (piątek) nasza Szkoła bierze udział w akcji „Sprzątanie świata-Polska" pod hasłem: „SOS dla wody! Niech będzie wolna od śmieci". Uczniowie zaopatrzeni w worki i rękawiczki wraz z Nauczycielami będą porządkowali teren w pobliżu Szkoły.\n\nSzczegółowe informacje na temat akcji znajdują się na stronie fundacji „Nasza Ziemia" https://www.naszaziemia.pl/ oraz na stronie akcji https://sprzatanieswiata.pl/\n\nZachęcamy również do zapoznania się ze stroną dotyczącą segregacji odpadów:\nhttps://raszyn.pl/dla-mieszkanca/gospodarka-odpadami/jak-segregowac-odpady';
  const ft = mk(full, 'Regular', 17, T.ink, 155);
  body.appendChild(ft); fill(ft); ft.textAutoResize = 'HEIGHT';
  for (const m of full.matchAll(/https?:\/\/\S+/g)) ft.setRangeFills(m.index, m.index + m[0].length, solid(T.tint));
  const [primary, second] = actions.children;
  primary.remove(); dropIcon(second); btnLabel(second, 'Otwórz w Librusie');
  const MAX = Math.round(874 * 0.64);
  body.layoutSizingVertical = 'FIXED';
  body.resize(body.width, MAX - 44 - 44 - actions.height);
  placeSheet(c, sheet);
}
await shot(c, { name: 's-02c', scale: 1 });
return { ok: true };
