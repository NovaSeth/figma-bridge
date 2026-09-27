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
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; Object.assign(f, props || {}); return f; };
const iconSrc = byName('01 ').findAll(n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material')).find(n => n.characters === 'task_alt' && n.fontSize === 24);
await figma.loadFontAsync(iconSrc.fontName);
const icon = (chars, size, color) => { const t = iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const fill = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const placeSheet = (frame, sheet) => { sheet.y = frame.height - sheet.height; };
// Szlif: karta w tle ekranów 02*, odstęp nad cytatem w oknie odpowiedzi
const isCard = n => n.type === 'FRAME' && n.cornerRadius === 20 && texts(n).some(t => t.characters === 'Ogarnięte');
const inSheet = n => { for (let p = n.parent; p; p = p.parent) if (p.name === 'Bottom sheet') return true; return false; };
const srcCard = byName('01 ').children[1].findOne(isCard);
const swapped = [];
for (const prefix of ['02 ', '02a', '02b', '02c', '02e']) {
  const f = byName(prefix);
  const card = f.children[1].findOne(n => isCard(n) && !inSheet(n));
  if (!card) continue;
  const parent = card.parent, i = parent.children.indexOf(card);
  const fresh = srcCard.clone();
  parent.insertChild(i, fresh);
  fresh.layoutSizingHorizontal = 'FILL';
  card.remove();
  swapped.push(prefix.trim());
}
const b = byName('02b');
const gap = b.findAll(n => n.name === 'Gap');
for (const g of gap) { const parent = g.parent, i = parent.children.indexOf(g); const s = figma.createFrame(); s.name = 'Spacer'; s.fills = []; s.resize(10, 16); parent.insertChild(i, s); g.remove(); }
await shot(byName('02e'), { name: 's-02e', scale: 1 });
await shot(b, { name: 's-02b', scale: 1 });
// Przegląd rzędu Teraz
const row = light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - byName('01 ').y) < 2).sort((x, y) => x.x - y.x);
return { swapped, gaps: gap.length, row: row.map(n => n.name.slice(0, 26) + ' @' + Math.round(n.x) + ' h' + Math.round(n.height)) };
