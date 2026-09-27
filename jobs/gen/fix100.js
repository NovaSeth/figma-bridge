//# opis: #100 ikona nieaktywnej zakladki w kolorze podpisu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const zm = (nazwa, kolekcja) => wszystkie.find(v => v.name === nazwa && v.variableCollectionId === kolekcja.id);
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Tab item');
const log = { komponent: [], instancje: 0 };
for (const v of set.children) {
  const aktywna = /Active=True/i.test(v.name);
  const token = aktywna ? 'color/on-surface' : 'color/on-surface-variant';
  for (const w of v.findAll(n => n.type === 'VECTOR' && n.parent && /Icon/.test(n.parent.name))) {
    const b = w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
    const przed = b ? byId[b.id].name : 'brak';
    if (przed === token) continue;
    w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: w.fills[0].color }, 'color', zm(token, cLight))];
    log.komponent.push(v.name + ': ' + przed + ' → ' + token);
  }
}
// instancje na makietach: ikona zgodna ze stanem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const kolekcja = sek.name === 'Ciemny motyw' ? cDark : cLight;
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    for (const t of f.findAll(n => n.type === 'INSTANCE' && /^Tab /.test(n.name))) {
      const p = t.componentProperties || {};
      const k = Object.keys(p).find(x => x === 'Active');
      const aktywna = k && String(p[k].value) === 'True';
      const token = aktywna ? 'color/on-surface' : 'color/on-surface-variant';
      for (const w of t.findAll(n => n.type === 'VECTOR' && n.parent && /Icon/.test(n.parent.name))) {
        const b = w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
        if (b && byId[b.id] && byId[b.id].name === token && byId[b.id].variableCollectionId === kolekcja.id) continue;
        w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: w.fills[0].color }, 'color', zm(token, kolekcja))];
        log.instancje++;
      }
    }
  }
}
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f15 = sec.children.find(x => x.name === '15 Plan · dzień');
const tabs = f15.children.find(c => c.name === 'Tab bar');
await shot(tabs, { scale: 2, name: 'vE1-tabbar' });
return log;
