//# opis: Secondary kontra tlo strony
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cPrim = kol.find(c => c.name === 'Primitives');
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const rozwin = v => { let w = v.valuesByMode[kol.find(c => c.id === v.variableCollectionId).modes[0].modeId]; let i = 0;
  while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; if (!n) return null; w = n.valuesByMode[kol.find(c => c.id === n.variableCollectionId).modes[0].modeId]; } return w; };
const hex = n => { const w = rozwin(V[n]); return w ? [Math.round(w.r*255), Math.round(w.g*255), Math.round(w.b*255)] : null; };
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const przyciski = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button')) {
    const p = b.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const et = kL ? String(p[kL].value) : '';
    if (!/Anuluj|Zamknij|Pokaż ogłoszenie|Odpowiedz/.test(et)) continue;
    przyciski.push({ screen: f.name, label: et, styl: p['Style'] ? p['Style'].value : '?', naTle: b.parent && b.parent.name });
  }
}
return { neutralContainer: hex('color/neutral-container'), background: hex('color/background'), surface: hex('color/surface'), przyciski };
