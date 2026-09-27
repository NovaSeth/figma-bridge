//# #67 tagi nad tytułem w ogłoszeniach, #68 separatory między wierszami list
const ds = figma.root.children.find(p => p.name === 'Design System'); await ds.loadAsync();
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const cols = await figma.variables.getLocalVariableCollectionsAsync(); const vars = await figma.variables.getLocalVariablesAsync();
const V = (n, coll) => vars.find(v => v.name === n && v.variableCollectionId === cols.find(c => c.name === coll).id);
const paintVar = v => [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', v)];
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
// #67: pozostałe wiersze z chipami (np. Feed row w ogłoszeniach/wiadomościach) też mają chipy nad tytułem
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && x.name === 'Feed row' && getP(x, 'Show chips') && !getP(x, 'Show chips top'))) {
    const bottom = row.findOne(n => n.name === 'Chips'), top = row.findOne(n => n.name === 'Chips top'); if (!bottom || !top) continue;
    const src = bottom.children.filter(c => c.type === 'INSTANCE' && c.visible !== false), dst = top.children.filter(c => c.type === 'INSTANCE');
    src.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
      setP(d, 'Label', getP(c, 'Label')); setP(d, 'Show icon', getP(c, 'Show icon')); const ic = getP(c, 'Icon'); if (ic) setP(d, 'Icon', ic); });
    setP(row, 'Show chips top', true); for (let i = 2; i <= dst.length; i++) setP(row, 'Show chip top ' + i, i <= src.length);
    setP(row, 'Show chips', false); bump('feed'); } }
// #68: separator między wierszami w kartach list
for (const s of page.children.filter(n => n.type === 'SECTION')) { const coll = s.name === 'Ciemny motyw' ? 'Color Dark' : 'Color'; const sep = V('color/outline-variant', coll);
  for (const f of s.children.filter(n => n.type === 'FRAME')) {
    for (const list of f.findAll(x => x.type === 'FRAME' && ['List', 'MsgList'].includes(x.name) && x.layoutMode === 'VERTICAL')) {
      const rows = list.children.filter(c => c.type === 'INSTANCE' && /row|Row/.test(c.name));
      if (rows.length < 2) continue;
      if (list.findAll(x => x.name === 'Separator').length) continue;
      rows.forEach((r, i) => { if (!i) return; const line = figma.createRectangle(); line.name = 'Separator'; line.resize(Math.max(list.width - 32, 10), 1); line.fills = paintVar(sep);
        list.insertChild(list.children.indexOf(r), line); try { line.layoutSizingHorizontal = 'FILL'; } catch (e) {} });
      list.itemSpacing = 0; bump('lista'); } } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
await shot(get('01 '), { name: 'c-68', scale: 0.45 });
return stat;
