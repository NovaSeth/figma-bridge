const THEMES = {
  'Jasny motyw': { dark: false, bg: '#F2F2F7', card: '#FFFFFF', ink: '#111113', sec: '#5F6368', sep: '#E3E3E8', ring: '#80868B', tint: '#0B57D0', onTint: '#FFFFFF', tonal: '#D3E3FD', onTonal: '#041E49', chip: '#EDEDF2', due: '#8A4200', dueBg: '#FFE8CF', cta: '#000000', onCta: '#FFFFFF', badge: '#C5221F', onBadge: '#FFFFFF', ok: '#137333' },
  'Ciemny motyw': { dark: true, bg: '#000000', card: '#1C1C1E', ink: '#FFFFFF', sec: '#A8A8AE', sep: '#38383A', ring: '#8E8E93', tint: '#8AB4F8', onTint: '#062E6F', tonal: '#0A3A86', onTonal: '#D3E3FD', chip: '#2C2C2E', due: '#FFC78A', dueBg: '#4A2A00', cta: '#FFFFFF', onCta: '#000000', badge: '#F28B82', onBadge: '#000000', ok: '#81C995' },
};
const hex = h => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const solid = (h, opacity) => [opacity == null ? { type: 'SOLID', color: hex(h) } : { type: 'SOLID', color: hex(h), opacity }];
const texts = n => n.findAllWithCriteria({ types: ['TEXT'] });
const isIcon = n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material');
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const sections = page.children.filter(n => n.type === 'SECTION' && THEMES[n.name]);
const screens = () => sections.flatMap(s => s.children.filter(n => n.type === 'FRAME').map(f => ({ f, T: THEMES[s.name], s })));
const mk = (chars, style, size, color, lh) => { const t = figma.createText(); t.fontName = { family: 'Inter', style }; t.fontSize = size; if (lh) t.lineHeight = { unit: 'PERCENT', value: lh }; t.characters = chars; t.fills = solid(color); return t; };
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; Object.assign(f, props || {}); return f; };
let _iconSrc = null;
for (const { f } of screens()) { _iconSrc = f.findAll(isIcon).find(n => n.characters === 'task_alt' && n.fontSize === 24 && !f.name.includes('Zadania')); if (_iconSrc) break; }
await figma.loadFontAsync(_iconSrc.fontName);
const icon = (chars, size, color) => { const t = _iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const setText = async (t, chars) => { if (t.fontName !== figma.mixed) await figma.loadFontAsync(t.fontName); t.characters = chars; };
const OVERLAYS = ['Scrim', 'Bottom sheet', 'Kid menu'];
// Po zmianie treści: ramka obejmuje treść (min. 874), elementy pływające (np. „Napisz") jadą razem z dołem.
const refit = f => {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') return;
  if (f.children.some(c => OVERLAYS.includes(c.name))) return; // ekrany o wysokości telefonu
  const h0 = f.height;
  main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; }
  const d = f.height - h0;
  if (d) for (const c of f.children) if (c.layoutPositioning === 'ABSOLUTE') c.y += d;
};
const relayout = () => { for (const section of sections) {
  const PAD = 160, LABEL_H = 120, ROW_GAP = 280;
  const frames = section.children.filter(n => n.type === 'FRAME'), labels = section.children.filter(n => n.type === 'TEXT').sort((a, b) => a.y - b.y);
  let y = PAD, right = 0;
  for (const label of labels) { const row = frames.filter(f => Math.abs(f.y - (label.y + LABEL_H)) < 2); label.y = y; y += LABEL_H; let h = 0; for (const f of row) { f.y = y; h = Math.max(h, f.height); right = Math.max(right, f.x + f.width); } y += h + ROW_GAP; }
  section.resizeWithoutConstraints(Math.max(section.width, right + PAD), y - ROW_GAP + PAD);
} };
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
