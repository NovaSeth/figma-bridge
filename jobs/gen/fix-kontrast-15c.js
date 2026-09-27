//# opis: meta zastepstwa na on-primary-container (pomaranczowy tekst nie przechodzil 4,5:1)
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => { byId[v.id] = v; });
const colById = {}; cols.forEach(c => { colById[c.id] = c; });
const rozwin = v => { let w = v.valuesByMode[colById[v.variableCollectionId].modes[0].modeId]; let i = 0; while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; w = n.valuesByMode[colById[n.variableCollectionId].modes[0].modeId]; } return w; };
const paint = (nazwa, kolekcja) => { const v = vars.find(x => x.name === 'color/' + nazwa && x.variableCollectionId === cols.find(c => c.name === kolekcja).id); const c = rozwin(v); return [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }, 'color', v)]; };
const zmiany = [];
// 1. komponent
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const sub = set.children.find(x => x.name === 'Kind=Lesson, State=Substituted');
sub.findOne(n => n.type === 'TEXT' && n.name === 'Meta').fills = paint('on-primary-container', 'Color');
set.description = set.description.replace('meta w stylu calendar/label i w kolorze warning-strong, zaczyna się od słowa „Zastępstwo"',
  'meta w stylu calendar/label i w kolorze on-primary-container, zaczyna się od słowa „Zastępstwo" — pomarańcz niesie pas i obrys, bo color/warning-strong na color/primary-container daje w jasnym motywie 3,54:1, czyli poniżej progu 4,5:1 dla tekstu');
zmiany.push('komponent');
// 2. instancje na 15c
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const kol = sec.name === 'Jasny motyw' ? 'Color' : 'Color Dark';
  const e = sec.children.find(c => c.name === '15c Plan · zastępstwo i lekcja odwołana');
  for (const i of e.findAll(n => n.type === 'INSTANCE')) {
    const mc = await i.getMainComponentAsync();
    if (!mc || mc.name !== 'Kind=Lesson, State=Substituted') continue;
    i.findOne(n => n.type === 'TEXT' && n.name === 'Meta').fills = paint('on-primary-container', kol);
    zmiany.push(sec.name);
  }
}
return zmiany;
