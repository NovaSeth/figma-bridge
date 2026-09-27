//# opis: co wskazuja komentarze 89 i 90
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const PUNKTY = [{ nr: 89, id: '20:2', x: 270, y: 555 }, { nr: 90, id: '19:2', x: 299, y: 364 }];
const out = [];
for (const p of PUNKTY) {
  const f = await figma.getNodeByIdAsync(p.id);
  const stos = [];
  function walk(n, d, ox, oy) {
    if (d > 9) return;
    for (const c of ('children' in n ? n.children : [])) {
      const cx = ox + c.x, cy = oy + c.y;
      if (p.x >= cx - 2 && p.x <= cx + c.width + 2 && p.y >= cy - 2 && p.y <= cy + c.height + 2) {
        stos.push({ d, n: c.name, t: c.type, txt: c.type === 'TEXT' ? c.characters.slice(0, 26) : null,
          props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ') : null });
        walk(c, d + 1, cx, cy);
      }
    }
  }
  walk(f, 0, 0, 0);
  out.push({ nr: p.nr, ekran: f.name, stos: stos.slice(-4) });
}
return out;
