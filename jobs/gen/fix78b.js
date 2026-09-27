//# opis: #78 stopka na dole + arkusz szczegolow dnia 02h
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color'), cSize = cols.find(c => c.name === 'Size');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id || (cSize && v.variableCollectionId === cSize.id)) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const txt = async (chars, styleName, colorName) => {
  const t = figma.createText(); t.characters = chars;
  if (S[styleName]) await t.setTextStyleIdAsync(S[styleName].id);
  if (V[colorName]) t.fills = [paint(colorName)];
  t.textAutoResize = 'HEIGHT';
  return t;
};
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f02f = sec.children.find(x => x.name === '02f Teraz · frekwencja');
const main = f02f.children.find(c => c.name === 'Main Content');

// 1. stopka opisuje kalendarz, nie listę, i siedzi przy dole
const stopka = main.children.find(c => c.name === 'Foot');
if (stopka) {
  const t = stopka.findOne(n => n.type === 'TEXT');
  if (t) t.characters = 'Kolor pierścienia pokazuje obecność w danym dniu. Tapnij dzień, żeby zobaczyć szczegóły lekcji.';
  if (!main.children.find(c => c.name === 'Wypełniacz')) {
    const sp = figma.createFrame(); sp.name = 'Wypełniacz'; sp.fills = []; sp.resize(1, 1);
    main.insertChild(main.children.indexOf(stopka), sp);
    sp.layoutSizingHorizontal = 'FILL'; sp.layoutSizingVertical = 'FILL'; sp.layoutGrow = 1;
  }
}

// 2. nowy ekran: arkusz ze szczegolami dnia
const stary = sec.children.find(x => x.name === '02h Frekwencja · szczegóły dnia');
if (stary) stary.remove();
const wzor = sec.children.find(x => x.name === '02c Teraz · szczegóły ogłoszenia');
const f = wzor.clone();
f.name = '02h Frekwencja · szczegóły dnia';
sec.appendChild(f);
const f15b = sec.children.find(x => x.name === '15b Plan · szczegóły oferty zajęć');
f.x = f15b.x + 520; f.y = f15b.y;

// tło: ekran Frekwencji
const oldMain = f.children.find(c => c.name === 'Main Content');
const idxMain = f.children.indexOf(oldMain);
const newMain = main.clone();
f.insertChild(idxMain, newMain);
oldMain.remove();
newMain.layoutSizingHorizontal = 'FILL';
newMain.layoutSizingVertical = 'FILL';
newMain.layoutGrow = 1;
// ekran przykrywający nie ma paska zakładek ani nagłówka aplikacji
for (const c of f.children.slice()) if (c.name === 'Tab bar' || c.name === 'App header') c.remove();

// treść arkusza
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
for (const c of body.children.slice()) c.remove();
body.layoutSizingVertical = 'HUG';
body.itemSpacing = 12;

const naglowek = figma.createFrame();
naglowek.layoutMode = 'HORIZONTAL'; naglowek.itemSpacing = 14; naglowek.counterAxisAlignItems = 'CENTER'; naglowek.fills = []; naglowek.name = 'Podsumowanie dnia';
const R = 64;
const ringFrame = figma.createFrame(); ringFrame.name = 'Pierścień'; ringFrame.resize(R, R); ringFrame.fills = []; ringFrame.clipsContent = false;
const tor = figma.createEllipse(); tor.resize(R, R); tor.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.74 }; tor.fills = [paint('color/outline-variant')]; tor.name = 'Tor'; ringFrame.appendChild(tor);
const luk = figma.createEllipse(); luk.resize(R, R); luk.arcData = { startingAngle: -Math.PI / 2, endingAngle: Math.PI * 1.5, innerRadius: 0.74 }; luk.fills = [paint('color/success')]; luk.name = 'Obecność 100%'; ringFrame.appendChild(luk);
const proc = await txt('100%', 'label/sm-strong', 'color/success');
proc.textAlignHorizontal = 'CENTER'; proc.textAutoResize = 'NONE'; proc.resize(R, R); proc.textAlignVertical = 'CENTER'; proc.x = 0; proc.y = 0;
ringFrame.appendChild(proc);
naglowek.appendChild(ringFrame);
const kol = figma.createFrame(); kol.layoutMode = 'VERTICAL'; kol.itemSpacing = 2; kol.fills = []; kol.name = 'Opis';
const tyt = await txt('Czwartek, 17 września', 'headline/sm', 'color/on-surface');
const pod = await txt('Obecność na 4 z 4 lekcjach', 'body/md', 'color/on-surface-variant');
kol.appendChild(tyt); kol.appendChild(pod);
naglowek.appendChild(kol);
body.appendChild(naglowek);
naglowek.layoutSizingHorizontal = 'FILL'; naglowek.layoutSizingVertical = 'HUG';
kol.layoutSizingHorizontal = 'FILL'; kol.layoutSizingVertical = 'HUG';
tyt.layoutSizingHorizontal = 'FILL'; pod.layoutSizingHorizontal = 'FILL';

