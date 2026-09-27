//# opis: rzedy z przyciskiem Archiwizuj tej samej szerokosci
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const rzedy = [];
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button' && JSON.stringify(n.componentProperties || {}).indexOf('Archiwizuj') >= 0)) {
    rzedy.push({ b, p: b.parent });
  }
  if (rzedy.length < 2) continue;
  const szer = rzedy.map(r => Math.round(r.p.width));
  const czest = {}; szer.forEach(w => { czest[w] = (czest[w] || 0) + 1; });
  const dominant = +Object.keys(czest).sort((a, b) => czest[b] - czest[a])[0];
  for (const r of rzedy) {
    if (Math.round(r.p.width) === dominant) continue;
    log.push({ screen: f.name, rodzic: r.p.name, z: Math.round(r.p.width), na: dominant, sizH: r.p.layoutSizingHorizontal });
    try { r.p.layoutSizingHorizontal = 'FILL'; } catch (e) {
      try { r.p.resize(dominant, r.p.height); } catch (e2) { log.push({ blad: e2.message }); }
    }
    log.push({ po: Math.round(r.p.width) });
  }
}
return log;
