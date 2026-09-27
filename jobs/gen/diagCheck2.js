//# opis: gdzie siedzi zielone kolko z ptaszkiem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const sek = page.children.find(c => c.type === 'SECTION' && c.name === 'Ciemny motyw');
const f = sek.children.find(x => x.name === '03 Teraz · sprawy zamknięte');
const nazwy = {};
for (const n of f.findAll(x => x.type === 'INSTANCE')) nazwy[n.name] = (nazwy[n.name] || 0) + 1;
// szukam wektora w kolorze on-primary
const zle = [];
for (const w of f.findAll(n => n.type === 'VECTOR')) {
  const fl = w.fills && w.fills !== figma.mixed && w.fills[0];
  const b = fl && fl.boundVariables && fl.boundVariables.color;
  if (!b) continue;
  const v = byId[b.id];
  if (!/on-primary$/.test(v.name)) continue;
  let sciezka = [], p = w;
  while (p && p !== f) { sciezka.unshift(p.name + ':' + p.type); p = p.parent; }
  zle.push({ sciezka: sciezka.slice(-4).join(' > '), zm: v.name, kolekcja: kolById[v.variableCollectionId].name });
}
return { instancje: Object.keys(nazwy).slice(0, 14), naOnPrimary: zle.slice(0, 6) };
