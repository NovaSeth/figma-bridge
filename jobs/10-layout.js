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
const al = (name, dir, props) => { const f = figma.createFrame(); f.name = name; f.fills = []; f.layoutMode = dir; Object.assign(f, props || {}); return f; };
const iconSrc = byName('01 ').findAll(n => n.type === 'TEXT' && n.fontName !== figma.mixed && n.fontName.family.startsWith('Material')).find(n => n.characters === 'task_alt' && n.fontSize === 24);
await figma.loadFontAsync(iconSrc.fontName);
const icon = (chars, size, color) => { const t = iconSrc.clone(); t.characters = chars; t.fontSize = size; t.lineHeight = { unit: 'PIXELS', value: size }; t.fills = solid(color); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.name = chars; return t; };
const fill = n => { n.layoutSizingHorizontal = 'FILL'; return n; };
const placeSheet = (frame, sheet) => { sheet.y = frame.height - sheet.height; };
// Nowe ekrany stanów: miejsce w rzędzie Teraz + arkusz na pełnym ekranie
const STEP = 522, NEW = [['02a Teraz · szczegóły na pełnym ekranie', '02 '], ['02b Teraz · odpowiedź', '02 '], ['02c Teraz · szczegóły ogłoszenia', '02 '], ['02d Teraz · wybór dziecka', '01 '], ['02e Teraz · zdjęcie dziecka', '02 ']];
const f02 = byName('02 ');
const created = [];
if (!byName('02a')) {
  for (const f of light.children.filter(n => n.type === 'FRAME' && Math.abs(n.y - f02.y) < 2 && n.x > f02.x)) f.x += STEP * NEW.length;
  NEW.forEach(([name, src], i) => { const c = byName(src).clone(); light.appendChild(c); c.name = name; c.x = f02.x + STEP * (i + 1); c.y = f02.y; created.push(c.id); });
  const right = Math.max(...light.children.filter(n => n.type === 'FRAME').map(n => n.x + n.width));
  const grow = right + 160 - light.width;
  if (grow > 0) { light.resizeWithoutConstraints(light.width + grow, light.height); const dark = page.children.find(n => n.type === 'SECTION' && n.name === 'Ciemny motyw'); dark.x += grow; }
}
// 02a: arkusz po przewinięciu rośnie na pełny ekran
const a = byName('02a');
const sheet = a.findOne(n => n.name === 'Bottom sheet'), body = sheet.findOne(n => n.name === 'Body'), actions = sheet.findOne(n => n.name === 'Actions');
const H = 874 - 52;
body.layoutSizingVertical = 'FIXED';
body.resize(body.width, H - 44 - 44 - actions.height);
placeSheet(a, sheet);
await shot(a, { name: 's-02a', scale: 1 });
return { created, sheetH: sheet.height, lightW: light.width };
