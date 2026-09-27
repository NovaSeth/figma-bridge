//# opis: #82 porzadki na ekranie Ustawienia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '02g Teraz · ustawienia');
const main = f.children.find(c => c.name === 'Main Content');
const przed = main.children.map(c => ({ n: c.name, y: Math.round(c.y), h: Math.round(c.height), abs: c.layoutPositioning, kids: 'children' in c ? c.children.length : 0 }));
// 1. puste kontenery po poprzedniej wersji ekranu
const usuniete = [];
for (const c of main.children.slice()) {
  if (c.type === 'FRAME' && c.children && c.children.length === 0) { usuniete.push(c.name + ' ' + Math.round(c.width) + 'x' + Math.round(c.height)); c.remove(); }
}
// 2. oddech nad nagłówkami sekcji, poza pierwszym
const heads = main.children.filter(c => c.name === 'Section heading');
for (let i = 0; i < heads.length; i++) {
  const h = heads[i];
  h.layoutPositioning = 'AUTO';
  const isFirst = i === 0;
  if ('paddingTop' in h) continue;
}
main.itemSpacing = 0;
// odstępy przez opakowania: nagłówek dostaje margines górny, lista dolny
for (let i = 0; i < main.children.length; i++) {
  const c = main.children[i];
  if (c.name === 'Section heading' && 'paddingTop' in c) { /* instancja, marginesu nie ustawię */ }
}
const po = main.children.map(c => ({ n: c.name, y: Math.round(c.y), h: Math.round(c.height), abs: c.layoutPositioning }));
await shot(f, { scale: 1, name: 'v82-ustawienia' });
return { przed, usuniete, po };
