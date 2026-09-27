//# opis: screeny do komentarzy 76/77
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const ids = ['14:2','15:2','16:2','17:2','26:2','18:2'];
const out = [];
for (const id of ids) {
  const n = await figma.getNodeByIdAsync(id);
  await shot(n, { scale: 1, name: 'c76-' + id.replace(':','-') });
  out.push({ id, name: n.name, w: n.width, h: n.height });
}
return out;
