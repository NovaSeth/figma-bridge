//# opis: 05a Zadania - przywracanie z archiwum
const NAZWA = '05a Zadania · przywracanie z archiwum';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = {}; vars.forEach(v => { byId[v.id] = v; });
const colById = {}; cols.forEach(c => { colById[c.id] = c; });
const rozwin = v => { let w = v.valuesByMode[colById[v.variableCollectionId].modes[0].modeId]; let i = 0; while (w && w.type === 'VARIABLE_ALIAS' && i++ < 8) { const n = byId[w.id]; w = n.valuesByMode[colById[n.variableCollectionId].modes[0].modeId]; } return w; };
const paint = (nazwa, kolekcja) => { const v = vars.find(x => x.name === 'color/' + nazwa && x.variableCollectionId === cols.find(c => c.name === kolekcja).id); const c = rozwin(v); return [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b } }, 'color', v)]; };
const setProp = (i, name, value) => { const k = Object.keys(i.componentProperties).find(x => x === name || x.startsWith(name + '#')); if (k) i.setProperties({ [k]: value }); };
const log = [];
for (const sec of page.children.filter(c => c.type === 'SECTION')) {
  const kol = sec.name === 'Jasny motyw' ? 'Color' : 'Color Dark';
  const stary = sec.children.find(c => c.name === NAZWA);
  if (stary) stary.remove();
  const baza = sec.children.find(c => c.name === '05 Zadania · zrobione i archiwum');
  const ekran = baza.clone();
  ekran.name = NAZWA;
  sec.appendChild(ekran);
  ekran.x = 4858; ekran.y = 2923;
  const main = ekran.children.find(c => c.name === 'Main Content');

  // 1. Baner cofniecia — stoi pod zdaniem podsumowania, nad pierwszym naglowkiem
  //    sekcji (TasksScreen.swift). Tonu Success nie ma w pliku nigdzie indziej,
  //    wiec klonujemy ostrzegawczy i przewiazujemy kolory do kolekcji tej sekcji.
  const zrodloBaner = sec.children.find(c => c.name === '25 Stan · wygasła sesja Librusa');
  const banerWzorMargin = zrodloBaner.findOne(n => n.name === 'Alert:margin');
  const blok = banerWzorMargin.clone();
  blok.name = 'Alert:margin';
  blok.paddingTop = 16;
  main.insertChild(1, blok);
  blok.layoutAlign = 'STRETCH';
  const baner = blok.findOne(n => n.type === 'INSTANCE' && n.name === 'Banner');
  setProp(baner, 'Tone', 'Success');
  setProp(baner, 'Show action', true);
  setProp(baner, 'Text', 'Zadanie „Nazwy obrazków: podziel na sylaby (zeszyt)” trafiło do archiwum.');
  baner.fills = paint('success-container', kol);
  const banerTekst = baner.findOne(n => n.type === 'TEXT' && n.name === 'Text');
  banerTekst.fills = paint('on-success-container', kol);
  const akcja = baner.findOne(n => n.type === 'INSTANCE' && n.name === 'Action');
  akcja.visible = true;
  setProp(akcja, 'Label', 'Przywróć');
  setProp(akcja, 'Show icon', false);
  akcja.strokes = paint('inverse-surface', kol);
  akcja.findOne(n => n.type === 'TEXT' && n.name === 'Label').fills = paint('inverse-surface', kol);

  // 2. Pigulka „Przywroc" w karcie archiwum — ta sama geometria i ten sam styl
  //    co „Archiwizuj" w zadaniach otwartych (TasksScreen.swift, archivedSection).
  const dzisLista = main.children[2].findOne(n => n.name === 'List' && n.type === 'FRAME');
  const pigulkaWzor = dzisLista.children.find(n => n.name === 'List Item');
  const archMargin = main.children[main.children.length - 1];
  const archLista = archMargin.findOne(n => n.name === 'List' && n.type === 'FRAME');
  const pigulka = pigulkaWzor.clone();
  archLista.appendChild(pigulka);
  pigulka.layoutAlign = 'STRETCH';
  setProp(pigulka.findOne(n => n.type === 'INSTANCE' && n.name === 'Button'), 'Label', 'Przywróć');

  ekran.primaryAxisSizingMode = 'AUTO';
  log.push({ sekcja: sec.name, h: Math.round(ekran.height), kolejnosc: main.children.map(c => c.name) });
}
return log;
