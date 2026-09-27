//# opis: zasada: najpierw rozszerz istniejacy komponent
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const S = {}; (await figma.getLocalTextStylesAsync()).forEach(s => { S[s.name] = s; });
const karta = ds.findOne(n => n.name === 'Zasada: makieta w całości z systemu');
if (!karta) return { brak: true };
if (karta.findOne(n => n.type === 'TEXT' && /Nowe komponenty/.test(n.characters))) return { juzJest: true };
const dodaj = async (tekst, styl, kolor) => {
  const t = figma.createText();
  t.characters = tekst;
  if (S[styl]) await t.setTextStyleIdAsync(S[styl].id);
  t.fills = [paint(kolor, kolor === 'color/on-surface' ? { r: 0.07, g: 0.07, b: 0.07 } : { r: 0.37, g: 0.39, b: 0.41 })];
  t.textAutoResize = 'HEIGHT';
  karta.appendChild(t);
  t.layoutSizingHorizontal = 'FILL';
};
await dodaj('Nowe komponenty', 'title/sm', 'color/on-surface');
await dodaj('Zanim dojdzie nowy komponent, sprawdzam, czy czegoś podobnego już nie ma. Jeśli jest — rozszerzam go o wariant albo właściwość, zamiast robić drugi byt obok. Tak powstały Chip w rozmiarze Compact i z tonem Error oraz Button w stylu Primary outline. Nowy komponent zakładam dopiero wtedy, gdy w systemie naprawdę nie ma nic zbliżonego (tak było z Day ring — nic nie pokazywało udziału na okręgu).', 'body/md', 'color/on-surface-variant');
await shot(karta, { scale: 1, name: 'vDS-zasada' });
return { h: Math.round(karta.height) };
