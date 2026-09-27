//# opis: kontrast bledu i stanu wylaczonego w ciemnym
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const cPrim = kol.find(c => c.name === 'Primitives');
const cDark = kol.find(c => c.name === 'Color Dark');
const prim = {}; for (const v of wszystkie) if (v.variableCollectionId === cPrim.id) prim[v.name] = v;
const VD = {}; for (const v of wszystkie) if (v.variableCollectionId === cDark.id) VD[v.name] = v;
const hex = v => { const w = v.valuesByMode[cPrim.modes[0].modeId]; return [Math.round(w.r*255), Math.round(w.g*255), Math.round(w.b*255)]; };
const log = { neutralDark: {}, dodane: [] };
for (const n of Object.keys(prim).filter(x => /neutral-dark|^neutral\//.test(x))) log.neutralDark[n] = hex(prim[n]);
// ciemny kontener bledu
let r900 = prim['red/900'];
if (!r900) {
  r900 = figma.variables.createVariable('red/900', cPrim, 'COLOR');
  r900.setValueForMode(cPrim.modes[0].modeId, { r: 0.286, g: 0.071, b: 0.063 });
  r900.scopes = [];
  log.dodane.push('red/900 = #49120F');
}
VD['color/error-container'].setValueForMode(cDark.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: r900.id });
// tekst stanu wylaczonego jasniejszy
let nd450 = prim['neutral-dark/450'];
if (!nd450) {
  nd450 = figma.variables.createVariable('neutral-dark/450', cPrim, 'COLOR');
  nd450.setValueForMode(cPrim.modes[0].modeId, { r: 0.6, g: 0.6, b: 0.62 });
  nd450.scopes = [];
  log.dodane.push('neutral-dark/450 = #99999E');
}
VD['color/on-disabled'].setValueForMode(cDark.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: nd450.id });
return log;
