//# opis: #99 ikona w chipie w kolorze tekstu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v;
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const log = [];
for (const v of set.children) {
  const t = v.findOne(n => n.type === 'TEXT');
  if (!t) continue;
  const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
  if (!b) { log.push({ wariant: v.name, uwaga: 'tekst bez tokenu' }); continue; }
  const zmienna = byId[b.id];
  const paint = figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: t.fills[0].color }, 'color', zmienna);
  for (const w of v.findAll(n => n.type === 'VECTOR')) {
    w.fills = [paint];
    log.push({ wariant: v.name, ikona: zmienna.name });
  }
}
return log;
