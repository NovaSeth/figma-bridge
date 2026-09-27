//# opis: widok roku przeliczony na kalendarz 2026
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '18 Plan · rok');
const main = f.children.find(c => c.name === 'Main Content');

// znajdź stary blok z miesiącami
let stary = null;
for (const c of main.children) {
  if (c.findAll && c.findAll(n => n.type === 'TEXT' && /^Styczeń/.test(n.characters)).length) { stary = c; break; }
}
if (!stary) throw new Error('nie znalazłem siatki roku');
const idx = main.children.indexOf(stary);

const NAZWY = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const WYDARZENIA = { 8: [11, 17, 18, 21] }; // wrzesień: zadania i wydarzenia szkolne
const DZIS = { m: 8, d: 18 };

const txt = async (chars, style, color) => {
  const t = figma.createText(); t.characters = chars;
  if (S[style]) await t.setTextStyleIdAsync(S[style].id);
  if (V[color]) t.fills = [paint(color)];
  t.textAutoResize = 'NONE';
  return t;
};

const siatka = figma.createFrame();
siatka.name = 'Rok 2026';
siatka.layoutMode = 'HORIZONTAL';
siatka.layoutWrap = 'WRAP';
siatka.itemSpacing = 8;
siatka.counterAxisSpacing = 8;
siatka.fills = [];
siatka.counterAxisAlignItems = 'MIN';

const CW = 118, CELL = 15, ROWS = 6;
for (let m = 0; m < 12; m++) {
  const pierwszy = (new Date(Date.UTC(2026, m, 1)).getUTCDay() + 6) % 7;
  const dni = new Date(Date.UTC(2026, m + 1, 0)).getUTCDate();
  const karta = figma.createFrame();
  karta.name = NAZWY[m] + ' 2026';
  karta.layoutMode = 'VERTICAL';
  karta.itemSpacing = 6;
  karta.paddingTop = 10; karta.paddingBottom = 10; karta.paddingLeft = 6; karta.paddingRight = 6;
  karta.cornerRadius = 16;
  karta.fills = [paint('color/surface')];
  karta.resize(CW, 10);
  karta.primaryAxisSizingMode = 'FIXED';
  karta.counterAxisSizingMode = 'FIXED';
  karta.resize(CW, 20 + 18 + 6 + ROWS * CELL);

  const nazwa = await txt(NAZWY[m], 'label/md-strong', m === DZIS.m ? 'color/primary' : 'color/on-surface');
  nazwa.resize(CW - 12, 18);
  karta.appendChild(nazwa);

  const dniFrame = figma.createFrame();
  dniFrame.name = 'Dni';
  dniFrame.layoutMode = 'NONE';
  dniFrame.fills = [];
  dniFrame.resize(CW - 12, ROWS * CELL);
  dniFrame.clipsContent = false;
  karta.appendChild(dniFrame);
  const kol = (CW - 12) / 7;
  for (let d = 1; d <= dni; d++) {
    const poz = pierwszy + d - 1;
    const r = Math.floor(poz / 7), c = poz % 7;
    const weekend = c >= 5;
    const dzis = m === DZIS.m && d === DZIS.d;
    const wyd = (WYDARZENIA[m] || []).indexOf(d) >= 0;
    if (dzis) {
      const kolo = figma.createEllipse();
      kolo.resize(14, 14);
      kolo.x = c * kol + (kol - 14) / 2; kolo.y = r * CELL + (CELL - 14) / 2;
      kolo.fills = [paint('color/primary')];
      kolo.name = 'Dziś';
      dniFrame.appendChild(kolo);
    } else if (wyd) {
      const kolo = figma.createEllipse();
      kolo.resize(14, 14);
      kolo.x = c * kol + (kol - 14) / 2; kolo.y = r * CELL + (CELL - 14) / 2;
      kolo.fills = [paint('color/primary-container')];
      kolo.name = 'Wydarzenia';
      dniFrame.appendChild(kolo);
    }
    const t = await txt(String(d), 'body/2xs', dzis ? 'color/on-primary' : wyd ? 'color/on-primary-container' : weekend ? 'color/outline' : 'color/on-surface-variant');
    await t.setTextStyleIdAsync('');
    t.fontName = { family: 'Inter', style: dzis || wyd ? 'Semi Bold' : 'Regular' };
    t.fontSize = 9;
    t.lineHeight = { unit: 'PIXELS', value: 12 };
    t.textAutoResize = 'WIDTH_AND_HEIGHT';
    t.textAlignHorizontal = 'CENTER';
    t.x = c * kol + (kol - t.width) / 2;
    t.y = r * CELL + (CELL - t.height) / 2;
    t.name = String(d);
    dniFrame.appendChild(t);
  }
  siatka.appendChild(karta);
}
main.insertChild(idx, siatka);
siatka.layoutSizingHorizontal = 'FILL';
siatka.layoutSizingVertical = 'HUG';
stary.remove();
await shot(f, { scale: 1, name: 'vD-18' });
return { karty: siatka.children.length, h: Math.round(siatka.height), frameH: Math.round(f.height) };
