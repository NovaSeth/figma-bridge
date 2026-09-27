//# opis: czy outline wystepuje jako kolor tekstu
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const outline = wszystkie.find(v => v.name === 'color/outline' && v.variableCollectionId === cLight.id);
const hits = [];
for (const nazwa of ['Design System', '[Mobile] User Front']) {
  const p = figma.root.children.find(x => x.name === nazwa);
  if (!p) continue;
  await figma.setCurrentPageAsync(p);
  for (const t of p.findAll(n => n.type === 'TEXT')) {
    const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
    if (b && b.id === outline.id) hits.push(nazwa + ' / ' + t.name + ' = ' + t.characters.slice(0, 20));
  }
}
return { outlineJakoTekst: hits.length, probka: hits.slice(0, 8) };
