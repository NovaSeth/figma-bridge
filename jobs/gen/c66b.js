//# #66 poprawka: pokaż wszystkie chipy, które były w dolnym rzędzie
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const setP = (i, n, v) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); if (k) { try { i.setProperties({ [k]: v }); return true; } catch (e) {} } return false; };
const getP = (i, n) => { const k = Object.keys(i.componentProperties).find(x => x === n || x.startsWith(n + '#')); return k ? i.componentProperties[k].value : undefined; };
const stat = {}; const bump = k => { stat[k] = (stat[k] || 0) + 1; };
for (const s of page.children.filter(n => n.type === 'SECTION')) for (const f of s.children.filter(n => n.type === 'FRAME')) {
  for (const row of f.findAll(x => x.type === 'INSTANCE' && ['List row', 'Feed row'].includes(x.name) && getP(x, 'Show chips top'))) {
    const bottom = row.findOne(n => n.name === 'Chips'), top = row.findOne(n => n.name === 'Chips top'); if (!bottom || !top) continue;
    const src = bottom.children.filter(c => c.type === 'INSTANCE' && c.visible !== false);
    const dst = top.children.filter(c => c.type === 'INSTANCE');
    src.forEach((c, i) => { const d = dst[i]; if (!d) return; const tone = (c.componentProperties['Tone'] || {}).value; try { d.setProperties({ Tone: tone }); } catch (e) {}
      setP(d, 'Label', getP(c, 'Label')); setP(d, 'Show icon', getP(c, 'Show icon')); const ic = getP(c, 'Icon'); if (ic) setP(d, 'Icon', ic); });
    for (let i = 2; i <= dst.length; i++) setP(row, 'Show chip top ' + i, i <= src.length);
    if (src.length > 1) bump('naprawiono'); else bump('ok');
  } }
const get = p => page.children.flatMap(x => x.type === 'SECTION' ? x.children : []).find(n => n.name.startsWith(p));
const f01 = get('01 '); const nh = f01.findAllWithCriteria({ types: ['TEXT'] }).find(t => t.characters === 'Ogłoszenia szkolne');
let sec = nh; while (sec.parent !== f01.children[1]) sec = sec.parent;
await shot(sec, { name: 'c-66b', scale: 0.85 });
return stat;
