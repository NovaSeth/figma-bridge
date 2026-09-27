//# opis: ciemny 01 w pelnej skali
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sekcja = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const f = sekcja.children.find(x => x.name === '01 Teraz');
const naglowek = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Section heading');
await shot(naglowek, { scale: 3, name: 'vD2-naglowek' });
const karta = f.findOne(n => n.type === 'FRAME' && n.name === 'List');
await shot(karta, { scale: 1, name: 'vD2-karta' });
return { naglowek: naglowek.name, w: Math.round(naglowek.width), h: Math.round(naglowek.height) };
