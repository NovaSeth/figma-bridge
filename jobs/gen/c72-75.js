//# #75 #74 białe tło pól, pole wyszukiwania bez etykiety, #72 nawigacja przy dole
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = (n, coll) => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === coll).id);
const paintVar = v => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
// #75: pola mają białe tło (surface), nie tło ekranu
const tf = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Text field');
let inputs = 0;
for (const v of tf.children) { const inp = v.findOne(n => n.name === 'Input'); if (inp) { inp.fills = paintVar(V('color/surface', 'Color')); inputs++; } }
if (!/białe/.test(tf.description)) tf.description += ' Pole ma tło powierzchni (białe w motywie jasnym), żeby odcinało się od szarego tła ekranu.';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); } catch (e) {} } };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) { const coll = s.name === 'Ciemny motyw' ? 'Color Dark' : 'Color';
  for (const f of s.children.filter(n => n.type === 'FRAME')) {
    // ciemny motyw: pola wiążemy z powierzchnią z właściwej kolekcji
    if (coll === 'Color Dark') for (const i of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field')) { const inp = i.findOne(n => n.name === 'Input'); if (inp) { inp.fills = paintVar(V('color/surface', 'Color Dark')); bump('pole-ciemne'); } }
    // #74: pole wyszukiwania bez etykiety nad polem, z podpowiedzią w środku
    for (const i of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Text field' && /Szukaj/.test(String(getP(x, 'Label') || '') + String(getP(x, 'Value') || '')))) {
      setP(i, 'Show label', false); setP(i, 'Value', 'Szukaj w wiadomościach'); bump('szukaj');
      const lbl = i.parent && i.parent.children.find(c => c !== i && T(c).some(t => /^Szukaj/.test(t.characters))); if (lbl) { lbl.remove(); bump('etykieta'); } }
    for (const t of T(f).filter(t => t.characters === 'Szukaj wiadomości' && !t.parent.name.startsWith('Input'))) { let w = t; while (w.parent && w.parent.children.length === 1 && w.parent.name !== 'Main Content') w = w.parent; if (w.parent && w.parent.name !== 'Main Content') { w.remove(); bump('etykieta'); } }
    // #72: dolna nawigacja zawsze przy dolnej krawędzi
    const main = f.children.find(c => c.name === 'Main Content'); const nav = f.findAll(x => x.type === 'INSTANCE' && x.name === 'Tab bar')[0];
    if (main && nav) { const gap = Math.round(f.height - (nav.absoluteBoundingBox.y - f.absoluteBoundingBox.y + nav.height));
      if (gap > 1) { main.layoutSizingVertical = 'FILL'; main.layoutGrow = 1; bump('nawigacja'); } }
  } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['07 ', 'd-07'], ['22 ', 'd-22'], ['13 ', 'd-13']]) { const f = get(p); if (f) await shot(f, { name: n, scale: 0.5 }); }
return { inputs, stat };
