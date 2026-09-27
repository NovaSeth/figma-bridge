//# opis: kolory ciemnej sekcji na kolekcje Color Dark
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const wszystkie = await figma.variables.getLocalVariablesAsync();
const nazwaJasnej = {}; const ciemnaPoNazwie = {};
for (const v of wszystkie) {
  if (v.variableCollectionId === cLight.id) nazwaJasnej[v.id] = v.name;
  if (v.variableCollectionId === cDark.id) ciemnaPoNazwie[v.name] = v;
}
const sekcja = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const ekrany = sekcja.children.filter(c => c.type === 'FRAME');
const log = { fills: 0, strokes: 0, pominiete: {} };
const przepnij = (lista) => {
  let zmiana = false;
  const nowa = lista.map(p => {
    const b = p.boundVariables && p.boundVariables.color;
    if (!b) return p;
    const nazwa = nazwaJasnej[b.id];
    if (!nazwa) { log.pominiete['spoza Color'] = (log.pominiete['spoza Color'] || 0) + 1; return p; }
    const ciemna = ciemnaPoNazwie[nazwa];
    if (!ciemna) { log.pominiete[nazwa] = (log.pominiete[nazwa] || 0) + 1; return p; }
    zmiana = true;
    return figma.variables.setBoundVariableForPaint(p, 'color', ciemna);
  });
  return zmiana ? nowa : null;
};
let i = 0;
for (const f of ekrany) {
  i++; progress(i / ekrany.length, f.name);
  for (const n of f.findAll(() => true)) {
    if ('fills' in n && n.fills && n.fills !== figma.mixed && n.fills.length) {
      const nowe = przepnij(n.fills);
      if (nowe) { try { n.fills = nowe; log.fills++; } catch (e) { log.pominiete['fills: ' + e.message] = 1; } }
    }
    if ('strokes' in n && n.strokes && n.strokes.length) {
      const nowe = przepnij(n.strokes);
      if (nowe) { try { n.strokes = nowe; log.strokes++; } catch (e) { log.pominiete['strokes: ' + e.message] = 1; } }
    }
  }
}
return log;
