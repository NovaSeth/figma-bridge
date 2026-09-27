//# opis: przywrocenie wysokosci przyciskow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const out = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME' || f.name.indexOf('Nowa wiadomość') < 0) continue;
  const compose = f.findOne(n => n.name === 'Compose');
  if (!compose) continue;
  const row = compose.children.find(c => c.layoutMode === 'HORIZONTAL' && c.children.filter(x => x.type === 'INSTANCE').length >= 2);
  if (!row) continue;
  for (const b of row.children.filter(c => c.type === 'INSTANCE')) {
    b.layoutSizingVertical = 'HUG';
  }
  row.layoutSizingVertical = 'HUG';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingTop = 16;
  out.push({ screen: f.name, rowH: Math.round(row.height), btns: row.children.map(c => c.name + ':' + Math.round(c.height)) });
}
return out;
