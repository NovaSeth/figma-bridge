//# opis: domkniecie osi State w Calendar event
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const style = await figma.getLocalTextStylesAsync();
const TS = n => style.find(s => s.name === n);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const baza = set.children.find(x => x.name === 'Kind=Lesson, State=Default');
const can = set.children.find(x => x.name === 'Kind=Lesson, State=Cancelled');
const sub = set.children.find(x => x.name === 'Kind=Lesson, State=Substituted');
const tyt = can.children.find(n => n.type === 'TEXT' && n.componentPropertyReferences && n.componentPropertyReferences.characters);
const met = can.children.find(n => n !== tyt && n.type === 'TEXT');
tyt.name = 'Title'; met.name = 'Meta';
// Przekreslenie NIE moze siedziec w wariancie: Figma synchronizuje wlasciwosci
// tekstu miedzy wariantami zestawu i zapala je we wszystkich szesciu naraz
// (sprawdzone na nazwie warstwy, swiezym wezle i osobnym stylu). Stoi wiec
// jako nadpisanie na instancji ekranu 15c — tak samo, jak przekreslone tytuly
// zadan zrobionych na ekranach 04 i 05.
await tyt.setTextStyleIdAsync(TS('label/md').id);
tyt.fills = baza.children.find(n => n.type === 'TEXT').fills;
tyt.fills = can.__x || tyt.fills;
met.characters = '7:45 do 8:30, Lekcja 1';
// kolory tytulu i meta w stanie odwolanym: on-surface-variant
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const V = n => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === 'Color').id);
const paint = n => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V('color/' + n))];
tyt.fills = paint('on-surface-variant');
met.fills = paint('on-surface-variant');
set.description = 'Blok w siatce godzin. Kind = kategoria, odpowiada czterem chipom legendy: Lesson, Own, Task, School. '
  + 'State = stan lekcji z Librusa (pola `cancelled` i `substitution` w kontrakcie), prostopadły do Kind: '
  + 'Default; Substituted — wypełnienie jak zwykła lekcja plus pas color/warning-strong przy lewej krawędzi i obrys 1,5 px, meta w stylu calendar/label i w kolorze warning-strong, zaczyna się od słowa „Zastępstwo"; '
  + 'Cancelled — sam obrys color/outline, bez wypełnienia, tytuł i meta w color/on-surface-variant, meta zaczyna się od słowa „Odwołana". '
  + 'PRZEKREŚLENIE TYTUŁU w stanie Cancelled nakłada się na instancji, a nie tu: Figma synchronizuje textDecoration między wariantami zestawu i zapaliłoby je na wszystkich sześciu. Styl do nałożenia: label/md-strike. '
  + 'State ma sens wyłącznie dla Kind=Lesson — pozostałe rodzaje mają tylko Default, zestaw jest celowo niepełny. '
  + 'Odwołana lekcja zostaje na swoim miejscu i ze swoją wysokością: dziura w dniu jest informacją. '
  + 'Wysokość instancji = czas trwania (60 px na godzinę w dniu, 52 px w tygodniu).';
return { warianty: set.children.map(v => v.name), can: can.children.map(n => n.name + ':' + n.type), sub: sub.children.map(n => n.name + ':' + n.type) };
