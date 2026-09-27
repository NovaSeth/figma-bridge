//# opis: przyciecie ramek, przycisk Archiwizuj, wiersz archiwum
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { przyciete: [], archiwizuj: [], archiwum: [] };
// 1. ramka ekranu przycina cien pływającego przycisku
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  if (!f.clipsContent) { f.clipsContent = true; log.przyciete.push(f.name); }
}
// 2. przyciski Archiwizuj tej samej wielkosci
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const btns = f.findAll(n => n.type === 'INSTANCE' && n.componentProperties && JSON.stringify(n.componentProperties).indexOf('Archiwizuj') >= 0);
  if (btns.length < 2) continue;
  const wzorzec = btns.map(b => Math.round(b.width) + 'x' + Math.round(b.height));
  const czest = {}; wzorzec.forEach(w => { czest[w] = (czest[w] || 0) + 1; });
  const dominant = Object.keys(czest).sort((a, b) => czest[b] - czest[a])[0];
  const [w, h] = dominant.split('x').map(Number);
  for (const b of btns) {
    if (Math.round(b.width) === w && Math.round(b.height) === h) continue;
    b.layoutSizingHorizontal = 'FIXED'; b.layoutSizingVertical = 'FIXED';
    b.resize(w, h);
    log.archiwizuj.push(f.name + ': ' + Math.round(b.width) + 'x' + Math.round(b.height) + ' → ' + dominant);
  }
}
return log;
