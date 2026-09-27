//# Kontrola po M2d (karty) + namiar na FAB
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const frames = page.children.flatMap(s => s.type === 'SECTION' ? s.children.filter(n => n.type === 'FRAME') : []);
const get = p => frames.find(n => n.name.startsWith(p));
for (const [p, n, sc] of [['01 ', 'c-01', 0.45], ['04 ', 'c-04', 0.45], ['07 ', 'c-07', 0.45]]) { const f = get(p); if (f) await shot(f, { name: n, scale: sc }); }
const f7 = get('07 ');
const cand = f7.findAll(x => x.findAllWithCriteria({ types: ['TEXT'] }).some(t => t.characters === 'Napisz')).map(n => n.type + " '" + n.name + "' " + Math.round(n.width) + 'x' + Math.round(n.height) + ' parent=' + n.parent.name + ' abs=' + n.layoutPositioning);
return { fabCandidates: cand, h01: Math.round(get('01 ').height) };
