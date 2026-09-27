//# opis: #86 przycisk primary tylko z obrysem
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Button');
const defs = set.componentPropertyDefinitions;
const kLabel = Object.keys(defs).find(k => k.split('#')[0] === 'Label');
const kIkona = Object.keys(defs).find(k => k.split('#')[0] === 'Icon');
const kPokaz = Object.keys(defs).find(k => k.split('#')[0] === 'Show icon');
const log = [];
for (const stan of ['Default', 'Pressed', 'Disabled']) {
  const nazwa = 'Style=Primary outline, State=' + stan;
  if (set.children.find(c => c.name === nazwa)) continue;
  const wzor = set.children.find(c => c.name === 'Style=Primary, State=' + stan);
  const k = wzor.clone();
  set.appendChild(k);
  k.name = nazwa;
  const wygaszony = stan === 'Disabled';
  k.fills = [];
  k.strokes = [paint(wygaszony ? 'color/on-disabled' : 'color/inverse-surface', wygaszony ? { r: 0.6, g: 0.6, b: 0.62 } : { r: 0.07, g: 0.07, b: 0.07 })];
  k.strokeWeight = 1.5;
  k.strokeAlign = 'INSIDE';
  if (stan === 'Pressed') k.fills = [paint('color/state-pressed', { r: 0, g: 0, b: 0 })];
  const t = k.findOne(n => n.type === 'TEXT');
  if (t) { t.fills = [paint(wygaszony ? 'color/on-disabled' : 'color/inverse-surface', wygaszony ? { r: 0.6, g: 0.6, b: 0.62 } : { r: 0.07, g: 0.07, b: 0.07 })]; t.componentPropertyReferences = { characters: kLabel }; }
  const ico = k.findOne(n => n.type === 'INSTANCE' && /^Icon/.test(n.name));
  if (ico) ico.componentPropertyReferences = { visible: kPokaz, mainComponent: kIkona };
  log.push(nazwa);
}
let x = 0, y = 0;
for (const c of set.children) { c.x = x; c.y = y; x += c.width + 16; if (x > 640) { x = 0; y += 60; } }
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
set.description = (set.description || '').split('\n\nStyle:')[0] + '\n\nStyle: Primary = wypełnienie na akcję główną, Primary outline = ta sama waga wizualna, ale sam obrys (akcja w banerze, akcja wtórna na tle karty), Secondary = tło neutralne, Outline = obrys neutralny, Text = sam tekst.';
await shot(set, { scale: 0.8, name: 'vAB-button' });
return log;
