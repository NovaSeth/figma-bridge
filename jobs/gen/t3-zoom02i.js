//# opis: zblizenie kalendarza 02i w obu motywach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(c => c.name === '02i Frekwencja · z nieobecnościami');
  const main = f.children.find(c => c.name === 'Main Content');
  const kal = main.children.find(c => c.name === 'Kalendarz');
  await shot(kal, { scale: 2, name: 't3-02i-kal-' + (sek.name === 'Ciemny motyw' ? 'ciemny' : 'jasny') });
}
return 'ok';
