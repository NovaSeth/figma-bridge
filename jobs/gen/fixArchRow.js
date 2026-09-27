//# opis: wiersz archiwum inaczej niz zrobione
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
for (const st of ['Regular','Medium','Semi Bold','Bold']) { try { await figma.loadFontAsync({ family: 'Inter', style: st }); } catch (e) {} }
const kol = await figma.variables.getLocalVariableCollectionsAsync();
const cLight = kol.find(c => c.name === 'Color');
const V = {};
for (const v of await figma.variables.getLocalVariablesAsync()) if (v.variableCollectionId === cLight.id) V[v.name] = v;
const paint = (n, rgb) => figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: rgb }, 'color', V[n]);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const log = [];
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  // sekcja Archiwum i jej lista
  const naglowek = f.findAll(n => n.type === 'INSTANCE' && n.name === 'Disclosure')
    .find(n => JSON.stringify(n.componentProperties || {}).indexOf('Archiwum') >= 0);
  if (!naglowek) continue;
  const blok = naglowek.parent;
  const lista = blok.children.find(c => c !== naglowek && c.findAll && c.findAll(x => x.type === 'INSTANCE' && /row/i.test(x.name)).length);
  if (!lista) { log.push({ screen: f.name, uwaga: 'brak listy' }); continue; }
  for (const row of lista.findAll(n => n.type === 'INSTANCE' && /row/i.test(n.name))) {
    const p = row.componentProperties || {};
    const k = x => Object.keys(p).find(y => y.split('#')[0] === x);
    const set = {};
    // archiwum to nie zrobione: bez ptaszka i bez przekreslenia
    if (k('Leading')) set[k('Leading')] = 'None';
    if (k('Show chips top')) set[k('Show chips top')] = true;
    if (Object.keys(set).length) row.setProperties(set);
    for (const t of row.findAll(n => n.type === 'TEXT')) {
      if (t.textDecoration === 'STRIKETHROUGH') { t.textDecoration = 'NONE'; log.push({ screen: f.name, zdjete: t.characters.slice(0, 28) }); }
    }
    // tytul wygaszony, jak w kodzie (tone muted)
    const tytul = row.findOne(n => n.type === 'TEXT' && n.name === 'Title');
    if (tytul) tytul.fills = [paint('color/on-surface-variant', { r: 0.37, g: 0.39, b: 0.41 })];
    // chip nad tytulem mowi "Archiwum"
    const chip = row.findOne(n => n.type === 'INSTANCE' && /^Chip/.test(n.name));
    if (chip) {
      const kL = Object.keys(chip.componentProperties || {}).find(x => x.split('#')[0] === 'Label');
      const kT = Object.keys(chip.componentProperties || {}).find(x => x === 'Tone');
      const kI = Object.keys(chip.componentProperties || {}).find(x => x.split('#')[0] === 'Show icon');
      const zm = {};
      if (kL) zm[kL] = 'Archiwum';
      if (kT) zm[kT] = 'Neutral';
      if (kI) zm[kI] = false;
      if (Object.keys(zm).length) chip.setProperties(zm);
      log.push({ screen: f.name, chip: 'Archiwum' });
    }
  }
  await shot(f, { scale: 0.7, name: 'vAG-' + f.name.split(' ')[0] });
}
return log;
