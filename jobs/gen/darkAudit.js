//# opis: wartosci kolekcji Color Dark
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const rozwin = v => { let w = v.valuesByMode[kolById[v.variableCollectionId].modes[0].modeId]; let i = 0;
  while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kolById[n.variableCollectionId].modes[0].modeId]; } return w; };
const hex = w => w ? [Math.round(w.r*255), Math.round(w.g*255), Math.round(w.b*255)] : null;
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const out = [];
for (const v of wszystkie) {
  if (v.variableCollectionId !== cDark.id) continue;
  const j = wszystkie.find(x => x.name === v.name && x.variableCollectionId === cLight.id);
  const wd = hex(rozwin(v)), wj = j ? hex(rozwin(j)) : null;
  const takieSame = wd && wj && wd[0] === wj[0] && wd[1] === wj[1] && wd[2] === wj[2];
  out.push({ n: v.name, ciemny: wd, jasny: wj, identyczne: takieSame });
}
return { identyczne: out.filter(o => o.identyczne).map(o => o.n), wszystkie: out };
