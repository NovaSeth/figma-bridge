//# opis: macierz Segmented control i wlasciwosc Value w List row
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const seg = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Segmented control');
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
const warstwy = lr.children.slice(0, 3).map(c => ({ n: c.name, kids: c.findAll(x => x.type === 'TEXT' || x.name === 'Trailing').map(x => x.name + ':' + x.type + ':' + JSON.stringify(x.componentPropertyReferences || {})) }));
return {
  seg: { warianty: seg.children.map(c => c.name), props: Object.keys(seg.componentPropertyDefinitions).map(k => k.split('#')[0] + ':' + seg.componentPropertyDefinitions[k].type) },
  lrProps: Object.keys(lr.componentPropertyDefinitions).map(k => k.split('#')[0] + ':' + lr.componentPropertyDefinitions[k].type),
  lrWarianty: lr.children.map(c => c.name),
  warstwy
};
