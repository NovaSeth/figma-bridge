//# opis: #78 Frekwencja jako kalendarz z pierscieniami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }

// tokeny z jasnej kolekcji
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const light = cols.find(c => c.name === 'Color');
const sizeCol = cols.find(c => c.name === 'Size');
const all = await figma.variables.getLocalVariablesAsync();
const V = {};
for (const v of all) if (v.variableCollectionId === (light && light.id) || v.variableCollectionId === (sizeCol && sizeCol.id)) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const styles = await figma.getLocalTextStylesAsync();
const S = {}; styles.forEach(s => { S[s.name] = s; });
const txt = async (chars, styleName, colorName, w) => {
  const t = figma.createText();
  t.characters = chars;
  if (S[styleName]) await t.setTextStyleIdAsync(S[styleName].id);
  if (V[colorName]) t.fills = [paint(colorName)];
  if (w) { t.textAutoResize = 'HEIGHT'; t.resize(w, t.height); }
  t.textAlignHorizontal = 'CENTER';
  return t;
};

const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '02f Teraz · frekwencja');
const main = f.children.find(c => c.name === 'Main Content');

// 1. stara lista dni znika
for (const c of main.children.slice()) if (c.name === 'List' || c.name === 'Spacer') c.remove();

// 2. dane z fixture attendances: wrzesien 2026, 12 dni nauki, 55 z 55
const DANE = { 2:[5,5], 3:[4,4], 4:[5,5], 7:[5,5], 8:[4,4], 9:[5,5], 10:[4,4], 11:[5,5], 14:[5,5], 15:[4,4], 16:[5,5], 17:[4,4] };
const DZIS = 18;
const TYGODNIE = [[0,1,2,3,4,5,6],[7,8,9,10,11,12,13],[14,15,16,17,18,19,20],[21,22,23,24,25,26,27],[28,29,30,0,0,0,0]];
const NAGL = ['pon','wt','śr','czw','pt','sob','nd'];

// pierscien: tor + luk obecnosci, w srodku numer dnia
const R = 36;
const ring = async (dzien, kol) => {
  const cell = figma.createFrame();
  cell.name = dzien ? 'Dzień ' + dzien : 'Pusto';
  cell.resize(R + 8, R + 8);
  cell.fills = [];
  cell.clipsContent = false;
  cell.layoutPositioning = 'AUTO';
  if (!dzien) return cell;
  const weekend = kol >= 5;
  const dane = DANE[dzien];
  const udzial = dane ? dane[0] / dane[1] : 0;
  if (dane) {
    const tor = figma.createEllipse();
    tor.resize(R, R); tor.x = 4; tor.y = 4;
    tor.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.72 };
    tor.fills = [paint('color/outline-variant')];
    tor.name = 'Tor';
    cell.appendChild(tor);
    const luk = figma.createEllipse();
    luk.resize(R, R); luk.x = 4; luk.y = 4;
    luk.arcData = { startingAngle: -Math.PI / 2, endingAngle: -Math.PI / 2 + Math.PI * 2 * udzial, innerRadius: 0.72 };
    luk.fills = [paint('color/success')];
    luk.name = 'Obecność ' + Math.round(udzial * 100) + '%';
    cell.appendChild(luk);
  }
  if (dzien === DZIS) {
    const dot = figma.createEllipse();
    dot.resize(R, R); dot.x = 4; dot.y = 4;
    dot.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.82 };
    dot.fills = [paint('color/primary')];
    dot.name = 'Dziś';
    cell.appendChild(dot);
  }
  const kolor = dane ? 'color/on-surface' : (weekend ? 'color/on-surface-variant' : 'color/on-surface-variant');
  const t = await txt(String(dzien), 'calendar/day-num', dzien === DZIS ? 'color/primary' : kolor, R + 8);
  t.textAlignVertical = 'CENTER';
  t.resize(R + 8, R + 8);
  t.textAutoResize = 'NONE';
  t.x = 0; t.y = 0;
  t.name = 'Numer';
  cell.appendChild(t);
  return cell;
};

