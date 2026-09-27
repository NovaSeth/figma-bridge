//# opis: tlo samych ramek i sekcji w ciemnym motywie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const cLight = kol.find(c => c.name === 'Color');
const cDark = kol.find(c => c.name === 'Color Dark');
const ciemnaPoNazwie = {};
for (const v of wszystkie) if (v.variableCollectionId === cDark.id) ciemnaPoNazwie[v.name] = v;
const sek = page.children.find(s => s.type === 'SECTION' && s.name === 'Ciemny motyw');
const log = { ramki: 0, sekcja: null };
for (const f of sek.children) {
  if (f.type !== 'FRAME') continue;
  const p = f.fills && f.fills !== figma.mixed && f.fills[0];
  if (!p || p.type !== 'SOLID') continue;
  const b = p.boundVariables && p.boundVariables.color;
  const jasna = b ? byId[b.id] : null;
  if (!jasna || jasna.variableCollectionId !== cLight.id) continue;
  const ciemna = ciemnaPoNazwie[jasna.name];
  if (!ciemna) continue;
  f.fills = [figma.variables.setBoundVariableForPaint(p, 'color', ciemna)];
  log.ramki++;
}
// tlo sekcji na ciemne, zeby kanwa nie swiecila
sek.fills = [{ type: 'SOLID', color: { r: 0.09, g: 0.09, b: 0.1 } }];
log.sekcja = 'tło sekcji przyciemnione';
const f = sek.children.find(x => x.name === '07 Wiadomości · odebrane');
await shot(f, { scale: 1, name: 'vD3-07' });
const f01 = sek.children.find(x => x.name === '01 Teraz');
await shot(f01, { scale: 1, name: 'vD3-01' });
return log;
