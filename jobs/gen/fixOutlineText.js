//# opis: ostatnie teksty na outline -> on-surface-variant
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const outline = wszystkie.find(v => v.name === 'color/outline' && v.variableCollectionId === cLight.id);
const osv = wszystkie.find(v => v.name === 'color/on-surface-variant' && v.variableCollectionId === cLight.id);
const paint = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.37, g: 0.39, b: 0.41 } }, 'color', osv);
const log = [];
for (const t of page.findAll(n => n.type === 'TEXT')) {
  const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
  if (!b || b.id !== outline.id) continue;
  let n = t.parent, wInstancji = false;
  while (n) { if (n.type === 'INSTANCE') { wInstancji = true; break; } n = n.parent; }
  if (wInstancji) continue;
  t.fills = [paint];
  log.push(t.characters.slice(0, 12));
}
return { poprawione: log.length, probka: log.slice(0, 8) };
