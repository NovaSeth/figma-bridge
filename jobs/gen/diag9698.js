//# opis: lokalizacja 96, 97, 98
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const PUNKTY = [{ nr: 96, id: '20:2', x: 364, y: 107 }, { nr: 97, id: '21:2', x: 243, y: 849 }, { nr: 98, id: '21:2', x: 118, y: 902 }];
const out = [];
for (const p of PUNKTY) {
  const f = await figma.getNodeByIdAsync(p.id);
  const stos = [];
  function walk(n, d, ox, oy) {
    if (d > 9) return;
    for (const c of ('children' in n ? n.children : [])) {
      const cx = ox + c.x, cy = oy + c.y;
      if (p.x >= cx - 3 && p.x <= cx + c.width + 3 && p.y >= cy - 3 && p.y <= cy + c.height + 3) {
        stos.push({ d, n: c.name, t: c.type, y: Math.round(cy), h: Math.round(c.height), pad: 'paddingBottom' in c ? [c.paddingTop, c.paddingBottom] : null,
          txt: c.type === 'TEXT' ? c.characters.slice(0, 40) : null,
          props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ').slice(0, 120) : null });
        walk(c, d + 1, cx, cy);
      }
    }
  }
  walk(f, 0, 0, 0);
  out.push({ nr: p.nr, ekran: f.name, stos: stos.slice(-5) });
}
return out;
