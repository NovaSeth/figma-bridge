//# opis: audyt chipow pod tytulem
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const rows = [];
for (const sec of page.children) if (sec.type === 'SECTION') for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  for (const inst of f.findAll(n => n.type === 'INSTANCE' && (n.name === 'List row' || n.name === 'Feed row'))) {
    const p = inst.componentProperties || {};
    const get = (pre) => { const k = Object.keys(p).find(x => x.split('#')[0] === pre); return k ? { k, v: p[k].value } : null; };
    const showBottom = get('Show chips');
    const showTop = get('Show chips top');
    if (!showBottom || showBottom.v !== true) continue;
    const bottom = inst.findOne(n => n.name === 'Chips');
    const top = inst.findOne(n => n.name === 'Chips top');
    rows.push({
      screen: f.name, id: inst.id, comp: inst.name,
      title: (get('Title')||{}).v,
      allProps: Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)),
      bottomChips: bottom ? bottom.children.filter(c=>c.visible).map(c => ({ n: c.name, t: c.findAll(t=>t.type==='TEXT').map(t=>t.characters).join('/') })) : null,
      topChips: top ? top.children.filter(c=>c.visible).map(c => ({ n: c.name, t: c.findAll(t=>t.type==='TEXT').map(t=>t.characters).join('/') })) : null
    });
  }
}
return { count: rows.length, rows: rows.slice(0, 6), screens: rows.reduce((a,r)=>{a[r.screen]=(a[r.screen]||0)+1;return a;},{}) };
