//# Kontrola po M2f + namiar na pola i cytat
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME') : []);
const get = p => frames.find(n => n.name.startsWith(p));
for (const [p, n, sc] of [['02b', 'c-02b', 0.5], ['08 ', 'c-08', 0.5], ['13 ', 'c-13', 0.5], ['07 ', 'c-07', 0.45], ['02f', 'c-02f', 0.4]]) { const f = get(p); if (f) await shot(f, { name: n, scale: sc }); }
const T = n => ('findAllWithCriteria' in n ? n.findAllWithCriteria({ types: ['TEXT'] }) : []);
const inputs = frames.flatMap(f => f.findAll(x => x.type === 'FRAME' && x.name === 'Input')).slice(0, 8).map(n => n.parent.name + '/' + n.name + ' ' + Math.round(n.width) + 'x' + Math.round(n.height) + ' txt=' + T(n.parent).length + ' kids=' + n.parent.children.map(c => c.name).join(','));
const quotes = frames.flatMap(f => f.findAll(x => x.type === 'FRAME' && x.name === 'Quote')).map(n => n.name + ' txt=' + T(n).length);
return { inputs, quotes, instances: page.findAllWithCriteria({ types: ['INSTANCE'] }).length };
