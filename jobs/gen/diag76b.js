//# opis: diagnoza instancji na ekranach 11-14, 23
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const ids = ['14:2','15:2','16:2','17:2','26:2'];
const out = [];
for (const id of ids) {
  const f = await figma.getNodeByIdAsync(id);
  const rec = { id, name: f.name, h: f.height, layout: f.layoutMode, children: [] };
  for (const ch of f.children) {
    rec.children.push({
      name: ch.name, type: ch.type, y: Math.round(ch.y), h: Math.round(ch.height),
      sizV: 'layoutSizingVertical' in ch ? ch.layoutSizingVertical : null,
      grow: 'layoutGrow' in ch ? ch.layoutGrow : null,
      abs: 'layoutPositioning' in ch ? ch.layoutPositioning : null
    });
  }
  // pola tekstowe
  rec.fields = f.findAll(n => n.type === 'INSTANCE' && n.name.indexOf('Text field') >= 0).map(n => ({
    name: n.name, props: n.componentProperties ? Object.keys(n.componentProperties).map(k=>k+'='+JSON.stringify(n.componentProperties[k].value)) : null,
    texts: n.findAll(t => t.type === 'TEXT').map(t => ({ n: t.name, v: t.characters, vis: t.visible }))
  }));
  out.push(rec);
}
return out;
