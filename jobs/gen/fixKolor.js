//# opis: ostatnie dwa teksty na token koloru
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.07 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT' && /^Treść (ogłoszenia|oferty)$/.test(n.name))) {
    t.fills = [paint('color/on-surface')];
    log.push(f.name + ' / ' + t.name);
  }
}
return log;
