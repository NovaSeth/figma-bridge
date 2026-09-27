//# opis: kontekst komentarzy 76/77
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = await figma.getNodeByIdAsync('2:2');
const n18 = await figma.getNodeByIdAsync('18:2');
// region komentarza 76 w ukladzie sekcji 2:2
const R = { x0: 4979-2831, y0: 5957-1401, x1: 4979, y1: 5957 };
const hits = [];
for (const ch of sec.children) {
  const cx = ch.x, cy = ch.y, cw = ch.width, chh = ch.height;
  if (cx + cw > R.x0 && cx < R.x1 && cy + chh > R.y0 && cy < R.y1) {
    hits.push({ id: ch.id, name: ch.name, x: cx, y: cy, w: cw, h: chh });
  }
}
return {
  n18: n18 ? { id: n18.id, name: n18.name, type: n18.type, parent: n18.parent && n18.parent.name, w: n18.width, h: n18.height } : null,
  region: R,
  hits
};
