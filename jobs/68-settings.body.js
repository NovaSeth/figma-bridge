// Ekran Ustawienia (bez dolnej nawigacji), otwierany ikoną w nagłówku
const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
if (!get('02g')) {
  const after = get('02f');
  for (const fr of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - after.y) < 2 && n.x > after.x)) fr.x += 522;
  const nf = after.clone(); light.appendChild(nf); nf.name = '02g Teraz · ustawienia'; nf.x = after.x + 522; nf.y = after.y;
}
const f = get('02g'), main = f.children[1];
if (!main.findOne(n => n.name === 'Settings')) {
  const keep = main.children[0]; // przycisk „← Teraz"
  main.children.slice(1).forEach(c => c.remove());
  const add = n => { main.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; };
  const title = al('Title', 'VERTICAL', { paddingTop: 4, paddingBottom: 12, paddingLeft: 4 }); title.appendChild(mk('Ustawienia', 'Extra Bold', 24, T.ink, 120)); add(title);
  const marker = al('Settings', 'VERTICAL'); add(marker);
  const topStroke = r => { r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeTopWeight = 1; };
  const sq = (name, color) => { const s = al('Icon', 'HORIZONTAL', { cornerRadius: 9, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); s.primaryAxisSizingMode = 'FIXED'; s.counterAxisSizingMode = 'FIXED'; s.resize(32, 32); s.fills = solid(color); s.appendChild(icon(name, 20, '#FFFFFF')); return s; };
  const toggle = on => { const t = al('Switch', 'HORIZONTAL', { cornerRadius: 999, paddingLeft: 2, paddingRight: 2, counterAxisAlignItems: 'CENTER', primaryAxisAlignItems: on ? 'MAX' : 'MIN' }); t.primaryAxisSizingMode = 'FIXED'; t.counterAxisSizingMode = 'FIXED'; t.resize(51, 31); t.fills = solid(on ? T.tint : T.ring, on ? 1 : 0.45); const k = figma.createEllipse(); k.resize(27, 27); k.fills = solid('#FFFFFF'); t.appendChild(k); return t; };
  const group = (label, rows) => {
    const h = al('Heading 2', 'VERTICAL', { paddingTop: 24, paddingBottom: 10, paddingLeft: 4 }); h.appendChild(mk(label, 'Bold', 20, T.ink, 120)); add(h);
    const list = al('List', 'VERTICAL', { cornerRadius: 20, clipsContent: true }); list.fills = solid(T.card);
    rows.forEach((row, i) => {
      const r = al('Row', 'HORIZONTAL', { itemSpacing: 12, paddingTop: 11, paddingBottom: 11, paddingLeft: 16, paddingRight: 14, counterAxisAlignItems: 'CENTER' }); r.minHeight = 56;
      if (i) topStroke(r);
      if (row.icon) r.appendChild(sq(row.icon, row.color));
      const col = al('Text', 'VERTICAL', { itemSpacing: 1 }); col.appendChild(mk(row.title, 'Semi Bold', 17, row.tint ? T.tint : T.ink, 130)); if (row.sub) { const s = mk(row.sub, 'Regular', 15, T.sec, 135); col.appendChild(s); }
      r.appendChild(col); col.layoutGrow = 1;
      if (row.value) r.appendChild(mk(row.value, 'Regular', 16, T.sec));
      if (row.toggle != null) r.appendChild(toggle(row.toggle));
      if (row.chevron) r.appendChild(icon('chevron_right', 24, T.sec));
      list.appendChild(r); r.layoutSizingHorizontal = 'FILL';
      for (const t of texts(col)) { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; }
    });
    add(list); return list;
  };
  group('Konto', [
    { icon: 'person', color: T.tint, title: 'Konto Librus', sub: 'Zalogowano jako Michał', chevron: true },
    { icon: 'face', color: '#B85C00', title: 'Dzieci i zdjęcia', value: 'Julia', chevron: true },
  ]);
  group('Powiadomienia', [
    { title: 'Nowe wiadomości', toggle: true },
    { title: 'Zadania z terminem na jutro', toggle: true },
    { title: 'Ogłoszenia szkolne', sub: 'Tylko dotyczące klasy dziecka', toggle: false },
  ]);
  const hv = al('Heading 2', 'VERTICAL', { paddingTop: 24, paddingBottom: 10, paddingLeft: 4 }); hv.appendChild(mk('Wygląd', 'Bold', 20, T.ink, 120)); add(hv);
  const seg = al('Segmented', 'HORIZONTAL', { itemSpacing: 2, paddingTop: 2, paddingBottom: 2, paddingLeft: 2, paddingRight: 2, cornerRadius: 12 }); seg.fills = solid(T.chip);
  ['Systemowy', 'Jasny', 'Ciemny'].forEach((l, i) => { const b = al('Button', 'HORIZONTAL', { cornerRadius: 10, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' }); b.counterAxisSizingMode = 'FIXED'; b.resize(100, 44); if (!i) b.fills = solid(T.card); b.appendChild(mk(l, i ? 'Semi Bold' : 'Bold', 14, i ? T.sec : T.ink)); seg.appendChild(b); b.layoutGrow = 1; });
  add(seg);
  group('Dane', [
    { title: 'Ostatnie odświeżenie', value: '18.09.2026, 15:20' },
    { title: 'Odśwież teraz', tint: true },
  ]);
  const foot = al('Foot', 'VERTICAL', { paddingTop: 14, paddingLeft: 4, paddingRight: 4 }); const ft = mk('FLibrus 1.0.0, prywatny klient Librusa. Dane logowania są szyfrowane.', 'Regular', 13, T.sec, 145); foot.appendChild(ft); add(foot); ft.layoutSizingHorizontal = 'FILL'; ft.textAutoResize = 'HEIGHT';
  main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; }
}
relayout();
await shot(f, { name: 'v-02g', scale: 0.7 });
return { h: Math.round(f.height) };
