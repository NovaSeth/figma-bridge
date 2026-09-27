//# opis: pusty Teraz - komunikaty w kartach jak reszta ekranow
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
for (const blok of main.children.slice()) {
  const naglowek = blok.findOne(n => n.type === 'INSTANCE' && n.name === 'Section heading');
  if (!naglowek) continue;
  const podtytul = naglowek.findAll(n => n.type === 'TEXT').find(t => t.visible && /Nic nowego|Brak ogłoszeń/.test(t.characters));
  if (!podtytul) continue;
  const tresc = podtytul.characters;
  // podtytuł znika z nagłówka, trafia do karty pod nim
  const kShow = Object.keys(naglowek.componentProperties || {}).find(x => x.split('#')[0] === 'Show subtitle');
  if (kShow) naglowek.setProperties({ [kShow]: false });
  const karta = figma.createFrame();
  karta.name = 'List';
  karta.layoutMode = 'VERTICAL';
  karta.cornerRadius = 20;
  karta.fills = [paint('color/surface')];
  karta.paddingTop = 16; karta.paddingBottom = 16; karta.paddingLeft = 16; karta.paddingRight = 16;
  const t = figma.createText();
  t.characters = tresc;
  const styl = (await figma.getLocalTextStylesAsync()).find(s => s.name === 'body/md');
  if (styl) await t.setTextStyleIdAsync(styl.id);
  t.fills = [paint('color/on-surface-variant', { r: 0.37, g: 0.39, b: 0.41 })];
  t.textAutoResize = 'HEIGHT';
  karta.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
  blok.appendChild(karta);
  karta.layoutSizingHorizontal = 'FILL';
  karta.layoutSizingVertical = 'HUG';
  if ('itemSpacing' in blok) blok.itemSpacing = 8;
  log.push({ blok: blok.name, tresc });
}
await shot(f, { scale: 0.8, name: 'vP-21' });
return log;
