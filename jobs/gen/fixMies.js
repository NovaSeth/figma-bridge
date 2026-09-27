//# opis: siatka miesiaca - margines, weekendy poza miesiacem, etykiety
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.5, g: 0.5, b: 0.5 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '17 Plan · miesiąc');
const grid = f.findOne(n => n.name === 'MonthGrid');
const log = { przed: { pad: [grid.paddingLeft, grid.paddingRight], w: Math.round(grid.width), x: Math.round(grid.x) } };
// 1. siatka trzyma margines ekranu
grid.paddingLeft = 4; grid.paddingRight = 4;
log.po = { pad: [grid.paddingLeft, grid.paddingRight], w: Math.round(grid.width) };
// 2. dni spoza miesiąca wyszarzone niezależnie od dnia tygodnia
const poza = grid.children.filter(c => /sierpnia|października/.test(c.name));
log.poza = [];
for (const c of poza) {
  for (const t of c.findAll(n => n.type === 'TEXT')) {
    t.fills = [paint('color/outline')];
    log.poza.push(c.name + ' / ' + t.characters);
  }
}
// 3. etykiety zadań jednym wzorem
log.etykiety = [];
for (const t of grid.findAll(n => n.type === 'TEXT' && /^Zadanie$/.test(n.characters.trim()))) {
  t.characters = '1 zad.';
  log.etykiety.push('Zadanie → 1 zad.');
}
for (const t of grid.findAll(n => n.type === 'TEXT' && /^Sprząt\.$/.test(n.characters.trim()))) {
  t.characters = 'Szkoła';
  log.etykiety.push('Sprząt. → Szkoła');
}
await shot(f, { scale: 0.8, name: 'vP-17' });
return log;
