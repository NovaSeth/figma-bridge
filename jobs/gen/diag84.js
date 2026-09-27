//# opis: struktura Sheet actions i rzedu przyciskow
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === 'Sheet actions');
const dump = n => ({ n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), layout: n.layoutMode || null,
  gap: n.itemSpacing, pad: 'paddingLeft' in n ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] : null,
  sizH: 'layoutSizingHorizontal' in n ? n.layoutSizingHorizontal : null, grow: n.layoutGrow,
  kids: 'children' in n ? n.children.map(dump) : null });
return { typ: set ? set.type : 'brak', drzewo: set ? dump(set) : null };
