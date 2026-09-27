//# opis: diagnoza Text field + nawigacja + przyciski
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const sets = ds.findAll(n => n.type === 'COMPONENT_SET' && n.name === 'Text field');
const out = { sets: sets.length, variants: [] };
async function describe(n, depth, acc) {
  const info = { name: n.name, type: n.type, d: depth };
  if (n.type === 'TEXT') {
    info.chars = n.characters;
    info.visible = n.visible;
    const f = n.fills && n.fills[0];
    info.fill = f ? (f.type === 'SOLID' ? [Math.round(f.color.r*255),Math.round(f.color.g*255),Math.round(f.color.b*255), f.opacity] : f.type) : null;
    info.bound = n.boundVariables && n.boundVariables.fills ? n.boundVariables.fills.map(b=>b.id) : null;
  }
  if ('fills' in n && n.type !== 'TEXT') {
    const f = n.fills && n.fills[0];
    info.fill = f ? (f.type === 'SOLID' ? [Math.round(f.color.r*255),Math.round(f.color.g*255),Math.round(f.color.b*255)] : f.type) : null;
    info.bound = n.boundVariables && n.boundVariables.fills ? n.boundVariables.fills.map(b=>b.id) : null;
  }
  acc.push(info);
  if ('children' in n) for (const c of n.children) await describe(c, depth+1, acc);
}
if (sets[0]) {
  for (const v of sets[0].children) {
    const acc = [];
    await describe(v, 0, acc);
    out.variants.push({ variant: v.name, tree: acc });
  }
}
// nazwy zmiennych
const vars = await figma.variables.getLocalVariablesAsync();
out.varNames = {};
vars.forEach(v => out.varNames[v.id] = v.name);
return out;
