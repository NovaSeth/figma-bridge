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
//# #36 #37: Frekwencja z przełącznikiem miesięcy nad zieloną kartą KPI
const light = sections[0], T = THEMES['Jasny motyw'];
const get = p => light.children.find(n => n.type === 'FRAME' && n.name.startsWith(p));
const f = get('02f'), main = f.children[1];
const pinned = await figma.getNodeByIdAsync('47:2569');
const info = { pinned: pinned ? pinned.name + ' / ' + pinned.type : null };
const summary = main.findOne(n => n.name === 'Summary');
if (!main.findOne(n => n.name === 'Date nav')) {
  const idx = main.children.indexOf(summary);
  const seg = get('02g').findOne(n => n.name === 'Segmented').clone();
  seg.children[2].remove(); const labs = texts(seg); await setText(labs[0], 'Miesiąc'); await setText(labs[1], 'Rok');
  main.insertChild(idx, seg); seg.layoutSizingHorizontal = 'FILL';
  const navSrc = get('17 ').findOne(n => n.name === 'Date nav'), nav = navSrc.clone();
  const bar = al('Month bar', 'HORIZONTAL', { paddingTop: 10, paddingBottom: 10, primaryAxisAlignItems: 'CENTER', counterAxisAlignItems: 'CENTER' });
  bar.appendChild(nav); main.insertChild(idx + 1, bar); bar.layoutSizingHorizontal = 'FILL';
  const old = main.children.find(c => c.name === 'Heading 2' && texts(c).some(t => t.characters === 'Wrzesień'));
  if (old) { old.remove(); const sp = figma.createFrame(); sp.name = 'Spacer'; sp.fills = []; sp.resize(10, 16); main.insertChild(main.children.indexOf(summary) + 1, sp); }
}
// zielona karta KPI (kolory „sukces"), treść zależna od wybranego miesiąca
summary.fills = solid('#CEEAD6');
for (const t of texts(summary)) t.fills = solid('#0D652D');
const sub = texts(summary).find(t => t.characters.includes('nieobecności')); if (sub) await setText(sub, '0 nieobecności, 0 spóźnień we wrześniu');
main.layoutSizingVertical = 'HUG'; f.primaryAxisSizingMode = 'AUTO';
relayout();
await shot(f, { name: 'v-02f', scale: 0.6 });
return info;
