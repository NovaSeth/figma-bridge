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
//# #38: szewrony zawsze na środku wiersza
const log = {}; const bump = k => { log[k] = (log[k] || 0) + 1; }; const errors = [];
const inside = (n, name) => { for (let p = n.parent; p; p = p.parent) if (p.name === name || (p.name || '').startsWith(name)) return true; return false; };
for (const { f, T } of screens()) { try {
  const icons = f.findAll(n => isIcon(n) && ['chevron_right', 'expand_more'].includes(n.characters));
  for (const t of icons) {
    if (t.removed || t.parent.name === 'Chevron' || inside(t, 'Header') || inside(t, 'Date nav') || inside(t, 'Button - ')) continue;
    let row = t.parent; while (row && !(row.type === 'FRAME' && row.layoutMode === 'HORIZONTAL' && row.itemSpacing === 12)) row = row.parent;
    if (!row || row.children.some(c => c.name === 'Chevron')) continue;
    if (row.counterAxisAlignItems === 'CENTER' && t.parent === row) continue;
    const chars = t.characters;
    let top = t; while (top.parent !== row && top.parent.children.length === 1) top = top.parent; // opakowanie samej ikony
    if (top.parent === row) continue;
    top.remove();
    const w = al('Chevron', 'VERTICAL', { primaryAxisAlignItems: 'CENTER' }); w.appendChild(icon(chars, 24, T.sec)); row.appendChild(w); w.layoutSizingVertical = 'FILL';
    const glyph = w.children[0]; await figma.loadFontAsync({ family: 'Material Icons', style: 'Regular' }); glyph.fontName = { family: 'Material Icons', style: 'Regular' };
    bump(chars);
  }
} catch (e) { errors.push(f.name.slice(0, 24) + ': ' + (e.message || e)); } }
const get = p => sections[0].children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
await shot(get('02a').findOne(n => n.name === 'Bottom sheet'), { name: 'v-02a-sheet', scale: 0.6 });
await shot(get('07 ').children[1].findOne(n => n.name === 'MsgList' && n.cornerRadius === 20), { name: 'v-07list', scale: 0.5 });
return { log, errors };
