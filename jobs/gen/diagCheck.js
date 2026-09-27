//# opis: ptaszek w kolku - stan instancji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const f = sek.children.find(x => x.name === '03 Teraz · sprawy zamknięte');
  if (!f) continue;
  for (const box of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Checkbox').slice(0, 2)) {
    const p = box.componentProperties || {};
    const stan = Object.keys(p).map(k => k + '=' + JSON.stringify(p[k].value)).join(',');
    const wektory = box.findAll(n => n.type === 'VECTOR').map(w => {
      const fl = w.fills && w.fills[0];
      const b = fl && fl.boundVariables && fl.boundVariables.color;
      return { n: w.name, zm: b ? byId[b.id].name : 'brak', kolekcja: b ? kolById[byId[b.id].variableCollectionId].name : '-',
        rgb: fl && fl.type === 'SOLID' ? [Math.round(fl.color.r*255), Math.round(fl.color.g*255), Math.round(fl.color.b*255)] : null };
    });
    out.push({ sekcja: sek.name, stan, wektory });
  }
}
return out;
