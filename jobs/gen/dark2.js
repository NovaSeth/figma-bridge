//# opis: mapa zmiennych jasny -> ciemny
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const wszystkie = await figma.variables.getLocalVariablesAsync();
const jasne = {}, ciemne = {};
for (const v of wszystkie) {
  if (v.variableCollectionId === cLight.id) jasne[v.name] = v.id;
  if (cDark && v.variableCollectionId === cDark.id) ciemne[v.name] = v.id;
}
const brakuje = Object.keys(jasne).filter(n => !ciemne[n]);
const nadmiar = Object.keys(ciemne).filter(n => !jasne[n]);
return { jasnych: Object.keys(jasne).length, ciemnych: Object.keys(ciemne).length, brakuje, nadmiar };
