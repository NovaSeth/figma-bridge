//# opis: 15c Plan - zastepstwo i lekcja odwolana
const NAZWA = '15c Plan · zastępstwo i lekcja odwołana';
const ZDANIE = '2 lekcje, od 8:40 do 11:25. Pierwsza lekcja jest odwołana, zajęcia zaczynają się o 8:40. '
  + 'Odwołane: edukacja wczesnoszkolna, wychowanie fizyczne. Zastępstwo na lekcji 2. '
  + '2 zadania na ten dzień. Sprzątanie Świata. Koniki o 16:00.';
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const s of ['Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold']) await figma.loadFontAsync({ family: 'Inter', style: s });
const style = await figma.getLocalTextStylesAsync();
const TS = n => style.find(s => s.name === n);
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
  const baza = sec.children.find(c => c.name === '15 Plan · dzień');
  const ekran = baza.clone();
  ekran.name = NAZWA;
  sec.appendChild(ekran);
  ekran.x = 1726; ekran.y = 7100;
  const main = ekran.children.find(c => c.name === 'Main Content');

  // 1. Zdanie podsumowania. Sklada je PlanSentences.daySummary: liczba lekcji to
  //    lekcje, ktore sie ODBEDA, a godziny to godziny obecnosci w szkole.
  const zdanie = main.findOne(n => n.type === 'TEXT' && n.characters.indexOf('4 lekcje, od 7:45') === 0);
  zdanie.characters = ZDANIE;

  // 2. Bloki lekcji.
  const lista = main.findOne(n => n.type === 'FRAME' && n.name.indexOf('List - Plan') === 0);
  const bloki = [];
  for (const i of lista.children) { const mc = await i.getMainComponentAsync(); if (mc && mc.parent && mc.parent.name === 'Calendar event') bloki.push(i); }
  const plan = [
    { stan: 'Cancelled', meta: 'Odwołana, 7:45 do 8:30, Lekcja 1' },
    { stan: 'Substituted', meta: 'Zastępstwo, 8:40 do 9:25, Lekcja 2' },
    { stan: 'Cancelled', meta: 'Odwołana, 9:35 do 10:20, Lekcja 3' },
    null, null
  ];
  for (let k = 0; k < bloki.length; k++) {
    const p = plan[k];
    if (!p) continue;
    const b = bloki[k];
    const wys = b.height, y = b.y;
    setProp(b, 'State', p.stan);
    setProp(b, 'Meta', p.meta);
    b.y = y; b.resize(b.width, wys);
    const tyt = b.findOne(n => n.type === 'TEXT' && n.name === 'Title');
    const met = b.findOne(n => n.type === 'TEXT' && n.name === 'Meta');
    await met.setTextStyleIdAsync(TS('calendar/label').id);
    if (p.stan === 'Cancelled') {
      // Sam obrys, bez wypelnienia: „pusto, to sie nie odbedzie" (PlanDayView.swift).
      b.fills = [];
      b.strokes = paint('outline', kol);
      b.strokeWeight = 1;
      b.strokeAlign = 'INSIDE';
      // Przekreslenie wchodzi tu, na instancji — w wariancie zestawu Figma
      // synchronizuje je miedzy wszystkimi szescioma wariantami naraz.
      await tyt.setTextStyleIdAsync(TS('label/md-strike').id);
      tyt.fills = paint('on-surface-variant', kol);
      met.fills = paint('on-surface-variant', kol);
    } else {
      b.fills = paint('primary-container', kol);
      b.strokes = paint('warning-strong', kol);
      b.strokeWeight = 1.5;
      b.strokeAlign = 'INSIDE';
      const pas = b.findOne(n => n.name === 'Accent');
      if (pas) pas.fills = paint('warning-strong', kol);
      tyt.fills = paint('on-primary-container', kol);
      met.fills = paint('warning-strong', kol);
    }
  }

  // 3. FAB stoi 16 px nad paskiem zakladek, a ramka urosla o wiersze zdania.
  const fab = ekran.children.find(c => c.name === 'FAB');
  const pasek = ekran.children.find(c => c.name === 'Tab bar');
  fab.y = ekran.height - pasek.height - 16 - fab.height;

  log.push({ sekcja: sec.name, h: Math.round(ekran.height), bloki: bloki.length, fabY: Math.round(fab.y) });
}
return log;
