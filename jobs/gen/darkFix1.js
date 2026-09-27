//# opis: tlo ramek ekranow na token
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const zm = (nazwa, ciemny) => wszystkie.find(v => v.name === nazwa && v.variableCollectionId === (ciemny ? cDark.id : cLight.id));
const log = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  const ciemny = sek.name === 'Ciemny motyw';
  const tlo = zm('color/background', ciemny);
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    const p = f.fills && f.fills !== figma.mixed && f.fills[0];
    const b = p && p.boundVariables && p.boundVariables.color;
    if (b) continue;
    const bazowy = p && p.type === 'SOLID' ? p.color : { r: 0.95, g: 0.95, b: 0.97 };
    f.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: bazowy }, 'color', tlo)];
    log.push(sek.name + ' / ' + f.name);
  }
}
return { poprawione: log.length, probka: log.slice(0, 6) };
