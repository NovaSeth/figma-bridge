//# opis: warianty przycisku w DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v.name;
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
return {
  props: Object.keys(set.componentPropertyDefinitions).map(k => k.split('#')[0] + ':' + set.componentPropertyDefinitions[k].type + '=' + JSON.stringify(set.componentPropertyDefinitions[k].variantOptions || set.componentPropertyDefinitions[k].defaultValue)),
  warianty: set.children.map(c => {
    const b = c.boundVariables && c.boundVariables.fills && c.boundVariables.fills[0];
    const s = c.boundVariables && c.boundVariables.strokes && c.boundVariables.strokes[0];
    const t = c.findOne(n => n.type === 'TEXT');
    const bt = t && t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
    return { n: c.name, tlo: b ? byId[b.id] : 'brak', obrys: s ? byId[s.id] : (c.strokes && c.strokes.length ? 'bez tokenu' : 'brak'), tekst: bt ? byId[bt.id] : 'brak' };
  })
};
