//# opis: lokalizacja komentarzy 83 i 84
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = await figma.getNodeByIdAsync('2:2');
const R = { x0: 2151 - 1476, y0: 1072, x1: 2151, y1: 1072 + 142 };
const hits = sec.children.filter(ch => ch.x + ch.width > R.x0 && ch.x < R.x1 && ch.y + ch.height > R.y0 && ch.y < R.y1)
  .map(ch => ({ id: ch.id, name: ch.name, x: Math.round(ch.x), y: Math.round(ch.y), h: Math.round(ch.height) }));
// co jest w punkcie 83
const f83 = await figma.getNodeByIdAsync('8:2');
const stack = [];
function walk(n, d, ox, oy) {
  if (d > 8) return;
  for (const c of ('children' in n ? n.children : [])) {
    const cx = ox + c.x, cy = oy + c.y;
    if (45 >= cx - 1 && 45 <= cx + c.width + 1 && 960 >= cy - 1 && 960 <= cy + c.height + 1) {
      stack.push({ d, id: c.id, name: c.name, type: c.type, y: Math.round(cy), h: Math.round(c.height),
        fill: c.fills && c.fills !== figma.mixed && c.fills[0] && c.fills[0].type === 'SOLID' ? [Math.round(c.fills[0].color.r*255),Math.round(c.fills[0].color.g*255),Math.round(c.fills[0].color.b*255)] : null,
        props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ') : null });
      walk(c, d + 1, cx, cy);
    }
  }
}
walk(f83, 0, 0, 0);
return { region84: { R, hits }, c83: { screen: f83.name, stack } };
