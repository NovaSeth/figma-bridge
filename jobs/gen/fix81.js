//# opis: #81 biale tla pol tekstowych (jasny motyw)
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const vars = await figma.variables.getLocalVariablesAsync();
const surface = vars.find(v => v.name === 'color/surface');
const before = [];
const fixed = [];
for (const f of light.children) {
  if (f.type !== 'FRAME') continue;
  // wszystkie pola: instancje Text field i recznie rysowane "Input"
  for (const n of f.findAll(x => x.name === 'Input' && 'fills' in x)) {
    const p = n.fills && n.fills[0];
    const rgb = p && p.type === 'SOLID' ? [Math.round(p.color.r*255),Math.round(p.color.g*255),Math.round(p.color.b*255)] : null;
    const bound = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0];
    const varName = bound ? (vars.find(v => v.id === bound.id) || {}).name : null;
    before.push({ screen: f.name, path: n.parent && n.parent.name, rgb, varName });
    if (varName === 'color/surface') continue;
    if (!surface) continue;
    try {
      n.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', surface)];
      fixed.push({ screen: f.name, path: n.parent && n.parent.name, from: rgb, fromVar: varName });
    } catch (e) { fixed.push({ screen: f.name, blad: e.message }); }
  }
}
return { sprawdzone: before.length, fixed, probka: before.slice(0, 6) };