// lista lekcji
const LEKCJE = [
  ['1', 'Edukacja wczesnoszkolna', 'Obecność'],
  ['2', 'Edukacja wczesnoszkolna', 'Obecność'],
  ['3', 'Język angielski', 'Obecność'],
  ['4', 'Wychowanie fizyczne', 'Obecność']
];
const lista = figma.createFrame();
lista.name = 'List'; lista.layoutMode = 'VERTICAL'; lista.itemSpacing = 0; lista.cornerRadius = 20;
lista.fills = [paint('color/surface')];
lista.strokes = [paint('color/outline-variant')]; lista.strokeWeight = 1; lista.strokeAlign = 'INSIDE'; lista.clipsContent = true;
for (let i = 0; i < LEKCJE.length; i++) {
  if (i) { const sep = figma.createRectangle(); sep.name = 'Separator'; sep.resize(10, 1); sep.fills = [paint('color/outline-variant')]; lista.appendChild(sep); sep.layoutSizingHorizontal = 'FILL'; }
  const w = figma.createFrame();
  w.name = 'Lekcja ' + LEKCJE[i][0]; w.layoutMode = 'HORIZONTAL'; w.itemSpacing = 12; w.counterAxisAlignItems = 'CENTER'; w.fills = [];
  w.paddingTop = 12; w.paddingBottom = 12; w.paddingLeft = 16; w.paddingRight = 16;
  const nr = await txt(LEKCJE[i][0] + '.', 'label/md-strong', 'color/on-surface-variant');
  nr.textAutoResize = 'WIDTH_AND_HEIGHT';
  const nazwa = await txt(LEKCJE[i][1], 'title/sm', 'color/on-surface');
  const kropka = figma.createEllipse(); kropka.resize(10, 10); kropka.fills = [paint('color/success')]; kropka.name = 'Status';
  const stan = await txt(LEKCJE[i][2], 'label/sm', 'color/on-surface-variant'); stan.textAutoResize = 'WIDTH_AND_HEIGHT';
  w.appendChild(nr); w.appendChild(nazwa); w.appendChild(kropka); w.appendChild(stan);
  lista.appendChild(w);
  w.layoutSizingHorizontal = 'FILL'; w.layoutSizingVertical = 'HUG';
  nazwa.layoutSizingHorizontal = 'FILL';
}
body.appendChild(lista);
lista.layoutSizingHorizontal = 'FILL'; lista.layoutSizingVertical = 'HUG';

// arkusz przy dole, ekran na wysokość urządzenia
sheet.layoutSizingVertical = 'HUG';
f.primaryAxisSizingMode = 'FIXED';
f.resize(402, 874);
f.clipsContent = true;
const scrim = f.children.find(c => c.name === 'Scrim');
if (scrim) { scrim.x = 0; scrim.y = 0; scrim.resize(402, 874); }
sheet.y = 874 - sheet.height;
// akcje w tym arkuszu są zbędne
const act = sheet.children.find(c => c.name === 'Sheet actions');
if (act) act.remove();
sheet.y = 874 - sheet.height;

await shot(f02f, { scale: 1, name: 'v78-frekwencja' });
await shot(f, { scale: 1, name: 'v78-dzien' });
return { f02f: Math.round(f02f.height), nowy: f.name, x: Math.round(f.x), y: Math.round(f.y), sheetH: Math.round(sheet.height), kids: f.children.map(c => c.name) };
