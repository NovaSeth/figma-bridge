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
