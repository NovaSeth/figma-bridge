//# Migracja M3: instancje w ciemnym motywie wiązane z kolekcją Color Dark
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(), vars = await figma.variables.getLocalVariablesAsync();
const lightId = cols.find(c => c.name === 'Color').id, darkId = cols.find(c => c.name === 'Color Dark').id;
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const darkByName = Object.fromEntries(vars.filter(v => v.variableCollectionId === darkId).map(v => [v.name, v]));
const sec = page.children.find(n => n.type === 'SECTION' && n.name === 'Ciemny motyw');
const stat = { fills: 0, strokes: 0, nodes: 0, missing: {} }; const errors = [];
for (const [fi, f] of sec.children.filter(n => n.type === 'FRAME').entries()) {
  for (const n of [f, ...f.findAll(() => true)]) {
    let touched = false;
    for (const key of ['fills', 'strokes']) { const arr = n[key]; if (!Array.isArray(arr) || !arr.length) continue;
      let changed = false; const next = arr.map(p => { const b = p.boundVariables && p.boundVariables.color; if (!b) return p; const v = byId[b.id]; if (!v || v.variableCollectionId !== lightId) return p;
        const d = darkByName[v.name]; if (!d) { stat.missing[v.name] = (stat.missing[v.name] || 0) + 1; return p; } changed = true; stat[key]++; return figma.variables.setBoundVariableForPaint(p, 'color', d); });
      if (changed) { try { n[key] = next; touched = true; } catch (e) { errors.push(n.name + ': ' + e.message); } } }
    if (touched) stat.nodes++;
  }
  progress((fi + 1) / sec.children.length, 'Ciemny ' + f.name.slice(0, 18));
}
return { stat: { fills: stat.fills, strokes: stat.strokes, nodes: stat.nodes, missing: Object.keys(stat.missing) }, errors: errors.slice(0, 8) };
