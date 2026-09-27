//# opis: komunikaty na 21 jako wiersze z DS
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
// wzorzec: gotowa lista z innego ekranu
const f01 = sec.children.find(x => x.name === '01 Teraz');
const wzorList = f01.findAll(n => n.type === 'FRAME' && n.name === 'List' && n.children.some(c => c.type === 'INSTANCE' && c.name === 'List row'))[0];
const wzorRow = wzorList.children.find(c => c.type === 'INSTANCE' && c.name === 'List row');
const f = sec.children.find(x => x.name === '21 Stan · pusto (Teraz)');
const log = [];
for (const stary of f.findAll(n => n.type === 'FRAME' && n.name === 'List' && !n.children.some(c => c.type === 'INSTANCE'))) {
  const t = stary.findOne(n => n.type === 'TEXT');
  if (!t) continue;
  const tresc = t.characters;
  const rodzic = stary.parent;
  const idx = rodzic.children.indexOf(stary);
  const lista = figma.createFrame();
  lista.name = 'List';
  lista.layoutMode = 'VERTICAL';
  lista.itemSpacing = 0;
  lista.cornerRadius = wzorList.cornerRadius;
  lista.fills = wzorList.fills.map(x => Object.assign({}, x));
  if (wzorList.boundVariables && wzorList.boundVariables.fills && wzorList.boundVariables.fills[0]) {
    const v = await figma.variables.getVariableByIdAsync(wzorList.boundVariables.fills[0].id);
    if (v) lista.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }, 'color', v)];
  }
  rodzic.insertChild(idx, lista);
  lista.layoutSizingHorizontal = 'FILL';
  const wiersz = wzorRow.clone();
  lista.appendChild(wiersz);
  wiersz.layoutSizingHorizontal = 'FILL';
  const p = wiersz.componentProperties || {};
  const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
  const set = {};
  if (k('Title')) set[k('Title')] = tresc;
  if (k('Show subtitle')) set[k('Show subtitle')] = false;
  if (k('Show chips top')) set[k('Show chips top')] = false;
  if (k('Show chips')) set[k('Show chips')] = false;
  if (k('Leading')) set[k('Leading')] = 'None';
  if (k('Trailing')) set[k('Trailing')] = 'None';
  wiersz.setProperties(set);
  lista.layoutSizingVertical = 'HUG';
  stary.remove();
  log.push({ tresc, h: Math.round(lista.height) });
}
await shot(f, { scale: 0.8, name: 'vT-21' });
return log;
