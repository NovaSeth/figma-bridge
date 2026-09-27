//# Kontekst #70 na ekranie 02
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('5:2'); const fb = f.absoluteBoundingBox;
const at = (ox, oy) => { const X = fb.x + ox, Y = fb.y + oy; const hits = f.findAll(n => { const b = n.absoluteBoundingBox; return b && X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height; });
  return hits.slice(-6).map(n => n.type[0] + ':' + n.name.slice(0, 18) + (n.type === 'TEXT' ? '«' + n.characters.slice(0, 34) + '»' : '')).join(' > '); };
const sheet = f.children.find(c => c.name === 'Bottom sheet');
const body = sheet ? sheet.findOne(n => n.name === 'Body') : null;
await shot(sheet, { name: 'p-70', scale: 0.8 });
return { at: at(68, 386), bodyKids: body ? body.children.map(c => c.type[0] + ':' + c.name.slice(0, 18) + '@' + Math.round(c.y)) : null };
