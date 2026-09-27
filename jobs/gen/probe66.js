//# Kontekst #66: co jest w punkcie 129,1920 na ekranie 01
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('3:2'); const fb = f.absoluteBoundingBox;
const X = fb.x + 129, Y = fb.y + 1920;
const hits = f.findAll(n => { const b = n.absoluteBoundingBox; return b && X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height; });
const chain = hits.slice(-6).map(n => n.type[0] + ':' + n.name.slice(0, 22) + (n.type === 'TEXT' ? '«' + n.characters.slice(0, 24) + '»' : ''));
// wiersze „Warto wiedzieć" i ich chipy
const rows = f.findAll(n => n.type === 'INSTANCE' && n.name === 'List row').map(n => ({ v: (n.componentProperties['Leading'] || {}).value + '/' + (n.componentProperties['Trailing'] || {}).value, title: (n.componentProperties[Object.keys(n.componentProperties).find(k => k.startsWith('Title'))] || {}).value, chips: !!(n.componentProperties[Object.keys(n.componentProperties).find(k => k.startsWith('Show chips#'))] || {}).value, top: !!(n.componentProperties[Object.keys(n.componentProperties).find(k => k.startsWith('Show chips top'))] || {}).value }));
return { chain, rows: rows.slice(0, 8) };
