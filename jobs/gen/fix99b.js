//# opis: #99 ikony w chipach na makietach zgodne z tekstem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v;
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { poprawione: 0, tony: {} };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const t = chip.findOne(n => n.type === 'TEXT');
    if (!t) continue;
    const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
    if (!b) continue;
    const zmienna = byId[b.id];
    for (const w of chip.findAll(n => n.type === 'VECTOR')) {
      const wb = w.boundVariables && w.boundVariables.fills && w.boundVariables.fills[0];
      if (wb && wb.id === b.id) continue;
      w.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: t.fills[0].color }, 'color', zmienna)];
      log.poprawione++;
      log.tony[zmienna.name] = (log.tony[zmienna.name] || 0) + 1;
    }
  }
}
const f01 = sec.children.find(x => x.name === '01 Teraz');
await shot(f01, { scale: 0.6, name: 'vAM-01' });
return log;
