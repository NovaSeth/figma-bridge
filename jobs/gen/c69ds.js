//# #69: porządek w DS po zmianie wzorca + kontrola ekranów
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
const used = page.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => i.name === 'Action card').length;
const out = { actionCardInstances: used };
if (!used) { const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Action card');
  const doc = ds.findOne(n => n.name === 'Doc · Action card');
  if (set) { set.remove(); out.removedComponent = true; } if (doc) { doc.remove(); out.removedDoc = true; } }
const lr = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'List row');
if (lr && !/akcja główna/.test(lr.description)) lr.description += ' Wzorzec sprawy do załatwienia: kółko po lewej to akcja główna i wskaźnik stanu (Material 3), tap w wiersz otwiera arkusz ze szczegółami i akcjami pobocznymi („Odpowiedz"), szewron po prawej to jedyna zapowiedź nawigacji. Bez przycisków w wierszu: w liście zostaje tylko to, co potrzebne do decyzji (termin, nazwa, źródło).';
await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
for (const [p, n] of [['03 ', 'q-03'], ['19 ', 'q-19'], ['02 ', 'q-02'], ['21 ', 'q-21']]) { const f = get(p); if (f) await shot(f, { name: n, scale: 0.42 }); }
const dark = page.children.find(n => n.name === 'Ciemny motyw').children.find(n => n.name.startsWith('01 '));
await shot(dark, { name: 'q-dark', scale: 0.42 });
return out;
