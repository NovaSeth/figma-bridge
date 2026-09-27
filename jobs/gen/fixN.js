//# opis: obrys listy w arkuszach na outline-variant + odstep w Frekwencji
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.89, g: 0.89, b: 0.91 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = { obrysy: [], separatory: 0, frekwencja: null };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const l of f.findAll(n => n.type === 'FRAME' && n.name === 'List' && n.strokes && n.strokes.length)) {
    l.strokes = [paint('color/outline-variant')];
    log.obrysy.push(f.name);
  }
  for (const s of f.findAll(n => n.name === 'Separator' && 'fills' in n)) {
    s.fills = [paint('color/outline-variant')];
    log.separatory++;
  }
}
// 02f: legenda i stopka bez wielkiej dziury
const f02f = sec.children.find(x => x.name === '02f Teraz · frekwencja');
if (f02f) {
  const main = f02f.children.find(c => c.name === 'Main Content');
  const wyp = main.children.find(c => c.name === 'Wypełniacz');
  if (wyp) { wyp.remove(); log.frekwencja = 'wypełniacz usunięty, stopka wraca pod legendę'; }
  main.itemSpacing = Math.max(main.itemSpacing || 0, 8);
  await shot(f02f, { scale: 0.8, name: 'vN-02f' });
}
log.obrysy = [...new Set(log.obrysy)];
return log;
