//# opis: ptaszek na zielonym kolku w kolorze on-success
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const onSuccess = wszystkie.find(v => v.name === 'color/on-success' && v.variableCollectionId === cLight.id);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Checkbox');
const log = [];
for (const v of set.children.filter(c => /Checked=True/i.test(c.name))) {
  for (const w of v.findAll(n => n.type === 'VECTOR')) {
    const b = w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
    log.push({ wariant: v.name, przed: b ? byId[b.id].name : 'brak' });
    w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', onSuccess)];
  }
}
// to samo na makietach, gdzie instancje maja wlasne nadpisania
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cDark = kol.find(c => c.name === 'Color Dark');
const onSuccessDark = wszystkie.find(v => v.name === 'color/on-success' && v.variableCollectionId === cDark.id);
let n = 0;
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemny = sek.name === 'Ciemny motyw';
  const cel = ciemny ? onSuccessDark : onSuccess;
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    for (const box of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Checkbox')) {
      const p = box.componentProperties || {};
      const k = Object.keys(p).find(y => y === 'Checked');
      if (!k || String(p[k].value) !== 'True') continue;
      for (const w of box.findAll(x => x.type === 'VECTOR')) {
        w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', cel)];
        n++;
      }
    }
  }
}
log.push({ instancje: n });
return log;
