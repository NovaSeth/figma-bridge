//# opis: Day badge w DS + podmiana w naglowku tygodnia
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
for (const n of ds.findAll(x => (x.type === 'COMPONENT_SET' || x.type === 'COMPONENT') && x.name === 'Day badge')) n.remove();
const warianty = [];
for (const [stan, tekst, tlo] of [['Default', 'color/on-surface', null], ['Today', 'color/on-primary', 'color/primary']]) {
  const c = figma.createComponent();
  c.name = 'State=' + stan;
  c.resize(28, 28);
  c.fills = tlo ? [paint(tlo)] : [];
  c.cornerRadius = 14;
  const t = figma.createText();
  t.characters = '18'; t.name = 'Day';
  if (S['calendar/day']) await t.setTextStyleIdAsync(S['calendar/day'].id);
  else if (S['label/md-strong']) await t.setTextStyleIdAsync(S['label/md-strong'].id);
  t.fills = [paint(tekst)];
  t.textAutoResize = 'NONE'; t.resize(28, 28);
  t.textAlignHorizontal = 'CENTER'; t.textAlignVertical = 'CENTER';
  c.appendChild(t);
  sekcja.appendChild(c);
  warianty.push({ c, t });
}
const set = figma.combineAsVariants(warianty.map(w => w.c), sekcja);
set.name = 'Day badge';
set.layoutMode = 'HORIZONTAL'; set.itemSpacing = 12;
set.paddingTop = 12; set.paddingBottom = 12; set.paddingLeft = 12; set.paddingRight = 12;
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
const k = set.addComponentProperty('Day', 'TEXT', '18');
for (const w of warianty) w.t.componentPropertyReferences = { characters: k };
set.description = 'Numer dnia w nagłówku widoku tygodnia. Today = dzień bieżący na wypełnionym kółku.';
const dolne = sekcja.children.filter(c => c !== set).map(c => c.y + c.height);
set.x = 0; set.y = dolne.length ? Math.max.apply(null, dolne) + 40 : 0;
// podmiana na makietach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const W = {}; for (const c of set.children) W[c.name.split('=')[1]] = c;
let n = 0;
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const stary of f.findAll(x => x.type === 'FRAME' && x.name === 'Bold Text' && x.children.length === 1 && x.children[0].type === 'TEXT')) {
    const t = stary.children[0];
    const dzis = /18/.test(t.characters) && /18 września/.test(stary.parent.name || '');
    const inst = W[dzis ? 'Today' : 'Default'].createInstance();
    const rodzic = stary.parent;
    rodzic.insertChild(rodzic.children.indexOf(stary), inst);
    const k2 = Object.keys(inst.componentProperties).find(x => x.split('#')[0] === 'Day');
    if (k2) inst.setProperties({ [k2]: t.characters });
    stary.remove();
    n++;
  }
}
const f16 = sec.children.find(x => x.name === '16 Plan · tydzień');
if (f16) await shot(f16, { scale: 0.6, name: 'vZ-16' });
return { komponent: set.name, podmienione: n };
