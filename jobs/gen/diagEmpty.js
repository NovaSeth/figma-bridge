//# opis: audyt pustych stanow, FAB, banerow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const out = { puste: [], fab: [], banery: [], plan24: null };
for (const f of sec.children) {
  if (f.type !== 'FRAME') continue;
  const main = f.children.find(c => c.name === 'Main Content');
  if (main) {
    const es = main.findOne(n => n.type === 'INSTANCE' && n.name === 'Empty state');
    if (es) out.puste.push({ screen: f.name, mainH: Math.round(main.height), align: main.primaryAxisAlignItems, esY: Math.round(es.absoluteTransform ? es.y : 0), esH: Math.round(es.height), parent: es.parent.name, parentAlign: es.parent.primaryAxisAlignItems, parentSizV: es.parent.layoutSizingVertical, kids: main.children.map(c => c.name + ':' + Math.round(c.height)) });
  }
  const fab = f.children.find(c => c.name === 'FAB') || f.findOne(n => n.type === 'INSTANCE' && n.name === 'FAB');
  if (fab) {
    const p = fab.componentProperties || {};
    out.fab.push({ screen: f.name, y: Math.round(fab.y), h: Math.round(fab.height), abs: fab.layoutPositioning,
      props: Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)).join(' | ') });
  }
  for (const b of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Banner')) {
    const p = b.componentProperties || {};
    out.banery.push({ screen: f.name, props: Object.keys(p).map(k => k.split('#')[0] + '=' + JSON.stringify(p[k].value)).join(' | ') });
  }
  if (f.name === '24 Stan · pusto (Plan)') out.plan24 = { kids: f.children.map(c => c.name), mainKids: main ? main.children.map(c => c.name) : null };
}
return out;
