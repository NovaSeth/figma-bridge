//# opis: Calendar event - os State (Default/Substituted/Cancelled)
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const colId = n => cols.find(c => c.name === n).id;
const V = (name, collection) => vars.find(v => v.name === name && v.variableCollectionId === colId(collection || 'Color'));
const paint = (name, collection) => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V('color/' + name, collection))];
const style = (await figma.getLocalTextStylesAsync());
const TS = n => style.find(s => s.name === n);

const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar event');
const przed = set.children.map(c => c.name);

// 1. Istniejace warianty dostaja State=Default — os musi byc na kazdym wariancie.
for (const c of set.children) if (!/State=/.test(c.name)) c.name = c.name + ', State=Default';

const bazowy = set.children.find(c => c.name === 'Kind=Lesson, State=Default');
const KL = { title: 'Title#47:461', meta: 'Meta#47:471', showMeta: 'Show meta#47:466' };

const zbuduj = async (stan) => {
  let v = set.children.find(c => c.name === 'Kind=Lesson, State=' + stan);
  if (v) v.remove();
  v = bazowy.clone();
  set.appendChild(v);
  v.name = 'Kind=Lesson, State=' + stan;
  const tytul = v.findOne(n => n.type === 'TEXT' && n.name === 'Title');
  const meta = v.findOne(n => n.type === 'TEXT' && n.name === 'Meta');
  // Klon gubi referencje wlasciwosci — przypisujemy je z powrotem, inaczej
  // instancje zignoruja setProperties i pokaza domyslny tekst.
  tytul.componentPropertyReferences = { characters: KL.title };
  meta.componentPropertyReferences = { visible: KL.showMeta, characters: KL.meta };
  // Wiersz meta w stanie innym niz zwykly idzie na styl mocny (PlanDayView.swift).
  await meta.setTextStyleIdAsync(TS('calendar/label').id);
  return { v, tytul, meta };
};

// 2. Zastepstwo: wypelnienie jak zwykla lekcja PLUS pomaranczowy pas przy krawedzi
//    i obrys 1,5 px. Pas, nie ikona — DESIGN.md §4 zakazuje dokladania symboli.
const sub = await zbuduj('Substituted');
{
  const { v, tytul, meta } = sub;
  const tekst = figma.createFrame();
  tekst.name = 'Text';
  tekst.fills = [];
  tekst.layoutMode = 'VERTICAL';
  tekst.itemSpacing = 0;
  tekst.paddingLeft = 8; tekst.paddingRight = 8; tekst.paddingTop = 4; tekst.paddingBottom = 4;
  v.appendChild(tekst);
  tekst.appendChild(tytul); tekst.appendChild(meta);
  const pas = figma.createRectangle();
  pas.name = 'Accent';
  pas.fills = paint('warning-strong');
  v.insertChild(0, pas);
  v.layoutMode = 'HORIZONTAL';
  v.itemSpacing = 0;
  v.paddingLeft = v.paddingRight = v.paddingTop = v.paddingBottom = 0;
  v.clipsContent = true;
  pas.layoutAlign = 'STRETCH';
  pas.resize(4, v.height);
  tekst.layoutGrow = 1;
  tekst.layoutAlign = 'STRETCH';
  tytul.layoutAlign = 'STRETCH';
  meta.layoutAlign = 'STRETCH';
  v.fills = paint('primary-container');
  v.strokes = paint('warning-strong');
  v.strokeWeight = 1.5;
  v.strokeAlign = 'INSIDE';
  tytul.fills = paint('on-primary-container');
  meta.fills = paint('warning-strong');
}

// 3. Odwolana: sam obrys, bez wypelnienia („pusto, to sie nie odbedzie"),
//    tytul przekreslony, obrys szary — lekcja traci kolor rodziny „Lekcje".
const can = await zbuduj('Cancelled');
{
  const { v, tytul, meta } = can;
  v.fills = [];
  v.strokes = paint('outline');
  v.strokeWeight = 1;
  v.strokeAlign = 'INSIDE';
  // PRZEKRESLENIA NIE USTAWIAMY TUTAJ. Figma synchronizuje wlasciwosci tekstu
  // miedzy wariantami zestawu i zapala je na wszystkich szesciu naraz (sprawdzone
  // na nazwie warstwy, swiezym wezle i osobnym stylu). Tytul odwolanej lekcji
  // dostaje styl label/md-strike dopiero na instancji ekranu — tak samo, jak
  // przekreslone tytuly zadan zrobionych na ekranach 04 i 05.
  tytul.fills = paint('on-surface-variant');
  meta.fills = paint('on-surface-variant');
}

set.description = 'Blok w siatce godzin. Kind = kategoria, odpowiada czterem chipom legendy: Lesson, Own, Task, School. '
  + 'State = stan lekcji z Librusa (`cancelled`, `substitution` w kontrakcie): Default, '
  + 'Substituted (wypełnienie jak zwykła lekcja plus pas color/warning-strong przy lewej krawędzi i obrys 1,5 px, meta zaczyna się od słowa „Zastępstwo"), '
  + 'Cancelled (sam obrys color/outline bez wypełnienia, tytuł przekreślony, meta zaczyna się od słowa „Odwołana"). '
  + 'Meta w stanie innym niż Default idzie na styl calendar/label. State ma sens wyłącznie dla Kind=Lesson — pozostałe rodzaje mają tylko Default, zestaw jest celowo niepełny. '
  + 'Odwołana lekcja zostaje na swoim miejscu i ze swoją wysokością: dziura w dniu jest informacją. '
  + 'Wysokość instancji = czas trwania (60 px na godzinę w dniu, 52 px w tygodniu).';

return {
  przed,
  po: set.children.map(c => c.name),
  props: Object.keys(set.componentPropertyDefinitions),
  osie: set.componentPropertyDefinitions.State
};
