//# opis: #105 siatka miesiaca w karcie, #106 odstep pod chipami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (n, k) => wszystkie.find(v => v.name === n && v.variableCollectionId === k.id);
const log = { karta: [], odstep: [] };
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  const surface = zm('color/surface', kolekcja);
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    // 1. siatka miesiaca dostaje karte
    const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'MonthGrid');
    if (grid && !(grid.fills && grid.fills.length)) {
      grid.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', surface)];
      grid.cornerRadius = 20;
      grid.clipsContent = true;
      grid.paddingTop = Math.max(grid.paddingTop || 0, 8);
      grid.paddingBottom = Math.max(grid.paddingBottom || 0, 8);
      log.karta.push(sek.name + ' / ' + f.name);
    }
    // 2. rzad chipow filtra ma oddech przed tym, co pod nim
    for (const rzad of f.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL'
      && n.children.length >= 3 && n.children.every(c => c.type === 'INSTANCE' && /^Chip/.test(c.name)))) {
      const opak = rzad.parent && /margin/.test(rzad.parent.name) ? rzad.parent : rzad;
      if (!('paddingBottom' in opak)) continue;
      if (opak.paddingBottom >= 12) continue;
      opak.paddingBottom = 12;
      log.odstep.push(sek.name + ' / ' + f.name);
    }
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['17 Plan · miesiąc', '18 Plan · rok']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vE7-' + n.split(' ')[0] });
}
return log;
