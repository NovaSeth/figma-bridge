//# #60: chipy nad tytułem w List row (spójność z kartami na „Teraz")
const set = findComp('List row');
const has = set.children[0].findOne(n => n.name === 'Chips top');
let keyTop;
if (!has) {
  for (const v of set.children) {
    const col = v.findOne(n => n.name === 'Text' && n.layoutMode === 'VERTICAL');
    const bottom = col.children.find(c => c.name === 'Chips');
    const top = bottom.clone(); top.name = 'Chips top'; top.paddingTop = 0; top.paddingBottom = 5;
    col.insertChild(0, top); top.layoutSizingHorizontal = 'FILL';
  }
  keyTop = prop(set, 'Show chips top', 'BOOLEAN', false);
  for (const v of set.children) { const top = v.findOne(n => n.name === 'Chips top'); top.componentPropertyReferences = { visible: keyTop };
    // chipy w górnym slocie sterowane osobno
    top.children.forEach((c, i) => { c.name = 'Chip top ' + (i + 1); }); }
  for (let i = 2; i <= 2; i++) { const k = prop(set, 'Show chip top ' + i, 'BOOLEAN', false); for (const v of set.children) { const c = v.findOne(n => n.name === 'Chip top ' + i); if (c) c.componentPropertyReferences = { visible: k }; } }
  set.description = set.description + ' Chipy mogą stać nad tytułem (Show chips top) tam, gdzie termin jest ważniejszy od nazwy, jak na kartach „Teraz".';
}
// zastosowanie w Zadaniach
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await page.loadAsync();
const setPr = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const getPr = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
let moved = 0;
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'List row' && (x.componentProperties['Leading'] || {}).value === 'Checkbox')) {
    if (!getPr(row, 'Show chips')) continue;
    const bottom = row.findOne(n => n.name === 'Chips'), top = row.findOne(n => n.name === 'Chips top');
    if (!bottom || !top) continue;
    const src = bottom.children.filter(c => c.type === 'INSTANCE'), dst = top.children.filter(c => c.type === 'INSTANCE');
    src.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
      for (const p of ['Label', 'Show icon']) setPr(d, p, getPr(c, p)); const ic = getPr(c, 'Icon'); if (ic) setPr(d, 'Icon', ic); });
    setPr(row, 'Show chips top', true); setPr(row, 'Show chip top 2', !!getPr(row, 'Show chip 2')); setPr(row, 'Show chips', false); moved++; }
}
await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('04 '), { name: 'c-04', scale: 0.5 });
return { moved };
