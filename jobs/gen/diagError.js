//# opis: dlaczego wariant Error nie przyjmuje etykiety
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const defs = set.componentPropertyDefinitions;
const out = { defs: Object.keys(defs).map(k => k + ':' + defs[k].type) };
for (const c of set.children.filter(x => /Tone=(Error|Warning), Size=Default/.test(x.name))) {
  out[c.name] = c.children.map(k => ({ n: k.name, t: k.type, ref: JSON.stringify(k.componentPropertyReferences || null), v: k.type === 'TEXT' ? k.characters : null, vis: k.visible }));
}
return out;
