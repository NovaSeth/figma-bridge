//# Kontekst #70
const page = figma.root.children.find(p => p.name === '[Mobile] User Front'); await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('3:2'); const fb = f.absoluteBoundingBox;
const at = (ox, oy) => { const X = fb.x + ox, Y = fb.y + oy; const hits = f.findAll(n => { const b = n.absoluteBoundingBox; return b && X >= b.x && X <= b.x + b.width && Y >= b.y && Y <= b.y + b.height; });
  return hits.slice(-5).map(n => n.type[0] + ':' + n.name.slice(0, 20) + (n.type === 'TEXT' ? '«' + n.characters.slice(0, 30) + '»' : '')).join(' > '); };
return { p: at(197, 372) };
