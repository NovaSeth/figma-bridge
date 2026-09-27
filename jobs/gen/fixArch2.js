//# opis: wyrownanie przyciskow Archiwizuj
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const btns = f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button' && JSON.stringify(n.componentProperties || {}).indexOf('Archiwizuj') >= 0);
  if (btns.length < 2) continue;
  const xs = btns.map(b => Math.round(b.x));
  const czest = {}; xs.forEach(x => { czest[x] = (czest[x] || 0) + 1; });
  const dominant = +Object.keys(czest).sort((a, b) => czest[b] - czest[a])[0];
  for (const b of btns) {
    if (Math.round(b.x) === dominant) continue;
    const p = b.parent;
    log.push({ screen: f.name, z: Math.round(b.x), na: dominant, rodzicLayout: p.layoutMode, rodzicW: Math.round(p.width), align: p.primaryAxisAlignItems, padR: p.paddingRight });
    if (p.layoutMode && p.layoutMode !== 'NONE') { p.primaryAxisAlignItems = 'MAX'; p.paddingRight = 12; }
    else b.x = dominant;
    log.push({ po: Math.round(b.x) });
  }
}
return log;
