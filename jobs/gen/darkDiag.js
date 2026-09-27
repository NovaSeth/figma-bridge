//# opis: czemu naglowki sekcji zostaly ciemne
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const sekcja = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const f = sekcja.children.find(x => x.name === '01 Teraz');
const out = [];
for (const h of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading').slice(0, 2)) {
  for (const t of h.findAll(n => n.type === 'TEXT')) {
    const p = t.fills && t.fills !== figma.mixed && t.fills[0];
    const b = p && p.boundVariables && p.boundVariables.color;
    const zm = b ? byId[b.id] : null;
    out.push({ txt: t.characters.slice(0, 26), rgb: p && p.type === 'SOLID' ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255)] : null,
      zmienna: zm ? zm.name : 'brak', kolekcja: zm ? kolById[zm.variableCollectionId].name : '-' });
  }
}
// chip
for (const c of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name)).slice(0, 2)) {
  const p = c.fills && c.fills !== figma.mixed && c.fills[0];
  const b = p && p.boundVariables && p.boundVariables.color;
  const zm = b ? byId[b.id] : null;
  out.push({ chip: true, rgb: p && p.type === 'SOLID' ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255)] : null,
    zmienna: zm ? zm.name : 'brak', kolekcja: zm ? kolById[zm.variableCollectionId].name : '-' });
}
return out;