const karta = figma.createFrame();
karta.name = 'Kalendarz';
karta.layoutMode = 'VERTICAL';
karta.itemSpacing = 2;
karta.paddingTop = 12; karta.paddingBottom = 12; karta.paddingLeft = 8; karta.paddingRight = 8;
karta.cornerRadius = 20;
karta.fills = [paint('color/surface')];
karta.primaryAxisSizingMode = 'AUTO';
karta.counterAxisSizingMode = 'FIXED';

const rzadNagl = figma.createFrame();
rzadNagl.name = 'Dni tygodnia';
rzadNagl.layoutMode = 'HORIZONTAL';
rzadNagl.itemSpacing = 0;
rzadNagl.fills = [];
rzadNagl.paddingBottom = 6;
karta.appendChild(rzadNagl);
rzadNagl.layoutSizingHorizontal = 'FILL';
rzadNagl.layoutSizingVertical = 'HUG';
for (let k = 0; k < 7; k++) {
  const t = await txt(NAGL[k], 'calendar/label', 'color/on-surface-variant', 40);
  t.name = NAGL[k];
  rzadNagl.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
}

for (const tydzien of TYGODNIE) {
  const rzad = figma.createFrame();
  rzad.name = 'Tydzień';
  rzad.layoutMode = 'HORIZONTAL';
  rzad.itemSpacing = 0;
  rzad.counterAxisAlignItems = 'CENTER';
  rzad.fills = [];
  karta.appendChild(rzad);
  rzad.layoutSizingHorizontal = 'FILL';
  rzad.layoutSizingVertical = 'HUG';
  for (let k = 0; k < 7; k++) {
    const holder = figma.createFrame();
    holder.name = 'Komórka';
    holder.layoutMode = 'HORIZONTAL';
    holder.primaryAxisAlignItems = 'CENTER';
    holder.counterAxisAlignItems = 'CENTER';
    holder.fills = [];
    holder.paddingTop = 3; holder.paddingBottom = 3;
    rzad.appendChild(holder);
    holder.layoutSizingHorizontal = 'FILL';
    holder.layoutSizingVertical = 'HUG';
    const c = await ring(tydzien[k], k);
    holder.appendChild(c);
  }
}

// legenda
const legenda = figma.createFrame();
legenda.name = 'Legenda';
legenda.layoutMode = 'HORIZONTAL';
legenda.itemSpacing = 16;
legenda.fills = [];
legenda.paddingTop = 12; legenda.paddingLeft = 4;
const poz = [['color/success', 'Obecność'], ['color/error', 'Nieobecność'], ['color/warning', 'Spóźnienie']];
for (const [kolor, etykieta] of poz) {
  const g = figma.createFrame();
  g.layoutMode = 'HORIZONTAL'; g.itemSpacing = 6; g.counterAxisAlignItems = 'CENTER'; g.fills = []; g.name = etykieta;
  const kropka = figma.createEllipse();
  kropka.resize(10, 10);
  kropka.fills = [paint(kolor)];
  g.appendChild(kropka);
  const t = await txt(etykieta, 'label/sm', 'color/on-surface-variant');
  t.textAlignHorizontal = 'LEFT';
  g.appendChild(t);
  legenda.appendChild(g);
  g.layoutSizingHorizontal = 'HUG'; g.layoutSizingVertical = 'HUG';
}

// wstawienie przed stopką
const stopka = main.children.find(c => c.name === 'Foot');
const idx = stopka ? main.children.indexOf(stopka) : main.children.length;
main.insertChild(idx, karta);
karta.layoutSizingHorizontal = 'FILL';
main.insertChild(main.children.indexOf(karta) + 1, legenda);
legenda.layoutSizingHorizontal = 'FILL';
legenda.layoutSizingVertical = 'HUG';

// ekran mieści się w jednym urządzeniu
f.primaryAxisSizingMode = 'FIXED';
f.resize(402, 874);
f.clipsContent = true;
main.layoutSizingVertical = 'FILL';
main.layoutGrow = 1;

await shot(f, { scale: 1, name: 'v78-frekwencja' });
return { wysokosc: Math.round(f.height), kartaH: Math.round(karta.height), dzieci: main.children.map(c => c.name + ':' + Math.round(c.height)) };
