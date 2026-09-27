//# opis: co sie stalo z wariantem Success
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = { name: v.name, col: (cols.find(c => c.id === v.variableCollectionId) || {}).name };
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Banner');
const dump = n => {
  const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0];
  const f = n.fills && n.fills !== figma.mixed && n.fills[0];
  return { n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), vis: n.visible, layout: n.layoutMode || null,
    fill: f && f.type === 'SOLID' ? [Math.round(f.color.r*255),Math.round(f.color.g*255),Math.round(f.color.b*255)] : (f ? f.type : 'brak'),
    token: b ? byId[b.id] : null,
    chars: n.type === 'TEXT' ? n.characters.slice(0, 30) : null,
    kids: 'children' in n ? n.children.map(dump) : null };
};
return set.children.map(dump);
