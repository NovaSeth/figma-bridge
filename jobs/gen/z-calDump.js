//# opis: dump wariantow Calendar event
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const nm = id => { const v = vars.find(x => x.id === id); return v ? (cols.find(c => c.id === v.variableCollectionId).name + '::' + v.name) : id; };
const o = (n, d) => {
  const r = { n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height),
    lay: n.layoutMode, grow: n.layoutGrow, la: n.layoutAlign,
    pad: 'paddingLeft' in n ? [n.paddingLeft, n.paddingTop, n.paddingRight, n.paddingBottom] : null };
  if ('fills' in n && n.fills !== figma.mixed) r.fills = n.fills.map(f => f.type + (f.visible === false ? '(off)' : '') + ':' + JSON.stringify(f.color));
  if (n.boundVariables && n.boundVariables.fills) r.fillVar = n.boundVariables.fills.map(v => nm(v.id));
  if ('strokes' in n && n.strokes.length) r.stroke = (n.boundVariables && n.boundVariables.strokes ? n.boundVariables.strokes.map(v => nm(v.id)) : 'wprost') + ' w=' + n.strokeWeight;
  if (n.type === 'TEXT') { r.txt = n.characters; r.deco = n.textDecoration; r.styl = n.textStyleId; r.ref = n.componentPropertyReferences; }
  if (d > 0 && 'children' in n) r.kids = n.children.map(c => o(c, d - 1));
  return r;
};
return set.children.map(c => o(c, 3));
