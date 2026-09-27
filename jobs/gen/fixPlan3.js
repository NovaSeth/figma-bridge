//# opis: cofniecie koloru etykiet chipow, naglowki tylko w kalendarzu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {}; const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) { byId[v.id] = v; if (v.variableCollectionId === cLight.id) V[v.name] = v; }
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
// jak wygląda etykieta chipa w komponencie
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const wzorce = {};
if (set) for (const v of set.children) {
  const t = v.findOne(n => n.type === 'TEXT');
  if (!t) continue;
  const b = t.boundVariables && t.boundVariables.fills && t.boundVariables.fills[0];
  wzorce[v.name] = b ? (byId[b.id] || {}).name : 'brak';
}
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
// etykiety w chipach wracają do tokenu z komponentu wg tonu
const naprawione = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const chip of f.findAll(n => n.type === 'INSTANCE' && /^Chip/.test(n.name))) {
    const ton = chip.componentProperties && Object.keys(chip.componentProperties).find(x => x.split('#')[0] === 'Tone');
    const tonV = ton ? String(chip.componentProperties[ton].value) : 'Neutral';
    const klucz = Object.keys(wzorce).find(k => k.indexOf('Tone=' + tonV) >= 0);
    const token = klucz ? wzorce[klucz] : null;
    for (const t of chip.findAll(n => n.type === 'TEXT')) {
      if (!token || !V[token]) continue;
      t.fills = [paint(token)];
      naprawione.push(f.name + ' / ' + t.characters + ' → ' + token);
    }
  }
}
return { wzorce, n: naprawione.length, probka: naprawione.slice(0, 8) };
