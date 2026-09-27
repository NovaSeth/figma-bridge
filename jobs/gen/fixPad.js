//# opis: karty odzyskuja wewnetrzny padding
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const maTlo = n => n.fills && n.fills !== figma.mixed && n.fills.length > 0 && n.fills.some(f => f.visible !== false && f.opacity !== 0);
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  if (!main) continue;
  for (const c of main.children) {
    if (!('paddingLeft' in c)) continue;
    if (c.paddingLeft !== 0 || c.paddingRight !== 0) continue;
    if (!maTlo(c)) continue;
    const cel = c.name === 'KPI card' ? 20 : 16;
    try { c.paddingLeft = cel; c.paddingRight = cel; log.push({ screen: f.name, n: c.name, pad: cel }); } catch (e) { log.push({ screen: f.name, n: c.name, blad: e.message }); }
  }
}
return { n: log.length, log };
