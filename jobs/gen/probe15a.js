//# Kontekst #57/#58 w arkuszu „Nowe zajęcia" i #59 w ekranie błędu
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('47:4949');
const fb = f.absoluteBoundingBox;
const at = (ox, oy) => { const X = fb.x + ox, Y = fb.y + oy; const hits = f.findAll(n => { const b = n.absoluteBoundingBox; return b && X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height; }); return hits.slice(-4).map(n => n.type[0] + ':' + n.name.slice(0, 18) + (n.type === 'TEXT' ? '«' + n.characters.slice(0, 18) + '»' : '')).join(' > '); };
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet ? sheet.findOne(n => n.name === 'Body') : null;
const err = await figma.getNodeByIdAsync('23:2');
const eb = err.absoluteBoundingBox;
const atErr = (ox, oy) => { const X = eb.x + ox, Y = eb.y + oy; const hits = err.findAll(n => { const b = n.absoluteBoundingBox; return b && X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height; }); return hits.slice(-3).map(n => n.type[0] + ':' + n.name.slice(0, 16) + (n.type === 'TEXT' ? '«' + n.characters.slice(0, 40) + '»' : '')).join(' > '); };
return { frame: f.name, '#57': at(393, 639), '#58': at(86, 680), body: body ? body.children.map(c => c.type[0] + ':' + c.name.slice(0, 20) + '@' + Math.round(c.y)) : null, errFrame: err.name, '#59': atErr(251, 130) };
