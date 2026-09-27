//# #66: chipy z datą nad tytułem we wszystkich wierszach (List row, Feed row)
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const prop = (set, name, type, def) => set.addComponentProperty(name, type, def);
// Feed row dostaje slot na chipy nad tytułem
const feed = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Feed row');
if (feed && !feed.children[0].findOne(n => n.name === 'Chips top')) {
  for (const v of feed.children) { const col = v.findOne(n => n.name === 'Text' && n.layoutMode === 'VERTICAL'); const bottom = col.children.find(c => c.name === 'Chips');
    const top = bottom.clone(); top.name = 'Chips top'; top.paddingTop = 0; top.paddingBottom = 5; col.insertChild(0, top); top.layoutSizingHorizontal = 'FILL';
    top.children.forEach((c, i) => { c.name = 'Chip top ' + (i + 1); }); }
  const k = prop(feed, 'Show chips top', 'BOOLEAN', false);
  for (const v of feed.children) v.findOne(n => n.name === 'Chips top').componentPropertyReferences = { visible: k };
  for (let i = 2; i <= 3; i++) { const kk = prop(feed, 'Show chip top ' + i, 'BOOLEAN', false); for (const v of feed.children) { const c = v.findOne(n => n.name === 'Chip top ' + i); if (c) c.componentPropertyReferences = { visible: kk }; } }
}
for (const name of ['List row', 'Feed row']) { const c = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === name);
  if (c && !/nad tytułem/.test(c.description)) c.description += ' Reguła: chip z datą lub terminem stoi zawsze nad tytułem (Show chips top), tak jak na kartach „Teraz".'; }
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const DATE = /^(dziś|pon\.|wt\.|śr\.|czw\.|pt\.|sob\.|nd\.|do |Po terminie|Na |\d)/i;
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && ['List row', 'Feed row'].includes(x.name))) {
    if (!getP(row, 'Show chips') || getP(row, 'Show chips top')) continue;
    const bottom = row.findOne(n => n.name === 'Chips'), top = row.findOne(n => n.name === 'Chips top'); if (!bottom || !top) continue;
    const src = bottom.children.filter(c => c.type === 'INSTANCE' && c.visible), dst = top.children.filter(c => c.type === 'INSTANCE');
    const labels = src.map(c => getP(c, 'Label'));
    if (!labels.some(l => l && DATE.test(String(l)))) continue;           // przenosimy tylko wiersze z datą
    src.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
      setP(d, 'Label', getP(c, 'Label')); setP(d, 'Show icon', getP(c, 'Show icon')); const ic = getP(c, 'Icon'); if (ic) setP(d, 'Icon', ic); });
    setP(row, 'Show chips top', true);
    for (let i = 2; i <= 3; i++) setP(row, 'Show chip top ' + i, !!getP(row, 'Show chip ' + i));
    setP(row, 'Show chips', false); bump(row.name); }
}
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'c-66', scale: 0.45 });
return stat;
