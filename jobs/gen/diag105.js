//# opis: wypelnienie siatki miesiaca
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const wszystkie = await figma.variables.getLocalVariablesAsync();
const byId = {}; wszystkie.forEach(v => { byId[v.id] = v; });
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '17 Plan · miesiąc');
const grid = f.findOne(n => n.type === 'FRAME' && n.name === 'MonthGrid');
const fl = grid.fills && grid.fills !== figma.mixed ? grid.fills : null;
const b = fl && fl[0] && fl[0].boundVariables && fl[0].boundVariables.color;
// gdzie siedzi w drzewie
let sciezka = [], p = grid;
while (p && p !== f) { sciezka.unshift(p.name + ':' + p.type + (p.fills && p.fills !== figma.mixed && p.fills.length ? '[ma tło]' : '')); p = p.parent; }
return { fills: fl ? fl.map(x => ({ t: x.type, vis: x.visible, op: x.opacity, rgb: x.type === 'SOLID' ? [Math.round(x.color.r*255), Math.round(x.color.g*255), Math.round(x.color.b*255)] : null })) : 'mixed/brak',
  token: b ? byId[b.id].name : 'brak', r: grid.cornerRadius, pad: [grid.paddingTop, grid.paddingRight, grid.paddingBottom, grid.paddingLeft], sciezka };
