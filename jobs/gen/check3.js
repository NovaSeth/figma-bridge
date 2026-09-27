//# Kontrola po M2c
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME') : []);
const get = p => frames.find(n => n.name.startsWith(p));
for (const [p, n, sc] of [['01 ', 'c-01', 0.45], ['07 ', 'c-07', 0.45], ['02d', 'c-02d', 0.5], ['21 ', 'c-21', 0.5], ['17 ', 'c-17', 0.5]]) { const f = get(p); if (f) await shot(f, { name: n, scale: sc }); }
const fabs = frames.flatMap(f => f.findAll(x => x.type === 'FRAME' && x.findAllWithCriteria({ types: ['TEXT'] }).some(t => ['Napisz', 'Dodaj zajęcia'].includes(t.characters)))).map(n => n.name + '/' + n.parent.name + '/' + n.layoutPositioning);
const comp = frames.flatMap(f => f.findAll(x => x.name === 'List Item')).slice(0, 6).map(n => n.name + ' w ' + n.parent.name + ' txt=' + n.findAllWithCriteria({ types: ['TEXT'] }).length);
return { fabs: [...new Set(fabs)], completedSample: comp, heights: frames.slice(0, 4).map(f => f.name.slice(0, 14) + '=' + Math.round(f.height)) };
