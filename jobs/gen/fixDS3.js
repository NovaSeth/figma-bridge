//# opis: skladnia kodu, opisy stylow, kontrola tablicy
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const kolById = {}; kol.forEach(c => { kolById[c.id] = c; });
const log = { skladnia: [], opisy: [], pozaTablica: [] };
// 1. skladnia kodu dla kazdej zmiennej semantycznej
for (const v of await figma.variables.getLocalVariablesAsync()) {
  const c = kolById[v.variableCollectionId];
  if (c && c.name === 'Primitives') continue;
  const cs = v.codeSyntax || {};
  const web = 'var(--' + v.name.replace(/\//g, '-') + ')';
  if (cs.WEB !== web) { v.setVariableCodeSyntax('WEB', web); log.skladnia.push(v.name); }
  const bez = v.name.replace(/[^a-zA-Z0-9]+/g, '');
  if (!cs.ANDROID) v.setVariableCodeSyntax('ANDROID', v.name.replace(/\//g, '_').replace(/-/g, '_'));
  if (!cs.iOS) v.setVariableCodeSyntax('iOS', bez.charAt(0).toLowerCase() + bez.slice(1));
}
// 2. opisy stylow efektow
const OPISY = {
  'elevation/menu': 'Cień menu wysuwanego spod nagłówka (wybór dziecka).',
  'elevation/fab': 'Cień pływającego przycisku akcji nad treścią.',
  'elevation/sheet': 'Cień arkusza dolnego i menu wysuwanego znad treści.'
};
for (const s of await figma.getLocalEffectStylesAsync()) {
  if (s.description && s.description.trim()) continue;
  if (OPISY[s.name]) { s.description = OPISY[s.name]; log.opisy.push(s.name); }
}
// 3. czy komponenty sa na tablicy (szukam w calym poddrzewie)
const naTablicy = new Set();
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  const board = sek.children.find(c => c.name === 'Board');
  if (!board) continue;
  for (const n of board.findAll(x => x.type === 'COMPONENT' || x.type === 'COMPONENT_SET')) naTablicy.add(n.id);
}
for (const s of ds.findAll(n => n.type === 'COMPONENT_SET' || (n.type === 'COMPONENT' && (!n.parent || n.parent.type !== 'COMPONENT_SET')))) {
  if (!naTablicy.has(s.id)) log.pozaTablica.push(s.name);
}
return { skladnia: log.skladnia.length, opisy: log.opisy, pozaTablica: log.pozaTablica };
