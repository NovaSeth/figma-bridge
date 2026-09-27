//# opis: diagnoza rzedu przyciskow na 13/14
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME' || f.name.indexOf('Nowa wiadomość') < 0) continue;
  const btns = f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button');
  const rows = [];
  for (const b of btns) {
    const p = b.parent;
    if (!rows.find(r => r.id === p.id)) rows.push({ id: p.id, name: p.name, type: p.type, layout: p.layoutMode, w: Math.round(p.width), padL: p.paddingLeft, padR: p.paddingRight, gap: p.itemSpacing,
      kids: p.children.map(c => ({ n: c.name, x: Math.round(c.x), w: Math.round(c.width), sizH: 'layoutSizingHorizontal' in c ? c.layoutSizingHorizontal : null, grow: c.layoutGrow, abs: c.layoutPositioning })) });
  }
  out.push({ screen: f.name, rows });
}
return out;
