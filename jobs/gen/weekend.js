//# #56: wyszarzenie soboty i niedzieli w widoku miesiąca i roku
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = (name, coll) => vars.find(v => v.name === name && v.variableCollectionId === cols.find(c => c.name === coll).id);
const paintVar = (v) => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const out = []; let changed = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) { const coll = s.name === 'Ciemny motyw' ? 'Color Dark' : 'Color';
  const muted = V('color/on-surface-variant', coll);
  for (const f of s.children.filter(n => n.type === 'FRAME' && /^1[78] /.test(n.name))) {
    const grid = f.findOne(x => x.name === 'MonthGrid');
    if (grid) { const cells = grid.children; const heads = cells.filter(c => T(c).length === 1 && ['pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.', 'nd.'].includes(T(c)[0].characters));
      const dayCells = cells.filter(c => c.name.startsWith('Button - '));
      heads.forEach((h, i) => { if (i >= 5) { for (const t of T(h)) { t.fills = paintVar(muted); changed++; } } });
      dayCells.forEach((c, i) => { if (i % 7 >= 5) { const num = T(c)[0]; const circle = num.parent; const isToday = circle && circle.fills && circle.fills.length && circle.fills[0].boundVariables; if (!isToday) { num.fills = paintVar(muted); changed++; } } });
      out.push(f.name.slice(0, 18) + ' miesiąc: ' + heads.length + ' nagłówków, ' + dayCells.length + ' dni'); }
    // widok roku: kolumny 6 i 7 w każdym miesiącu
    for (const ym of f.findAll(x => x.type === 'FRAME' && x.name && x.name.startsWith('Button - ') && T(x).length > 20)) {
      const nums = T(ym).slice(7); nums.forEach((t, i) => { if (i % 7 >= 5 && !(t.parent && t.parent.fills && t.parent.fills.length)) { t.fills = paintVar(muted); changed++; } }); }
  } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('17 '), { name: 'w-17', scale: 0.5 }); await shot(get('18 '), { name: 'w-18', scale: 0.5 });
return { changed, out };
