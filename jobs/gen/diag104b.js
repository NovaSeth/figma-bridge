//# opis: kolory ikon i opisow w pustych stanach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const out = [];
for (const sek of page.children.filter(c => c.type === 'SECTION')) {
  for (const f of sek.children) {
    if (f.type !== 'FRAME') continue;
    for (const es of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Empty state')) {
      const kolo = es.findOne(n => n.name === 'Icon circle');
      const kb = kolo && kolo.fills && kolo.fills[0] && kolo.fills[0].boundVariables && kolo.fills[0].boundVariables.color;
      const w = es.findOne(n => n.type === 'VECTOR');
      const wb = w && w.fills && w.fills[0] && w.fills[0].boundVariables && w.fills[0].boundVariables.color;
      const teksty = es.findAll(n => n.type === 'TEXT');
      const opis = teksty[teksty.length - 1];
      const ob = opis && opis.fills && opis.fills[0] && opis.fills[0].boundVariables && opis.fills[0].boundVariables.color;
      out.push({ sek: sek.name.slice(0, 6), screen: f.name.slice(0, 22),
        kolo: kb ? byId[kb.id].name : 'brak', ikona: wb ? byId[wb.id].name : 'brak', opis: ob ? byId[ob.id].name : 'brak' });
    }
  }
}
return out;
