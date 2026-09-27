//# opis: kontrola sekcji i ekranow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
return page.children.map(c => ({ name: c.name, type: c.type, kids: 'children' in c ? c.children.length : 0,
  screens: 'children' in c ? c.children.map(k => k.name) : null }));
