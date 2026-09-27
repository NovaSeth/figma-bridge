//# opis: #84 przyciski 50/50, glowny po prawej
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Sheet actions');
const log = [];
for (const v of set.children) {
  const btns = v.children.filter(c => c.type === 'INSTANCE');
  const rec = { wariant: v.name, przed: v.children.map(c => c.name + ':' + Math.round(c.width)) };
  if (btns.length >= 2) {
    const sec = btns.find(b => /secondary/i.test(b.name));
    const pri = btns.find(b => /primary/i.test(b.name));
    if (sec && pri) {
      // secondary po lewej, primary po prawej
      v.insertChild(0, sec);
      v.insertChild(1, pri);
    }
  }
  for (const b of v.children.filter(c => c.type === 'INSTANCE')) {
    b.layoutSizingHorizontal = 'FILL';
    b.layoutGrow = 1;
  }
  rec.po = v.children.map(c => c.name + ':' + Math.round(c.width));
  log.push(rec);
}
set.description = (set.description || '').split('\n\nUkład:')[0] + '\n\nUkład: dwa przyciski dzielą szerokość po równo; akcja główna (czarna) zawsze po prawej, pomocnicza po lewej.';
return log;
