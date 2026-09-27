//# opis: komponent Calendar chip
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const byId = {};
for (const v of await figma.variables.getLocalVariablesAsync()) byId[v.id] = v;
const P = (id, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.9, g: 0.9, b: 0.9 } }, 'color', byId[id]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const sekcja = ds.children.find(c => c.type === 'SECTION' && c.name === 'Molekuły');
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === 'Calendar chip')) n.remove();
const TONY = [
  ['Lekcje', 'VariableID:47:5256', 'VariableID:47:5257', '7:45–11:25'],
  ['Zadania', 'VariableID:47:5268', 'VariableID:47:5267', '2 zad.'],
  ['Szkoła', 'VariableID:47:5266', 'VariableID:47:5262', 'Szkoła'],
  ['Własne', null, null, 'Koniki']
];
const zielone = (await figma.variables.getLocalVariablesAsync()).filter(v => /color\/(success-container|on-success-container)$/.test(v.name));
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const zTlo = zielone.find(v => v.name === 'color/success-container' && v.variableCollectionId === cLight.id);
const zTekst = zielone.find(v => v.name === 'color/on-success-container' && v.variableCollectionId === cLight.id);
const warianty = [];
for (const [ton, tlo, tekst, przyklad] of TONY) {
  const c = figma.createComponent();
  c.name = 'Tone=' + ton;
  c.layoutMode = 'HORIZONTAL';
  c.primaryAxisSizingMode = 'FIXED';
  c.counterAxisSizingMode = 'AUTO';
  c.paddingLeft = 4; c.paddingRight = 4;
  c.cornerRadius = 4;
  c.fills = [tlo ? P(tlo) : P(zTlo.id, { r: 0.81, g: 0.92, b: 0.84 })];
  c.resize(53, 15);
  const t = figma.createText();
  t.characters = przyklad;
  t.name = 'Label';
  if (S['calendar/chip']) await t.setTextStyleIdAsync(S['calendar/chip'].id);
  t.fills = [tekst ? P(tekst) : P(zTekst.id, { r: 0.05, g: 0.4, b: 0.18 })];
  t.textAutoResize = 'HEIGHT';
  c.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
  c.layoutSizingVertical = 'HUG';
  sekcja.appendChild(c);
  warianty.push({ c, t });
}
const set = figma.combineAsVariants(warianty.map(w => w.c), sekcja);
set.name = 'Calendar chip';
set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 16;
set.paddingTop = 16; set.paddingBottom = 16; set.paddingLeft = 16; set.paddingRight = 16;
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
const kLab = set.addComponentProperty('Label', 'TEXT', '7:45–11:25');
for (const w of warianty) w.t.componentPropertyReferences = { characters: kLab };
set.description = 'Wpis w komórce kalendarza (dzień, tydzień, miesiąc). Ton odpowiada legendzie: Lekcje, Zadania, Szkoła, Własne.';
const ost = sekcja.children.filter(c => c !== set).map(c => c.y + c.height);
set.x = 0; set.y = ost.length ? Math.max.apply(null, ost) + 40 : 0;
return { set: set.name, warianty: set.children.map(c => c.name) };
