//# opis: przerwa w siatce godzin
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('18:2');
const grid = f.findOne(n => n.name === 'TimeGrid');
const opis = grid.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height), abs: c.layoutPositioning,
  txt: c.type === 'TEXT' ? c.characters : (c.children ? c.children.map(k => k.type === 'TEXT' ? k.characters.slice(0, 18) : k.name).join(', ').slice(0, 60) : null) }));
await shot(grid, { scale: 1, name: 'vAC-grid' });
return { gridY: Math.round(grid.y), gap: grid.itemSpacing, pad: [grid.paddingTop, grid.paddingBottom], dzieci: opis.slice(0, 12) };
