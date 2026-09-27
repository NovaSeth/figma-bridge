//# Kontrola po M2b
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME') : []);
const get = p => frames.find(n => n.name.startsWith(p));
for (const [p, n, sc] of [['01 ', 'c-01', 0.45], ['04 ', 'c-04', 0.45], ['07 ', 'c-07', 0.45], ['02g', 'c-02g', 0.5], ['13 ', 'c-13', 0.5]]) { const f = get(p); if (f) await shot(f, { name: n, scale: sc }); }
return { instances: page.findAllWithCriteria({ types: ['INSTANCE'] }).length, heights: frames.slice(0, 6).map(f => f.name.slice(0, 16) + '=' + Math.round(f.height)) };
