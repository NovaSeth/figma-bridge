//# opis: mapa id->nazwa zmiennych
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const out = {};
for (const v of vars) out[v.id] = (kol.find(c => c.id === v.variableCollectionId) || {}).name + '::' + v.name;
return out;
