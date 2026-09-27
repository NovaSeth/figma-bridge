//# Kontrola po M2a
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const get = p => page.children.flatMap(s => s.type === 'SECTION' ? s.children : []).find(n => n.type === 'FRAME' && n.name.startsWith(p));
for (const [p, n, sc] of [['01 ', 'c-01', 0.45], ['07 ', 'c-07', 0.45], ['15 ', 'c-15', 0.45], ['17 ', 'c-17', 0.5]]) await shot(get(p), { name: n, scale: sc });
const left = page.findAll(x => x.type === 'TEXT' && x.fontName !== figma.mixed && x.fontName.family.startsWith('Material')).length;
const noStyle = page.findAll(x => x.type === 'TEXT' && !x.textStyleId).length;
return { materialLeft: left, textWithoutStyle: noStyle, instances: page.findAllWithCriteria({ types: ['INSTANCE'] }).length };
