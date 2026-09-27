//# opis: #104 ikona pustego stanu w kolorze opisu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (nazwa, k) => wszystkie.find(v => v.name === nazwa && v.variableCollectionId === k.id);
const log = { komponent: [], instancje: [] };
const set = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'Empty state');
const cele = set.type === 'COMPONENT_SET' ? set.children : [set];
for (const v of cele) {
  // token opisu pod ikoną
  const teksty = v.findAll(n => n.type === 'TEXT');
  const opis = teksty[teksty.length - 1];
  const b = opis && opis.fills && opis.fills[0] && opis.fills[0].boundVariables && opis.fills[0].boundVariables.color;
  const token = b ? byId[b.id].name : 'color/on-surface-variant';
  for (const w of v.findAll(n => n.type === 'VECTOR')) {
    const wb = w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
    const przed = wb ? byId[wb.id].name : 'brak';
    if (przed === token) continue;
    w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: w.fills[0].color }, 'color', zm(token, cLight))];
    log.komponent.push(v.name + ': ' + przed + ' → ' + token);
  }
}
// instancje w obu motywach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    for (const es of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Empty state')) {
      const teksty = es.findAll(n => n.type === 'TEXT');
      const opis = teksty[teksty.length - 1];
      const b = opis && opis.fills && opis.fills[0] && opis.fills[0].boundVariables && opis.fills[0].boundVariables.color;
      const token = b ? byId[b.id].name : 'color/on-surface-variant';
      for (const w of es.findAll(n => n.type === 'VECTOR')) {
        const wb = w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
        if (wb && byId[wb.id] && byId[wb.id].name === token && byId[wb.id].variableCollectionId === kolekcja.id) continue;
        w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: w.fills[0].color }, 'color', zm(token, kolekcja))];
        log.instancje.push(sek.name + ' / ' + f.name);
      }
    }
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
for (const n of ['06 Oceny', '22 Stan · pusto (Zadania)']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vE6-d-' + n.split(' ')[0] });
}
return { komponent: log.komponent, instancje: log.instancje.length, probka: log.instancje.slice(0, 6) };
