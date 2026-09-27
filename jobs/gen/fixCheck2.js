//# opis: ptaszek na zielonym kolku bierze on-success
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (nazwa, k) => wszystkie.find(v => v.name === nazwa && v.variableCollectionId === k.id);
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  const cel = zm('color/on-success', kolekcja);
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    for (const w of f.findAll(n => n.type === 'VECTOR')) {
      // tlo pod ikona: szukam najblizszego przodka z wypelnieniem
      let p = w.parent, tlo = null;
      for (let i = 0; i < 4 && p; i++) {
        const fl = p.fills && p.fills !== figma.mixed && p.fills[0];
        const b = fl && fl.boundVariables && fl.boundVariables.color;
        if (b) { tlo = byId[b.id]; break; }
        p = p.parent;
      }
      if (!tlo || tlo.name !== 'color/success') continue;
      const fl = w.fills && w.fills !== figma.mixed && w.fills[0];
      const b = fl && fl.boundVariables && fl.boundVariables.color;
      if (b && byId[b.id] && byId[b.id].name === 'color/on-success' && byId[b.id].variableCollectionId === kolekcja.id) continue;
      w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: fl ? fl.color : { r: 1, g: 1, b: 1 } }, 'color', cel)];
      log.push(sek.name + ' / ' + f.name + ' (' + (b ? byId[b.id].name : 'brak') + ' → on-success)');
    }
  }
}
return { poprawione: log.length, probka: log.slice(0, 8) };
