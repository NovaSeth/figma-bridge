//# opis: #93 bez wyszukiwarki w pustym stanie, #94 widoczna ikona w FAB
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v.name; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const log = { fab: [], wyszukiwarka: [] };
const fab = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'FAB');
const cele = fab.type === 'COMPONENT_SET' ? fab.children : [fab];
for (const c of cele) {
  const tlo = c.boundVariables && c.boundVariables.fills && c.boundVariables.fills[0];
  log.fab.push({ wariant: c.name, tlo: tlo ? byId[tlo.id] : 'brak' });
  for (const v of c.findAll(n => n.type === 'VECTOR' || (n.type === 'INSTANCE' && /^Icon/.test(n.name)))) {
    const cel = v.type === 'VECTOR' ? v : v.findOne(x => x.type === 'VECTOR');
    if (!cel) continue;
    const b = cel.boundVariables && cel.boundVariables.fills && cel.boundVariables.fills[0];
    log.fab.push({ ikona: cel.name, przed: b ? byId[b.id] : 'brak' });
    cel.fills = [paint('color/on-inverse-surface', { r: 1, g: 1, b: 1 })];
  }
}
// wyszukiwarka znika, gdy lista jest pusta
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  const pusty = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Empty state');
  if (!pusty) continue;
  for (const pole of main.findAll(n => n.type === 'INSTANCE' && n.name.indexOf('Text field') >= 0)) {
    const opak = pole.parent && /margin|Search/i.test(pole.parent.name) ? pole.parent : pole;
    log.wyszukiwarka.push(f.name + ' / ' + opak.name);
    opak.visible = false;
  }
  await shot(f, { scale: 0.6, name: 'vAJ-' + f.name.split(' ')[0] });
}
return log;
