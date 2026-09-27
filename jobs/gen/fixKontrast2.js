//# opis: jasny odcien czerwieni + czytelne dni wygaszone
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const cPrim = kol.find(c => c.name === 'Primitives');
const prim = {}; for (const v of wszystkie) if (v.variableCollectionId === cPrim.id) prim[v.name] = v;
const V = {}; for (const v of wszystkie) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const log = {};
// 1. brakujacy jasny odcien czerwieni
let r100 = prim['red/100'];
if (!r100) {
  r100 = figma.variables.createVariable('red/100', cPrim, 'COLOR');
  r100.setValueForMode(cPrim.modes[0].modeId, { r: 0.988, g: 0.898, b: 0.890 });
  r100.scopes = [];
  prim['red/100'] = r100;
  log.primitiw = 'red/100 = #FCE5E3';
}
V['color/error-container'].setValueForMode(cLight.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: r100.id });
V['color/on-error-container'].setValueForMode(cLight.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: prim['red/700'].id });
// kontrola
const hex = v => { const w = v.valuesByMode[cPrim.modes[0].modeId]; return [w.r, w.g, w.b]; };
const lum = c => { const f = x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
const l1 = lum(hex(prim['red/700'])), l2 = lum(hex(r100));
log.kontrastBledu = +(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)).toFixed(2));
// 2. wygaszone dni czytelne: on-surface-variant zamiast outline
const paint = (nazwa, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[nazwa]);
log.dni = [];
for (const nazwa of ['Calendar day', 'Day ring']) {
  const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === nazwa);
  if (!set) continue;
  for (const v of set.children) {
    if (!/Weekend|Outside|Empty/.test(v.name)) continue;
    for (const t of v.findAll(n => n.type === 'TEXT')) {
      t.fills = [paint('color/on-surface-variant', { r: 0.37, g: 0.39, b: 0.41 })];
      log.dni.push(nazwa + ' / ' + v.name);
    }
  }
}
return log;
