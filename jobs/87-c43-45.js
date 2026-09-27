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
  main.layoutGrow = 0; main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
  if (f.height < 874) { f.primaryAxisSizingMode = 'FIXED'; f.resize(f.width, 874); main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; } // layoutGrow trzyma dolne menu przy dole
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
//# #43 #44 #45: chip „Nowe" zamiast kropki, bez „Otwórz w Librusie", bez ikony aparatu
const TONAL = { 'Jasny motyw': { bg: '#D3E3FD', fg: '#041E49' }, 'Ciemny motyw': { bg: '#0A3A86', fg: '#D3E3FD' } };
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T, s } of screens()) { try {
  const g = TONAL[s.name];
  // #45 plakietka aparatu
  for (const b of f.findAll(n => n.name === 'Avatar badge')) { b.remove(); bump('badge'); }
  // #44 przycisk „Otwórz w Librusie" w arkuszu ogłoszenia
  for (const t of texts(f).filter(t => t.characters === 'Otwórz w Librusie')) { let a = t; while (a && a.name !== 'Actions') a = a.parent; if (a) { const sheet = a.parent, body = sheet.findOne(n => n.name === 'Body'); a.remove(); body.paddingBottom = 28; const target = Math.round(874 * 0.64); body.layoutSizingVertical = 'HUG'; if (sheet.height > target) { body.layoutSizingVertical = 'FIXED'; body.resize(body.width, target - 44 - (sheet.findOne(n => n.name === 'Bar') ? 44 : 0)); } sheet.y = f.height - sheet.height; bump('librus'); } }
  // #43 kropka → chip „Nowe"
  for (const dot of f.findAll(n => n.name === 'Unread')) {
    let row = dot; while (row && !(row.type === 'FRAME' && texts(row).some(t => t.fontSize === 15 || t.fontSize === 13) && row.findOne(n => n.name === 'Chip' || n.name === 'Chips'))) row = row.parent;
    const chipSrc = f.findOne(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8);
    const wrap = dot.parent.name === 'Dot' ? dot.parent : dot; const holder = wrap.parent; wrap.remove();
    if (!chipSrc || !row) { bump('dot-removed'); continue; }
    const firstChip = row.findOne(n => n.type === 'FRAME' && n.name === 'Chip' && n.cornerRadius === 8); const chipRow = firstChip ? firstChip.parent : null;
    const chip = chipSrc.clone(); for (const ic of chip.findAll(isIcon)) (ic.parent !== chip && ic.parent.children.length === 1 ? ic.parent : ic).remove(); const mark = chip.children.find(c => c.name === 'error'); if (mark) mark.remove();
    chip.fills = solid(g.bg); const lab = texts(chip)[0]; await setText(lab, 'Nowe'); lab.fills = solid(g.fg); chip.paddingLeft = 9; chip.name = 'Chip';
    if (chipRow) chipRow.insertChild(0, chip); else { const col = holder.parent; const r = al('Chips', 'HORIZONTAL', { paddingTop: 7, itemSpacing: 6 }); r.appendChild(chip); col.appendChild(r); }
    bump('nowe');
  }
  for (const t of texts(f).filter(t => /, 1 nieprzeczytane$/.test(t.characters))) await setText(t, t.characters.replace(', 1 nieprzeczytane', ', 1 nowe'));
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f01 = get('01 '); const nh = texts(f01).find(t => t.characters === 'Ogłoszenia szkolne'); let secN = nh; while (secN.parent !== f01.children[1]) secN = secN.parent;
await shot(secN, { name: 'v-notices', scale: 0.8 });
await shot(get('07 ').children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20), { name: 'v-07list', scale: 0.5 });
await shot(get('02c'), { name: 'v-02c', scale: 0.5 });
await shot(f01.children[0], { name: 'v-hdr', scale: 1.5 });
return { log, errors };
