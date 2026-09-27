//# opis: przeglad calej sekcji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
await shot(sec, { scale: 0.13, name: 'vQ-sekcja' });
return { w: Math.round(sec.width), h: Math.round(sec.height) };
