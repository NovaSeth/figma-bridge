//# opis: #87 dzisiaj jako pelne niebieskie kolo
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const log = [];
for (const nazwa of ['Day ring', 'Calendar day']) {
  const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === nazwa);
  if (!set) continue;
  for (const v of set.children.filter(c => /State=Today/.test(c.name))) {
    for (const e of v.findAll(n => n.type === 'ELLIPSE')) {
      if (/Track|Arc/.test(e.name)) { e.visible = false; continue; }
      e.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0 };
      e.fills = [paint('color/primary', { r: 0.05, g: 0.34, b: 0.82 })];
      e.name = 'Today';
    }
    const t = v.findOne(n => n.type === 'TEXT');
    if (t) t.fills = [paint('color/on-primary', { r: 1, g: 1, b: 1 })];
    log.push(nazwa + ' / ' + v.name);
  }
  set.description = (set.description || '').split(' Today')[0] + ' Today to pełne koło w kolorze primary z białą liczbą.';
}
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['02f Teraz · frekwencja', '18 Plan · rok', '16 Plan · tydzień']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vAA-' + n.split(' ')[0] });
}
return log;
