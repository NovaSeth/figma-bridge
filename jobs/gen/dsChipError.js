//# opis: Chip dostaje ton Error (brakowalo czerwonego)
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 0.7, g: 0.2, b: 0.2 } }, 'color', V[n]);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Chip');
const log = [];
const tlo = V['color/error-container'] ? 'color/error-container' : 'color/warning-container';
const tekst = V['color/on-error-container'] ? 'color/on-error-container' : 'color/error';
for (const rozmiar of ['Default', 'Compact']) {
  const nazwa = 'Tone=Error, Size=' + rozmiar;
  if (set.children.find(c => c.name === nazwa)) continue;
  const wzor = set.children.find(c => c.name === 'Tone=Warning, Size=' + rozmiar);
  const k = wzor.clone();
  k.name = nazwa;
  set.appendChild(k);
  k.fills = [paint(tlo, { r: 0.98, g: 0.87, b: 0.87 })];
  const t = k.findOne(n => n.type === 'TEXT');
  if (t) t.fills = [paint(tekst, { r: 0.7, g: 0.15, b: 0.12 })];
  log.push(nazwa + ' (tło ' + tlo + ', tekst ' + tekst + ')');
}
// porządek na kanwie komponentu
let x = 0, y = 0;
for (const c of set.children) { c.x = x; c.y = y; x += c.width + 16; if (x > 560) { x = 0; y += 60; } }
set.primaryAxisSizingMode = 'AUTO'; set.counterAxisSizingMode = 'AUTO';
return { dodane: log, warianty: set.children.map(c => c.name) };
