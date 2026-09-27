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
// #23 #24 #29 #31 + wiersze „cały dzień" w Planie
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
for (const { f, T } of screens()) { try {
  const main = f.children[1]; if (!main || main.name !== 'Main Content') continue;
  // wiersze „cały dzień" (widok dnia): ikona obok tekstu zamiast na nim
  for (const item of main.findAll(n => n.type === 'FRAME' && n.name === 'List Item' && n.parent.name.startsWith('List - Cały') && n.layoutMode === 'VERTICAL')) {
    const [ic, col] = item.children; if (!ic || !col) continue;
    item.layoutMode = 'HORIZONTAL'; item.itemSpacing = 5; item.counterAxisAlignItems = 'MIN';
    item.paddingTop = 5; item.paddingBottom = 5; item.paddingLeft = 8; item.paddingRight = 8;
    item.layoutSizingHorizontal = 'FILL'; item.layoutSizingVertical = 'HUG';
    ic.layoutSizingHorizontal = 'HUG'; ic.layoutSizingVertical = 'HUG';
    col.layoutGrow = 1;
    for (const c of col.children) { if (c.layoutMode === 'NONE') { c.layoutMode = 'VERTICAL'; } c.layoutSizingHorizontal = 'FILL'; c.layoutSizingVertical = 'HUG'; for (const t of texts(c)) { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; } }
    col.layoutSizingVertical = 'HUG';
    const list = item.parent; list.layoutSizingVertical = 'HUG'; bump('allday');
  }
  // #29 strzałki po lewej i prawej stronie daty
  const prev = main.findOne(n => n.name.startsWith('Button - Poprzedni')), next = main.findOne(n => n.name.startsWith('Button - Następny'));
  if (prev && next && prev.parent.name !== 'Date nav') {
    const bar = prev.parent, heading = bar.children.find(c => c.name === 'Heading 2');
    const nav = al('Date nav', 'HORIZONTAL', { itemSpacing: 2, counterAxisAlignItems: 'CENTER' });
    bar.insertChild(0, nav); nav.appendChild(prev); nav.appendChild(heading); nav.appendChild(next);
    heading.layoutSizingHorizontal = 'HUG'; for (const t of texts(heading)) t.textAutoResize = 'WIDTH_AND_HEIGHT';
    bar.primaryAxisAlignItems = 'SPACE_BETWEEN'; bar.layoutSizingHorizontal = 'FILL'; bump('datenav');
  }
  // #23 #24 wiadomości: nieprzeczytane wyróżnione, licznik na „Odebrane"
  if (/^07 /.test(f.name)) {
    const list = main.findOne(n => n.type === 'FRAME' && n.name === 'MsgList' && n.cornerRadius === 20);
    const rows = list ? list.children.filter(r => r.type === 'FRAME') : [];
    for (const [i, row] of rows.entries()) {
      const name = texts(row).find(t => t.fontSize === 17); if (!name) continue;
      if (i < 2) { const tw = name.parent; if (!tw.children.some(c => c.name === 'Unread')) { tw.layoutMode = 'HORIZONTAL'; tw.itemSpacing = 7; tw.counterAxisAlignItems = 'CENTER'; tw.primaryAxisAlignItems = 'MIN'; const dot = figma.createEllipse(); dot.name = 'Unread'; dot.resize(8, 8); dot.fills = solid(T.tint); tw.insertChild(0, dot); tw.layoutSizingVertical = 'HUG'; bump('unread'); } }
      else { name.fontName = { family: 'Inter', style: 'Regular' }; const topic = texts(row).find(t => t.fontSize === 15 && t !== name); bump('read'); }
    }
    const seg = texts(main).find(t => t.characters === 'Odebrane');
    if (seg && !seg.parent.children.some(c => c.name === 'Count')) {
      const b = seg.parent; b.layoutMode = 'HORIZONTAL'; b.itemSpacing = 6; b.primaryAxisAlignItems = 'CENTER'; b.counterAxisAlignItems = 'CENTER';
      const c = al('Count', 'HORIZONTAL', { cornerRadius: 999, paddingLeft: 6, paddingRight: 6, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
      c.fills = solid(T.badge); c.appendChild(mk('2', 'Bold', 11, T.onBadge)); c.counterAxisSizingMode = 'FIXED'; c.resize(c.width, 18); c.minWidth = 18;
      b.appendChild(c); bump('count');
    }
    for (const t of texts(main).filter(t => t.characters === 'Wszystkie wiadomości przeczytane.')) await setText(t, '2 nowe wiadomości.');
  }
  refit(f);
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
// #31 przyciemnienie tła pod listą dzieci
const d = sections[0].children.find(n => n.name.startsWith('02d')), src = sections[0].children.find(n => n.name.startsWith('02 '));
if (d && !d.children.some(c => c.name === 'Scrim')) { const s = src.children.find(c => c.name === 'Scrim').clone(); const menu = d.children.find(c => c.name === 'Kid menu'); d.insertChild(d.children.indexOf(menu), s); s.layoutPositioning = 'ABSOLUTE'; s.x = 0; s.y = 0; bump('scrim'); }
relayout();
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('15 '), { name: 'v-15', scale: 0.75 });
await shot(get('07 '), { name: 'v-07', scale: 0.75 });
await shot(d, { name: 'v-02d', scale: 0.6 });
return { log, errors };
