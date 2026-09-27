//# opis: nowe komponenty trafiaja na tablice dokumentacji
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.1, g: 0.1, b: 0.1 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const WPISY = [
  { sekcja: 'Atomy', komponent: 'Calendar day', opis: 'Dzień w kalendarzu bez pierścienia. Size=Mini w miniaturach miesięcy (widok roku), Size=Badge w nagłówku tygodnia. Weekend i Outside są wygaszone, Event ma tło primary-container, Today jest wypełniony.' },
  { sekcja: 'Molekuły', komponent: 'Day ring', opis: 'Dzień w kalendarzu frekwencji. Pierścień pokazuje udział obecności w lekcjach danego dnia: Full = komplet, Partial = część, None = dzień nauki bez danych, Empty = weekend lub dzień poza okresem, Today = dzień bieżący. Liczba dnia siedzi w środku pierścienia.' }
];
const log = [];
for (const w of WPISY) {
  const sek = ds.children.find(c => c.type === 'SECTION' && c.name === w.sekcja);
  const board = sek.children.find(c => c.name === 'Board');
  const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === w.komponent);
  if (!board || !set) { log.push({ brak: w.komponent }); continue; }
  const nazwa = 'Doc · ' + w.komponent;
  for (const stary of board.children.filter(c => c.name === nazwa)) stary.remove();
  const wzor = board.children.find(c => /^Doc · /.test(c.name));
  const doc = figma.createFrame();
  doc.name = nazwa;
  doc.layoutMode = 'VERTICAL';
  doc.itemSpacing = wzor ? wzor.itemSpacing : 12;
  doc.fills = [];
  board.appendChild(doc);
  doc.layoutSizingHorizontal = 'FILL';
  const tytul = figma.createText();
  tytul.characters = w.komponent;
  tytul.name = w.komponent;
  if (S['title/md']) await tytul.setTextStyleIdAsync(S['title/md'].id);
  tytul.fills = [paint('color/on-surface')];
  tytul.textAutoResize = 'HEIGHT';
  doc.appendChild(tytul);
  tytul.layoutSizingHorizontal = 'FILL';
  const opis = figma.createText();
  opis.characters = w.opis;
  opis.name = w.opis.slice(0, 40);
  if (S['body/md']) await opis.setTextStyleIdAsync(S['body/md'].id);
  opis.fills = [paint('color/on-surface-variant')];
  opis.textAutoResize = 'HEIGHT';
  doc.appendChild(opis);
  opis.layoutSizingHorizontal = 'FILL';
  board.appendChild(doc);
  doc.appendChild(set);
  set.layoutPositioning = 'AUTO';
  doc.layoutSizingVertical = 'HUG';
  log.push({ komponent: w.komponent, sekcja: w.sekcja, h: Math.round(doc.height) });
}
// nic nie zostaje poza tablicą
const luzne = [];
for (const sek of ds.children.filter(c => c.type === 'SECTION')) {
  for (const c of sek.children) if (c.type === 'COMPONENT_SET' || c.type === 'COMPONENT') luzne.push(sek.name + ' / ' + c.name);
}
return { log, luzne };
