//# opis: #105 siatka miesiaca jako karta, #106 wiekszy odstep pod filtrami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (n, k) => wszystkie.find(v => v.name === n && v.variableCollectionId === k.id);
const log = { karta: [], odstep: [] };
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  const surface = zm('color/surface', kolekcja);
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'MonthGrid');
    if (grid) {
      const fl = grid.fills && grid.fills !== figma.mixed && grid.fills[0];
      const b = fl && fl.boundVariables && fl.boundVariables.color;
      const juz = b && byId[b.id] && byId[b.id].name === 'color/surface';
      if (!juz) {
        grid.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', surface)];
        grid.cornerRadius = 20;
        grid.clipsContent = true;
        grid.paddingTop = Math.max(grid.paddingTop || 0, 10);
        grid.paddingBottom = Math.max(grid.paddingBottom || 0, 10);
        log.karta.push(sek.name + ' / ' + f.name);
      }
    }
    // odstęp pod rzędem filtrów
    const main = f.children.find(c => c.name === 'Main Content');
    if (!main) continue;
    for (const c of main.children) {
      if (!('paddingBottom' in c)) continue;
      const chipy = c.findAll ? c.findAll(x => x.type === 'INSTANCE' && /^Chip/.test(x.name)) : [];
      if (chipy.length < 3) continue;
      const tekst = c.findAll(x => x.type === 'TEXT' && x.characters.length > 20);
      if (tekst.length) continue; // to nie rząd filtrów, tylko blok z treścią
      if (c.paddingBottom >= 16) continue;
      c.paddingBottom = 16;
      log.odstep.push(sek.name + ' / ' + f.name);
    }
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['17 Plan · miesiąc', '18 Plan · rok']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vE8-' + n.split(' ')[0] });
}
return { karta: log.karta, odstep: log.odstep.length };
