//# opis: weryfikacja 15 Plan dzien
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('18:2');
const plan = await figma.getNodeByIdAsync('18:235');
await shot(plan, { scale: 1.5, name: 'v77-oferta' });
return { h: Math.round(f.height) };
