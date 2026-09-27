//# opis: ikona w FAB na makietach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v.name; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const fab = f.children.find(c => c.name === 'FAB');
  if (!fab) continue;
  for (const v of fab.findAll(n => n.type === 'VECTOR')) {
    const p = v.fills && v.fills !== figma.mixed && v.fills[0];
    const b = v.boundVariables && v.boundVariables.fills && v.boundVariables.fills[0];
    log.push({ screen: f.name, v: v.name, rgb: p && p.type === 'SOLID' ? [Math.round(p.color.r*255), Math.round(p.color.g*255), Math.round(p.color.b*255)] : null, token: b ? byId[b.id] : 'brak' });
    v.fills = [paint('color/on-inverse-surface', { r: 1, g: 1, b: 1 })];
  }
  await shot(fab, { scale: 2, name: 'vAK-fab-' + f.name.split(' ')[0] });
}
return log.slice(0, 10);
