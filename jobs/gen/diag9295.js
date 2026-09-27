//# opis: lokalizacja komentarzy 92-95
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = {};
// 92: region na ekranie 10
const f10 = await figma.getNodeByIdAsync('13:2');
const R = { x0: 147 - 143, y0: 401 - 68, x1: 147, y1: 401 };
const hits = [];
function walk(n, d, ox, oy, acc, reg) {
  if (d > 8) return;
  for (const c of ('children' in n ? n.children : [])) {
    const cx = ox + c.x, cy = oy + c.y;
    if (cx < reg.x1 && cx + c.width > reg.x0 && cy < reg.y1 && cy + c.height > reg.y0) {
      acc.push({ d, n: c.name, t: c.type, y: Math.round(cy), h: Math.round(c.height), txt: c.type === 'TEXT' ? c.characters.slice(0, 40) : null,
        props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ').slice(0, 130) : null });
      walk(c, d + 1, cx, cy, acc, reg);
    }
  }
}
walk(f10, 0, 0, 0, hits, R);
out.c92 = { ekran: f10.name, region: R, stos: hits.slice(-6) };
await shot(f10, { scale: 1, name: 'vAI-10' });
// 94: FAB na 11
const f11 = await figma.getNodeByIdAsync('14:2');
const fab = f11.children.find(c => c.name === 'FAB');
out.c94 = fab ? { props: Object.keys(fab.componentProperties || {}).map(k => k.split('#')[0] + '=' + JSON.stringify(fab.componentProperties[k].value)).join(' | '),
  dzieci: fab.findAll(n => true).map(n => n.name + ':' + n.type + ':' + n.visible).slice(0, 8) } : 'brak';
// 95: przycisk na 13
const f13 = await figma.getNodeByIdAsync('16:2');
out.c95 = f13.findAll(n => n.type === 'INSTANCE' && n.name === 'Button').map(b => Object.keys(b.componentProperties || {}).map(k => k.split('#')[0] + '=' + JSON.stringify(b.componentProperties[k].value)).join(' | '));
return out;
