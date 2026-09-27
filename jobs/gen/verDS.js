//# opis: kontrola zmienionych komponentow w DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const nazwy = ['Banner','Checkbox','Sheet actions','Progress bar','App header','Cover top bar'];
const out = [];
let i = 0;
for (const n of nazwy) {
  const c = ds.findOne(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === n);
  if (!c) { out.push({ n, brak: true }); continue; }
  i++; progress(i / nazwy.length, n);
  await shot(c, { scale: 1, name: 'vDS-' + n.replace(/\s+/g, '_') });
  out.push({ n, typ: c.type, w: Math.round(c.width), h: Math.round(c.height) });
}
return out;
