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
// #30 godziny lekcji w widoku miesiąca + poprawka nazwisk przy kropce nieprzeczytanej
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = []; let gridInfo = null;
const HOURS = ['7:45–12:20', '7:45–11:25', '7:45–12:20', '7:45–11:25', '7:45–11:25']; // pon.–pt., jak w widoku dnia i tygodnia
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main) continue;
  if (/^07 /.test(f.name)) for (const dot of main.findAll(n => n.name === 'Unread')) { const tw = dot.parent, name = texts(tw)[0]; tw.layoutSizingHorizontal = 'FILL'; name.layoutGrow = 1; name.textAutoResize = 'HEIGHT'; tw.counterAxisAlignItems = 'MIN'; dot.y = 0; const w = al('Dot', 'VERTICAL', { paddingTop: 8 }); tw.insertChild(0, w); w.appendChild(dot); bump('name-wrap'); }
  if (!/^17 /.test(f.name)) continue;
  const grid = main.findOne(n => n.name === 'MonthGrid');
  const cells = grid.children.filter(c => c.name.startsWith('Button - '));
  const chipSrc = grid.findOne(n => n.type === 'FRAME' && n.cornerRadius === 4);
  gridInfo = { layout: grid.layoutMode, rows: 'gridRowSizes' in grid ? JSON.stringify(grid.gridRowSizes) : 'n/a', cells: cells.length, first: cells[0].name };
  for (const [i, cell] of cells.entries()) {
    const wd = i % 7; if (wd > 4) continue;
    const m = cell.name.match(/^Button - (\d+) (\S+)/); if (!m) continue;
    const day = Number(m[1]), month = m[2];
    if (month.startsWith('sierp')) continue;               // przed początkiem roku szkolnego
    if (cell.children.some(c => c.name === 'Lessons')) continue;
    const chip = chipSrc.clone(); chip.name = 'Lessons';
    chip.fills = solid(T.tonal);
    const t = texts(chip)[0]; await setText(t, HOURS[wd]); t.fontSize = 9; t.fills = solid(T.onTonal); t.letterSpacing = { unit: 'PIXELS', value: -0.2 };
    chip.paddingLeft = 1; chip.paddingRight = 1; chip.primaryAxisAlignItems = 'CENTER'; chip.counterAxisAlignItems = 'CENTER';
    cell.insertChild(1, chip); chip.layoutSizingHorizontal = 'FILL';
    bump('lessons');
  }
  // komórki z trzema wpisami potrzebują wyższych wierszy
  if ('gridRowSizes' in grid) { try { grid.gridRowSizes = grid.gridRowSizes.map((r, i) => i === 0 ? r : { type: 'FIXED', value: 92 }); bump('rows'); } catch (e) { errors.push('rows: ' + e.message); } }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('17 '), { name: 'v-17', scale: 1 });
const m07 = get('07 '); await shot(m07.children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20).children[1], { name: 'v-07row', scale: 1 });
return { log, errors, gridInfo };
