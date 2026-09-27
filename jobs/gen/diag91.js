//# opis: co jest w polu Do na 02b
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('47:512');
const stos = [];
function walk(n, d, ox, oy) {
  if (d > 8) return;
  for (const c of ('children' in n ? n.children : [])) {
    const cx = ox + c.x, cy = oy + c.y;
    if (124 >= cx - 3 && 124 <= cx + c.width + 3 && 348 >= cy - 3 && 348 <= cy + c.height + 3) {
      stos.push({ d, id: c.id, n: c.name, t: c.type, txt: c.type === 'TEXT' ? c.characters : null,
        props: c.type === 'INSTANCE' && c.componentProperties ? Object.keys(c.componentProperties).map(k => k.split('#')[0] + '=' + JSON.stringify(c.componentProperties[k].value)).join(' | ') : null });
      walk(c, d + 1, cx, cy);
    }
  }
}
walk(f, 0, 0, 0);
// caly blok "Do"
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
const blokDo = body.children.map(c => ({ n: c.name, t: c.type, h: Math.round(c.height),
  kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type + (k.type === 'TEXT' ? '=' + k.characters.slice(0, 30) : '')) : null }));
return { stos, blokDo: blokDo.slice(0, 4) };
