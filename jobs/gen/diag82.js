//# opis: lokalizacja komentarzy 78-82
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = await figma.getNodeByIdAsync('2:2');
const R = { x0: 4801 - 484, y0: 1232 - 995, x1: 4801, y1: 1232 };
const hits = sec.children.filter(ch => ch.x + ch.width > R.x0 && ch.x < R.x1 && ch.y + ch.height > R.y0 && ch.y < R.y1)
  .map(ch => ({ id: ch.id, name: ch.name, x: Math.round(ch.x), y: Math.round(ch.y), w: Math.round(ch.width), h: Math.round(ch.height) }));
// co jest w miejscach 78-81
const spots = [
  { c: 78, id: '47:2706', x: 318, y: 1077 },
  { c: 79, id: '5:2', x: 138, y: 723 },
  { c: 80, id: '47:131', x: 180, y: 513 },
  { c: 81, id: '47:512', x: 154, y: 338 }
];
const found = [];
for (const s of spots) {
  const f = await figma.getNodeByIdAsync(s.id);
  const stack = [];
  function walk(n, d, ox, oy) {
    if (d > 7) return;
    for (const c of ('children' in n ? n.children : [])) {
      const cx = ox + c.x, cy = oy + c.y;
      if (s.x >= cx - 1 && s.x <= cx + c.width + 1 && s.y >= cy - 1 && s.y <= cy + c.height + 1) {
        stack.push({ d, id: c.id, name: c.name, type: c.type, x: Math.round(cx), y: Math.round(cy), w: Math.round(c.width), h: Math.round(c.height), txt: c.type === 'TEXT' ? c.characters.slice(0, 60) : null });
        walk(c, d + 1, cx, cy);
      }
    }
  }
  walk(f, 0, 0, 0);
  found.push({ comment: s.c, screen: f.name, stack });
}
return { region82: { R, hits }, found };
