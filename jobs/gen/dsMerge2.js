//# opis: kontrola stanu po scaleniu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const zestawy = ds.findAll(n => n.type === 'COMPONENT_SET').map(n => ({ n: n.name, w: n.children.map(c => c.name) }));
return zestawy.filter(z => /Calendar|Day|Chip|Legend/.test(z.n));
