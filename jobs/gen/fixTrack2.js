//# opis: tor paska postepu bardziej kontrastowy
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const c = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'Progress bar');
const cele = c.type === 'COMPONENT_SET' ? c.children : [c];
const log = [];
for (const v of cele) {
  const b = v.boundVariables && v.boundVariables.fills && v.boundVariables.fills[0];
  const przed = b ? (byId[b.id] || {}).name : 'brak';
  v.fills = [paint('color/outline')];
  v.opacity = 1;
  log.push({ wariant: v.name, przed, po: 'color/outline' });
}
return log;
