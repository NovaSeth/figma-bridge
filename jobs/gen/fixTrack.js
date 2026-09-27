//# opis: widoczny tor paska postepu w karcie podsumowania
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const pb of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Progress bar')) {
    const tor = pb.findOne(n => /track|Track|Tor/.test(n.name)) || pb.children[0];
    const b = tor && tor.boundVariables && tor.boundVariables.fills && tor.boundVariables.fills[0];
    out.push({ screen: f.name, tor: tor ? tor.name : null, token: b ? (byId[b.id] || {}).name : null, h: tor ? Math.round(tor.height) : null,
      kids: pb.children.map(c => c.name) });
  }
}
return out.slice(0, 6);
