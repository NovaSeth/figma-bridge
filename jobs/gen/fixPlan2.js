//# opis: jednolity kolor naglowkow dni tygodnia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = cols.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = n => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const t of f.findAll(n => n.type === 'TEXT' && /^(pon|wt|śr|czw|pt|sob|nd)\.?$/.test(n.characters.trim()))) {
    t.fills = [paint('color/on-surface-variant')];
    log.push(f.name + ' / ' + t.characters);
  }
}
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
await shot(f17, { scale: 1, name: 'vA-17' });
return { n: log.length, probka: log.slice(0, 10) };
