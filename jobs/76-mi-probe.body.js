//# Ikonografia: test glifów w Material Icons
const names = new Set();
for (const { f } of screens()) for (const t of f.findAll(isIcon)) names.add(t.characters);
const list = [...names].sort();
const T = THEMES['Jasny motyw'];
const grid = al('probe', 'HORIZONTAL', { itemSpacing: 18, paddingTop: 12, paddingBottom: 12, paddingLeft: 12, paddingRight: 12, layoutWrap: 'WRAP' }); grid.fills = solid('#FFFFFF');
grid.primaryAxisSizingMode = 'FIXED'; grid.resize(900, 100); grid.counterAxisSizingMode = 'AUTO'; grid.counterAxisSpacing = 14;
for (const fam of ['Material Icons', 'Material Icons Round']) { await figma.loadFontAsync({ family: fam, style: 'Regular' });
  for (const nme of list) { const cell = al('c', 'VERTICAL', { itemSpacing: 2, counterAxisAlignItems: 'CENTER' }); const t = figma.createText(); t.fontName = { family: fam, style: 'Regular' }; t.fontSize = 28; t.characters = nme; t.fills = solid(T.ink); cell.appendChild(t); cell.appendChild(mk(nme.slice(0, 14), 'Regular', 8, T.sec)); grid.appendChild(cell); } }
page.appendChild(grid); grid.x = -3000; grid.y = -3000;
await shot(grid, { name: 'v-mi', scale: 1.4 });
grid.remove();
return { count: list.length, list };
