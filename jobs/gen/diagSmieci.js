//# opis: co lezy luzem na stronie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
return page.children.map(c => ({ id: c.id, name: c.name, type: c.type, x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.width), h: Math.round(c.height),
  kids: 'children' in c ? c.children.length : 0 }));
