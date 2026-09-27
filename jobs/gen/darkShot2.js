//# opis: ciemny 01 w skali 1
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sekcja = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const f = sekcja.children.find(x => x.name === '01 Teraz');
await shot(f, { scale: 1, name: 'vD3-01' });
const f07 = sekcja.children.find(x => x.name === '07 Wiadomości · odebrane');
await shot(f07, { scale: 1, name: 'vD3-07' });
return 'ok';
