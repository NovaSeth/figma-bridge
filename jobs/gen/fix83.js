//# opis: #83 zaznaczenie na zielono
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const cDark = cols.find(c => c.name === 'Color Dark');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const set = ds.findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === 'Checkbox');
const log = { typ: set.type, warianty: [] };
const warianty = set.type === 'COMPONENT_SET' ? set.children : [set];
for (const v of warianty) {
  const b = v.boundVariables && v.boundVariables.fills && v.boundVariables.fills[0];
  const rec = { n: v.name, przed: b ? (byId[b.id] || {}).name : 'brak' };
  if (/Checked=True/i.test(v.name)) {
    v.fills = [paint('color/success')];
    // obrys też, jeśli jest
    if (v.strokes && v.strokes.length) v.strokes = [paint('color/success')];
    rec.po = 'color/success';
  }
  log.warianty.push(rec);
}
return log;
