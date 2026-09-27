//# opis: podglad karty podsumowania
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '01 Teraz');
const karta = f.findOne(n => n.type === 'INSTANCE' && n.name === 'Summary card') || f.findOne(n => n.findAll && n.findAll(x => x.type === 'INSTANCE' && x.name === 'Progress bar').length);
await shot(karta, { scale: 2, name: 'vL-karta' });
return { karta: karta.name, w: Math.round(karta.width) };
