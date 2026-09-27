//# opis: co wskazuje komentarz 104
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const n = await figma.getNodeByIdAsync('96:8777');
if (!n) return { brak: true };
let sciezka = [], p = n;
while (p && p.type !== 'PAGE') { sciezka.unshift(p.name + ':' + p.type); p = p.parent; }
const R = { x0: 328 - 712, y0: 477 - 132, x1: 328, y1: 477 };
const hits = [];
function walk(x, d, ox, oy) {
  if (d > 7) return;
  for (const c of ('children' in x ? x.children : [])) {
    const cx = ox + c.x, cy = oy + c.y;
    if (cx < R.x1 && cx + c.width > R.x0 && cy < R.y1 && cy + c.height > R.y0) {
      hits.push({ d, n: c.name, t: c.type, txt: c.type === 'TEXT' ? c.characters.slice(0, 24) : null });
      walk(c, d + 1, cx, cy);
    }
  }
}
walk(n, 0, 0, 0);
return { sciezka, region: R, hits: hits.slice(0, 12) };
