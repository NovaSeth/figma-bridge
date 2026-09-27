//# opis: pusty Teraz - komunikaty w bialych kartach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb || { r: 1, g: 1, b: 1 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '21 Stan · pusto (Teraz)');
const main = f.children.find(c => c.name === 'Main Content');
const log = [];
for (const blok of main.children) {
  if (!blok.findOne) continue;
  if (blok.findOne(n => n.name === 'List')) continue;
  const t = blok.findAll(n => n.type === 'TEXT').find(x => /Nic nowego|Brak ogłoszeń/.test(x.characters));
  if (!t) continue;
  const wrap = t.parent;
  const karta = figma.createFrame();
  karta.name = 'List';
  karta.layoutMode = 'VERTICAL';
  karta.cornerRadius = 20;
  karta.fills = [paint('color/surface')];
  karta.paddingTop = 16; karta.paddingBottom = 16; karta.paddingLeft = 16; karta.paddingRight = 16;
  const rodzic = wrap.parent;
  const idx = rodzic.children.indexOf(wrap);
  rodzic.insertChild(idx, karta);
  karta.layoutSizingHorizontal = 'FILL';
  karta.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
  t.textAutoResize = 'HEIGHT';
  karta.layoutSizingVertical = 'HUG';
  if (wrap.children.length === 0) wrap.remove();
  log.push({ tresc: t.characters, rodzic: rodzic.name });
}
await shot(f, { scale: 0.8, name: 'vP-21' });
return log;
