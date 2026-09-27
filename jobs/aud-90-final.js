//# Audyt końcowy: wiązania, instancje, style, sieroty
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(), vars = await figma.variables.getLocalVariablesAsync();
const lightId = cols.find(c => c.name === 'Color').id, darkId = cols.find(c => c.name === 'Color Dark').id;
const byId = Object.fromEntries(vars.map(v => [v.id, v]));
const res = { frames: 0, instances: 0, unboundFill: 0, unboundStroke: 0, textNoStyle: 0, wrongTheme: 0, brokenInstances: 0, samples: [] };
for (const s of page.children.filter(n => n.type === 'SECTION')) { const wantId = s.name === 'Ciemny motyw' ? darkId : lightId;
  for (const [fi, f] of s.children.filter(n => n.type === 'FRAME').entries()) { res.frames++;
    for (const n of [f, ...f.findAll(() => true)]) {
      if (n.type === 'INSTANCE') { res.instances++; const mc = await n.getMainComponentAsync(); if (!mc || mc.removed) { res.brokenInstances++; if (res.samples.length < 8) res.samples.push('broken: ' + f.name.slice(0, 12) + '/' + n.name); } }
      for (const key of ['fills', 'strokes']) { const arr = n[key]; if (!Array.isArray(arr)) continue;
        for (const p of arr) { if (p.type !== 'SOLID' || p.visible === false) continue; const b = p.boundVariables && p.boundVariables.color;
          if (!b) { res[key === 'fills' ? 'unboundFill' : 'unboundStroke']++; if (res.samples.length < 8) res.samples.push('unbound ' + key + ': ' + f.name.slice(0, 12) + '/' + n.name.slice(0, 16)); continue; }
          const v = byId[b.id]; if (v && v.variableCollectionId !== wantId && (v.variableCollectionId === lightId || v.variableCollectionId === darkId)) { res.wrongTheme++; if (res.samples.length < 8) res.samples.push('theme: ' + f.name.slice(0, 12) + '/' + n.name.slice(0, 14) + ' ' + v.name); } } }
      if (n.type === 'TEXT' && !n.textStyleId) { res.textNoStyle++; }
    }
    progress((fi + 1) / s.children.length, 'Audyt ' + f.name.slice(0, 16)); } }
return res;
