//# opis: #77 co jest na y=1350 w Plan dzien
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('18:2');
const Y = 1349.6;
const hits = [];
function walk(n, depth, ox, oy) {
  if (depth > 6) return;
  for (const c of ('children' in n ? n.children : [])) {
    const cy = oy + c.y, cx = ox + c.x;
    if (Y >= cy - 2 && Y <= cy + c.height + 2) {
      hits.push({ d: depth, id: c.id, name: c.name, type: c.type, y: Math.round(cy), h: Math.round(c.height),
        props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ') : null });
      walk(c, depth + 1, cx, cy);
    }
  }
}
walk(f, 0, 0, 0);
const texts = f.findAll(t => t.type === 'TEXT').filter(t => { let y = 0, n = t; while (n && n !== f) { y += n.y; n = n.parent; } return Math.abs(y - Y) < 160; }).map(t => t.characters);
return { frameH: Math.round(f.height), hits, nearTexts: texts };
