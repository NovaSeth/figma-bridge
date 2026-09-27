//# opis: komponenty Day ring i Legend item w DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.5, g: 0.5, b: 0.5 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const sekcja = ds.children.find(c => c.type === 'SECTION' && c.name === 'Molekuły');
// sprzątam poprzednie podejście
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && /^(Day ring|Legend item)$/.test(x.name))) n.remove();

const R = 36, BOX = 44;
const zrobRing = async (stan) => {
  const c = figma.createComponent();
  c.name = 'Day ring';
  c.resize(BOX, BOX);
  c.fills = [];
  c.clipsContent = false;
  if (stan !== 'Empty') {
    const tor = figma.createEllipse();
    tor.name = 'Track'; tor.resize(R, R); tor.x = (BOX - R) / 2; tor.y = (BOX - R) / 2;
    tor.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.72 };
    tor.fills = [paint('color/outline-variant')];
    c.appendChild(tor);
    if (stan === 'Full' || stan === 'Partial') {
      const luk = figma.createEllipse();
      luk.name = 'Arc'; luk.resize(R, R); luk.x = (BOX - R) / 2; luk.y = (BOX - R) / 2;
      const udzial = stan === 'Full' ? 1 : 0.75;
      luk.arcData = { startingAngle: -Math.PI / 2, endingAngle: -Math.PI / 2 + Math.PI * 2 * udzial, innerRadius: 0.72 };
      luk.fills = [paint('color/success')];
      c.appendChild(luk);
    }
    if (stan === 'Today') {
      const o = figma.createEllipse();
      o.name = 'Today'; o.resize(R, R); o.x = (BOX - R) / 2; o.y = (BOX - R) / 2;
      o.arcData = { startingAngle: 0, endingAngle: Math.PI * 2, innerRadius: 0.82 };
      o.fills = [paint('color/primary')];
      c.appendChild(o);
    }
  }
  const t = figma.createText();
  t.characters = '18';
  t.name = 'Day';
  if (S['calendar/day-num']) await t.setTextStyleIdAsync(S['calendar/day-num'].id);
  const kolor = stan === 'Today' ? 'color/primary' : stan === 'Empty' ? 'color/outline' : 'color/on-surface';
  t.fills = [paint(kolor)];
  t.textAutoResize = 'NONE';
  t.resize(BOX, BOX);
  t.textAlignHorizontal = 'CENTER';
  t.textAlignVertical = 'CENTER';
  t.x = 0; t.y = 0;
  c.appendChild(t);
  c.setProperties = c.setProperties;
  return { c, t };
};
const warianty = [];
for (const stan of ['Full', 'Partial', 'Today', 'None', 'Empty']) {
  const { c, t } = await zrobRing(stan);
  c.name = 'State=' + stan;
  sekcja.appendChild(c);
  warianty.push({ c, t });
}
const set = figma.combineAsVariants(warianty.map(w => w.c), sekcja);
set.name = 'Day ring';
set.layoutMode = 'HORIZONTAL';
set.itemSpacing = 16;
set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
set.primaryAxisSizingMode = 'AUTO';
set.counterAxisSizingMode = 'AUTO';
const kDay = set.addComponentProperty('Day', 'TEXT', '18');
for (const w of warianty) w.t.componentPropertyReferences = { characters: kDay };
set.description = 'Dzień w kalendarzu frekwencji. Pierścień pokazuje udział obecności: Full = komplet, Partial = część, Today = dziś, None = dzień nauki bez danych, Empty = weekend lub dzień poza okresem.';
set.x = 0; set.y = 0;

// legenda
const zrobLegende = async (token, etykieta) => {
  const c = figma.createComponent();
  c.name = 'Legend item';
  c.layoutMode = 'HORIZONTAL'; c.itemSpacing = 6; c.counterAxisAlignItems = 'CENTER'; c.fills = [];
  c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'AUTO';
  const k = figma.createEllipse(); k.name = 'Dot'; k.resize(10, 10); k.fills = [paint(token)];
  c.appendChild(k);
  const t = figma.createText(); t.characters = etykieta; t.name = 'Label';
  if (S['label/sm']) await t.setTextStyleIdAsync(S['label/sm'].id);
  t.fills = [paint('color/on-surface-variant')];
  t.textAutoResize = 'WIDTH_AND_HEIGHT';
  c.appendChild(t);
  return { c, t };
};
const leg = [];
for (const [ton, token, etykieta] of [['Success', 'color/success', 'Obecność'], ['Error', 'color/error', 'Nieobecność'], ['Warning', 'color/warning', 'Spóźnienie']]) {
  const { c, t } = await zrobLegende(token, etykieta);
  c.name = 'Tone=' + ton;
  sekcja.appendChild(c);
  leg.push({ c, t });
}
const setLeg = figma.combineAsVariants(leg.map(w => w.c), sekcja);
setLeg.name = 'Legend item';
setLeg.layoutMode = 'HORIZONTAL'; setLeg.itemSpacing = 16;
setLeg.paddingTop = 16; setLeg.paddingBottom = 16; setLeg.paddingLeft = 16; setLeg.paddingRight = 16;
setLeg.primaryAxisSizingMode = 'AUTO'; setLeg.counterAxisSizingMode = 'AUTO';
const kLab = setLeg.addComponentProperty('Label', 'TEXT', 'Obecność');
for (const w of leg) w.t.componentPropertyReferences = { characters: kLab };
setLeg.description = 'Pozycja legendy kalendarza: kropka w kolorze stanu i podpis.';
setLeg.x = 0; setLeg.y = set.height + 40;
return { dayRing: set.id, warianty: set.children.map(c => c.name), legend: setLeg.id, legWarianty: setLeg.children.map(c => c.name) };
