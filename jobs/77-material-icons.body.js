//# Ikonografia: klasyczne Material Icons na wszystkich ekranach
const MI = { family: 'Material Icons', style: 'Regular' };
await figma.loadFontAsync(MI);
let n = 0; const errors = [];
const roots = [...screens().map(s => ({ f: s.f, T: s.T })), ...page.children.filter(c => c.type === 'FRAME').map(f => ({ f, T: THEMES['Jasny motyw'] }))];
for (const { f, T } of roots) for (const t of f.findAll(x => x.type === 'TEXT' && x.fontName !== figma.mixed && x.fontName.family.startsWith('Material Symbols'))) { try {
  await figma.loadFontAsync(t.fontName);
  t.fontName = MI;
  if (t.characters === 'settings' && t.parent.name === 'Button - Ustawienia') { t.fontSize = 28; t.lineHeight = { unit: 'PIXELS', value: 28 }; t.fills = solid(T.sec); }
  n++;
} catch (e) { errors.push(f.name.slice(0, 20) + ': ' + e.message); } }
const f01 = sections[0].children.find(x => x.name.startsWith('01 '));
await shot(f01.children[0], { name: 'v-hdr', scale: 2 });
await shot(f01.children[f01.children.length - 1], { name: 'v-nav', scale: 2 });
const card = f01.children[1].findOne(x => x.type === 'FRAME' && x.cornerRadius === 20);
await shot(card, { name: 'v-card', scale: 1.5 });
return { changed: n, errors: errors.slice(0, 5) };
