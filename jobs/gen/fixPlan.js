//# opis: miesiac: dzis jako liczba, jednolite naglowki dni
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
const grid = (await figma.getNodeByIdAsync('20:75')).parent.parent;
const log = {};
// 1. dziś to liczba w wypełnionym kółku, nie ptaszek
const c18 = grid.children.find(c => /18 września/.test(c.name));
const c17 = grid.children.find(c => /17 września/.test(c.name));
const box = c18.children.find(c => c.name === 'Checkbox');
if (box && c17) {
  const wzor = c17.children.find(c => c.name === 'Text');
  const nowy = wzor.clone();
  c18.insertChild(c18.children.indexOf(box), nowy);
  box.remove();
  const t = nowy.findOne(n => n.type === 'TEXT');
  t.characters = '18';
  t.name = '18';
  t.fills = [paint('color/on-primary')];
  nowy.fills = [paint('color/primary')];
  nowy.cornerRadius = 13;
  nowy.name = 'Text';
  log.dzis = 'liczba 18 w kółku';
} else log.dzis = box ? 'brak wzorca' : 'już poprawione';
// 2. nagłówki dni tygodnia jednym kolorem
const naglowki = (await figma.getNodeByIdAsync('20:75')).parent.children;
log.naglowki = [];
for (const h of naglowki) {
  const t = h.type === 'TEXT' ? h : h.findOne(n => n.type === 'TEXT');
  if (!t) continue;
  t.fills = [paint('color/on-surface-variant')];
  log.naglowki.push(t.characters);
}
await shot(f17, { scale: 1, name: 'vA-17' });
return log;
