//# opis: brakujace tokeny kontenera bledu
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const cPrim = kol.find(c => c.name === 'Primitives');
const wsz = await figma.variables.getLocalVariablesAsync();
const prim = {};
for (const v of wsz) if (cPrim && v.variableCollectionId === cPrim.id) prim[v.name] = v;
const log = { primitywy: Object.keys(prim).filter(n => /^red/.test(n)) };
const zrob = (kolekcja, nazwa, zrodlo, zakresy) => {
  let v = wsz.find(x => x.name === nazwa && x.variableCollectionId === kolekcja.id);
  if (!v) v = figma.variables.createVariable(nazwa, kolekcja, 'COLOR');
  v.setValueForMode(kolekcja.modes[0].modeId, { type: 'VARIABLE_ALIAS', id: prim[zrodlo].id });
  v.scopes = zakresy;
  v.setVariableCodeSyntax('WEB', 'var(--' + nazwa.replace(/\//g, '-') + ')');
  return v;
};
const ec = zrob(cLight, 'color/error-container', 'red/200', ['FRAME_FILL', 'SHAPE_FILL']);
const oec = zrob(cLight, 'color/on-error-container', 'red/700', ['TEXT_FILL']);
log.dodane = [ec.name, oec.name];
// ten sam zestaw w ciemnej kolekcji, żeby nie było dziury
if (cDark) {
  try { zrob(cDark, 'color/error-container', 'red/700', ['FRAME_FILL', 'SHAPE_FILL']); zrob(cDark, 'color/on-error-container', 'red/200', ['TEXT_FILL']); log.ciemna = true; } catch (e) { log.ciemna = e.message; }
}
// podpięcie pod chipy Error
const paint = (v, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', v);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
for (const c of set.children.filter(x => /Tone=Error/.test(x.name))) {
  c.fills = [paint(ec, { r: 0.98, g: 0.82, b: 0.82 })];
  const t = c.findOne(n => n.type === 'TEXT');
  if (t) t.fills = [paint(oec, { r: 0.7, g: 0.15, b: 0.12 })];
}
await shot(set, { scale: 1, name: 'vDS-chip' });
return log;
