//# opis: odstep i wyrownanie przyciskow Wyslij/Anuluj
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const ids = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME' || f.name.indexOf('Nowa wiadomość') < 0) continue;
  const compose = f.findOne(n => n.name === 'Compose');
  if (!compose) continue;
  const row = compose.children.find(c => c.layoutMode === 'HORIZONTAL' && c.findAll(x => x.type === 'INSTANCE' && (x.name === 'Primary' || x.name === 'Secondary' || x.name === 'Button')).length >= 2);
  if (row) ids.push({ screen: f.name, id: row.id });
}
const out = [];
for (const { screen, id } of ids) {
  const row = await figma.getNodeByIdAsync(id);
  const before = row.children.map(c => c.name + ':' + Math.round(c.height) + '@' + Math.round(c.y));
  row.layoutSizingVertical = 'HUG';
  row.paddingTop = 16;
  row.counterAxisAlignItems = 'CENTER';
  // oba przyciski tej samej wysokości
  const btns = row.children.filter(c => c.type === 'INSTANCE');
  const h = Math.max.apply(null, btns.map(b => b.height));
  for (const b of btns) { b.layoutSizingVertical = 'FIXED'; b.resize(b.width, h); }
  out.push({ screen, before, after: row.children.map(c => c.name + ':' + Math.round(c.height) + '@' + Math.round(c.y)), rowH: Math.round(row.height) });
}
return out;
