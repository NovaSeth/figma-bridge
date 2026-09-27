//# opis: kontrast: ciemniejszy tekst bledu i wygaszone dni
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const cPrim = kol.find(c => c.name === 'Primitives');
const prim = {}; for (const v of wszystkie) if (v.variableCollectionId === cPrim.id) prim[v.name] = v;
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const hex = v => { const w = v.valuesByMode[cPrim.modes[0].modeId]; return w && w.r !== undefined ? [Math.round(w.r*255), Math.round(w.g*255), Math.round(w.b*255)] : null; };
const log = { czerwienie: {} };
for (const n of Object.keys(prim).filter(x => /^red|^neutral/.test(x))) log.czerwienie[n] = hex(prim[n]);
const lum = c => { const f = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126 * f(c[0]/255) + 0.7152 * f(c[1]/255) + 0.0722 * f(c[2]/255); };
const kontrast = (a, b2) => { const l1 = lum(a), l2 = lum(b2); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
const tloBledu = hex(prim['red/200']);
log.kandydaci = {};
for (const n of ['red/600','red/700']) log.kandydaci[n] = { kontrast: +kontrast(hex(prim[n]), tloBledu).toFixed(2) };
// najciemniejszy dostepny
const najlepszy = ['red/700','red/600'].find(n => kontrast(hex(prim[n]), tloBledu) >= 4.5);
if (najlepszy) {
  V['color/on-error-container'].setValueForMode(cLight.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: prim[najlepszy].id });
  log.ustawione = 'color/on-error-container → ' + najlepszy;
} else {
  // tlo jasniejsze, zeby ciemna czerwien miala zapas
  V['color/error-container'].setValueForMode(cLight.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: prim['red/200'].id });
  log.ustawione = 'brak pary ≥4,5 — trzeba jaśniejszego tła';
}
return log;
