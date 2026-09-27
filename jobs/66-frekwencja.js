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
// #16 ekran Frekwencja (bez dolnej nawigacji) + wysokość siatki miesiąca
const errors = [];
for (const { f } of screens()) if (/^17 /.test(f.name)) { try {
  const grid = f.children[1].findOne(n => n.name === 'MonthGrid');
  const h = grid.gridRowSizes.reduce((s, r) => s + r.value, 0);
  grid.resize(grid.width, h);
  const wrap = grid.parent; if (wrap.layoutMode === 'NONE') wrap.resize(wrap.width, grid.y + h); else { try { wrap.layoutSizingVertical = 'FIXED'; wrap.resize(wrap.width, grid.y + h); } catch (e) {} }
  for (const t of texts(f).filter(t => t.characters.includes('Lekcje widać w widoku dnia'))) await setText(t, 'Zadania i wydarzenia pochodzą z danych Librusa.');
  refit(f);
} catch (e) { errors.push(f.name + ': ' + e.message); } }

const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
if (!get('02f')) {
  const after = get('02e'), src = get('06 ');
  for (const fr of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - after.y) < 2 && n.x > after.x)) fr.x += 522;
  const nf = src.clone(); light.appendChild(nf); nf.name = '02f Teraz · frekwencja'; nf.x = after.x + 522; nf.y = after.y;
}
if (!get('02f').findOne(n => n.name === 'Summary')) {
  const f = get('02f');
  const nav = f.children[f.children.length - 1]; if (nav.name.startsWith('Navigation')) nav.remove();
  const main = f.children[1]; [...main.children].forEach(c => c.remove());
  main.layoutMode = 'VERTICAL'; main.itemSpacing = 0; main.paddingLeft = 16; main.paddingRight = 16; main.paddingTop = 0; main.paddingBottom = 28;
  const add = n => { main.appendChild(n); n.layoutSizingHorizontal = 'FILL'; return n; };
  const backSrcText = texts(get('08 ').children[1]).find(t => t.characters === 'Wiadomości' && t.fontSize === 17);
  let back = backSrcText.parent; while (!(back.type === 'FRAME' && back.findOne(isIcon)) && back.parent) back = back.parent;
  const b = back.clone(); main.appendChild(b); await setText(b.findAllWithCriteria({ types: ['TEXT'] }).find(t => !isIcon(t)), 'Teraz');
  const title = al('Title', 'VERTICAL', { paddingTop: 4, paddingBottom: 12, paddingLeft: 4 }); title.appendChild(mk('Frekwencja', 'Extra Bold', 24, T.ink, 120)); add(title);
  const card = al('Summary', 'VERTICAL', { itemSpacing: 2, paddingTop: 18, paddingBottom: 18, paddingLeft: 20, paddingRight: 20, cornerRadius: 20 }); card.fills = solid(T.card);
  card.appendChild(mk('100%', 'Extra Bold', 40, T.ok, 110));
  card.appendChild(mk('Obecność na 55 z 55 lekcji', 'Semi Bold', 17, T.ink, 135));
  card.appendChild(mk('Wrzesień: 0 nieobecności, 0 spóźnień', 'Regular', 15, T.sec, 135));
  add(card);
  const h2 = al('Heading 2', 'VERTICAL', { paddingTop: 26, paddingBottom: 10, paddingLeft: 4 }); h2.appendChild(mk('Wrzesień', 'Bold', 20, T.ink, 120)); add(h2);
  const list = al('List', 'VERTICAL', { cornerRadius: 20, clipsContent: true }); list.fills = solid(T.card);
  const DAYS = [['czw. 17 wrz', '1–4', 4], ['śr. 16 wrz', '1–5', 5], ['wt. 15 wrz', '6–9', 4], ['pon. 14 wrz', '3–7', 5], ['pt. 11 wrz', '1–5', 5], ['czw. 10 wrz', '1–4', 4], ['śr. 9 wrz', '1–5', 5], ['wt. 8 wrz', '6–9', 4], ['pon. 7 wrz', '3–7', 5], ['pt. 4 wrz', '1–5', 5], ['czw. 3 wrz', '1–4', 4], ['śr. 2 wrz', '1–5', 5]];
  DAYS.forEach(([day, range, n], i) => {
    const r = al('Row', 'HORIZONTAL', { itemSpacing: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, counterAxisAlignItems: 'CENTER' });
    if (i) { r.strokes = solid(T.sep); r.strokeWeight = 1; r.strokeAlign = 'INSIDE'; r.strokeBottomWeight = 0; r.strokeLeftWeight = 0; r.strokeRightWeight = 0; r.strokeTopWeight = 1; }
    const col = al('Text', 'VERTICAL', { itemSpacing: 1 }); col.appendChild(mk(day, 'Semi Bold', 17, T.ink, 130)); col.appendChild(mk('Lekcje ' + range + ', obecność na wszystkich', 'Regular', 15, T.sec, 135));
    r.appendChild(col); col.layoutGrow = 1;
    const v = mk(n + ' z ' + n, 'Bold', 15, T.ok); r.appendChild(v);
    list.appendChild(r); r.layoutSizingHorizontal = 'FILL';
  });
  add(list);
  const foot = al('Foot', 'VERTICAL', { paddingTop: 12, paddingLeft: 4, paddingRight: 4 }); const ft = mk('Nieobecności i spóźnienia pojawią się na tej liście z nazwą rodzaju wpisu z Librusa.', 'Regular', 13, T.sec, 145); foot.appendChild(ft); add(foot); ft.layoutSizingHorizontal = 'FILL'; ft.textAutoResize = 'HEIGHT';
  main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
}
relayout();
await shot(get('02f'), { name: 'v-02f', scale: 0.7 });
const m = get('17 '); await shot(m.children[1].findOne(n => n.name === 'MonthGrid').parent, { name: 'v-17grid', scale: 0.6 });
return { errors };
