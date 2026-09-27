//# opis: komponent Calendar day mini
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.5, g: 0.5, b: 0.5 } }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const sekcja = ds.children.find(c => c.type === 'SECTION' && c.name === 'Atomy');
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === 'Calendar day mini')) n.remove();
const W = 15, H = 15;
const STANY = [
  ['Default', 'color/on-surface-variant', null, 'calendar/day-mini'],
  ['Weekend', 'color/outline', null, 'calendar/day-mini'],
  ['Outside', 'color/outline', null, 'calendar/day-mini'],
  ['Event', 'color/on-primary-container', 'color/primary-container', 'calendar/day-mini-strong'],
  ['Today', 'color/on-primary', 'color/primary', 'calendar/day-mini-strong']
];
const warianty = [];
for (const [stan, tekst, tlo, styl] of STANY) {
  const c = figma.createComponent();
  c.name = 'State=' + stan;
  c.resize(W, H);
  c.fills = [];
  c.clipsContent = false;
  if (tlo) {
    const k = figma.createEllipse();
    k.name = 'Marker'; k.resize(14, 14); k.x = (W - 14) / 2; k.y = (H - 14) / 2;
    k.fills = [paint(tlo)];
    c.appendChild(k);
  }
  const t = figma.createText();
  t.characters = '18'; t.name = 'Day';
  if (S[styl]) await t.setTextStyleIdAsync(S[styl].id);
  t.fills = [paint(tekst)];
  t.textAutoResize = 'NONE';
  t.resize(W, H);
  t.textAlignHorizontal = 'CENTER';
  t.textAlignVertical = 'CENTER';
  t.x = 0; t.y = 0;
  c.appendChild(t);
  sekcja.appendChild(c);
  warianty.push({ c, t });
}
const set = figma.combineAsVariants(warianty.map(w => w.c), sekcja);
set.name = 'Calendar day mini';
set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 12;
set.paddingTop = 12; set.paddingBottom = 12; set.paddingLeft = 12; set.paddingRight = 12;
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
const k = set.addComponentProperty('Day', 'TEXT', '18');
for (const w of warianty) w.t.componentPropertyReferences = { characters: k };
set.description = 'Dzień w miniaturze miesiąca (widok roku). Weekend i dni spoza miesiąca są wygaszone, Event oznacza dzień z zadaniami lub wydarzeniem, Today bieżący dzień.';
const dolne = sekcja.children.filter(c => c !== set).map(c => c.y + c.height);
set.x = 0; set.y = dolne.length ? Math.max.apply(null, dolne) + 40 : 0;
return { set: set.name, warianty: set.children.map(c => c.name) };
