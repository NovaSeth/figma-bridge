//# opis: #81 pole odpowiedzi w 02b na biale
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const vars = await figma.variables.getLocalVariablesAsync();
const surface = vars.find(v => v.name === 'color/surface');
const nameOf = id => (vars.find(v => v.id === id) || {}).name;
const f = light.children.find(x => x.name === '02b Teraz · odpowiedź');
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const cand = [];
for (const n of sheet.findAll(x => 'fills' in x && x.type === 'FRAME')) {
  const p = n.fills && n.fills[0];
  if (!p || p.type !== 'SOLID') continue;
  const b = n.boundVariables && n.boundVariables.fills && n.boundVariables.fills[0];
  cand.push({ id: n.id, name: n.name, parent: n.parent && n.parent.name, w: Math.round(n.width), h: Math.round(n.height),
    stroke: n.strokes && n.strokes.length ? 1 : 0, varName: b ? nameOf(b.id) : null,
    rgb: [Math.round(p.color.r*255),Math.round(p.color.g*255),Math.round(p.color.b*255)] });
}
// pole = ramka z obrysem i szarym tlem
const done = [];
for (const c of cand) {
  if (c.stroke !== 1 || c.varName === 'color/surface' || !surface) continue;
  const n = await figma.getNodeByIdAsync(c.id);
  n.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', surface)];
  done.push(c.name + ' (' + c.varName + ' → color/surface)');
}
return { cand: cand.filter(c => c.stroke === 1), done };
