//# opis: budowa komponentu Banner
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') && n.name === 'Banner');
const dump = n => ({ n: n.name, t: n.type, v: n.type === 'TEXT' ? n.characters : null, vis: n.visible,
  kids: 'children' in n ? n.children.map(dump) : null });
const props = set.type === 'COMPONENT_SET' ? set.componentPropertyDefinitions : set.componentPropertyDefinitions;
return { typ: set.type, props: Object.keys(props).map(k => k + ':' + props[k].type + '=' + JSON.stringify(props[k].defaultValue)),
  drzewo: set.type === 'COMPONENT_SET' ? set.children.map(dump) : dump(set) };
