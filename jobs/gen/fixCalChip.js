//# opis: chip kalendarza mieści godziny w jednej linii
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const set = ds.findOne(n => n.type === 'COMPONENT_SET' && n.name === 'Calendar chip');
const log = [];
for (const v of set.children) {
  v.paddingLeft = 2; v.paddingRight = 2;
  const t = v.findOne(n => n.type === 'TEXT');
  if (t) { t.textAutoResize = 'HEIGHT'; t.textTruncation = 'ENDING'; t.maxLines = 1; }
  log.push(v.name + ' pad2');
}
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
for (const n of ['15 Plan · dzień','16 Plan · tydzień','17 Plan · miesiąc']) {
  const f = sec.children.find(x => x.name === n);
  if (f) await shot(f, { scale: 0.6, name: 'vV-' + n.split(' ')[0] });
}
return log;
