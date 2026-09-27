//# opis: bez podwojnego odstepu pod naglowkiem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const h of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) {
    const rodzic = h.parent;
    if (!rodzic || rodzic.layoutMode !== 'VERTICAL') continue;
    const idx = rodzic.children.indexOf(h);
    const nast = rodzic.children[idx + 1];
    if (!nast || !('paddingTop' in nast) || !nast.paddingTop) continue;
    log.push({ screen: f.name, po: nast.name, bylo: nast.paddingTop });
    nast.paddingTop = 0;
  }
}
return { n: log.length, probka: log.slice(0, 8) };
