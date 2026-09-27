//# opis: #84 rzad Wyslij/Anuluj na ekranach pisania
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const row of f.findAll(n => n.type === 'FRAME' && n.layoutMode === 'HORIZONTAL' && n.children.filter(c => c.type === 'INSTANCE' && c.name === 'Button').length === 2)) {
    const btns = row.children.filter(c => c.type === 'INSTANCE');
    const opis = b => {
      const p = b.componentProperties || {};
      const kS = Object.keys(p).find(x => x.split('#')[0] === 'Style' || x === 'Style');
      const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
      return { styl: kS ? String(p[kS].value) : '?', label: kL ? String(p[kL].value) : '?' };
    };
    const info = btns.map(opis);
    // główny = nie Outline/Secondary
    const idxPri = info.findIndex(i => !/outline|secondary|ghost/i.test(i.styl));
    if (idxPri < 0) continue;
    const pri = btns[idxPri];
    const other = btns.filter(b => b !== pri);
    for (const o of other) row.insertChild(0, o);
    row.insertChild(row.children.length, pri);
    for (const b of row.children.filter(c => c.type === 'INSTANCE')) { b.layoutSizingHorizontal = 'FILL'; b.layoutGrow = 1; }
    log.push({ screen: f.name, przed: info, po: row.children.map(c => opis(c).label + ':' + Math.round(c.width)) });
  }
}
return log;
