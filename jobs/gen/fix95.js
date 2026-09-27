//# opis: #95 Secondary widoczny na tle strony
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cPrim = kol.find(c => c.name === 'Primitives');
const prim = {}; for (const v of wszystkie) if (v.variableCollectionId === cPrim.id) prim[v.name] = v;
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const log = {};
// kontener neutralny odróżnialny od tła strony
V['color/neutral-container'].setValueForMode(cLight.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: prim['neutral/200'].id });
const w = prim['neutral/200'].valuesByMode[cPrim.modes[0].modeId];
log.neutralContainer = [Math.round(w.r*255), Math.round(w.g*255), Math.round(w.b*255)];
// akcja pomocnicza wszędzie w stylu Secondary
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
log.przyciski = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Button')) {
    const p = b.componentProperties || {};
    const kL = Object.keys(p).find(x => x.split('#')[0] === 'Label');
    const et = kL ? String(p[kL].value) : '';
    if (!/^(Anuluj|Zamknij)$/.test(et)) continue;
    if (!p['Style'] || p['Style'].value === 'Secondary') continue;
    b.setProperties({ Style: 'Secondary' });
    log.przyciski.push(f.name + ' / ' + et + ': Outline → Secondary');
  }
  if (/^1[34] /.test(f.name)) await shot(f, { scale: 0.7, name: 'vAL-' + f.name.split(' ')[0] });
}
return log;
