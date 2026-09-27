//# opis: jak zrobione sa listy z separatorami
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f01 = light.children.find(x => x.name === '01 Teraz');
const desc = (n) => ({ id: n.id, name: n.name, type: n.type, w: Math.round(n.width), h: Math.round(n.height),
  fill: n.fills && n.fills[0] && n.fills[0].type === 'SOLID' ? [Math.round(n.fills[0].color.r*255),Math.round(n.fills[0].color.g*255),Math.round(n.fills[0].color.b*255)] : (n.fills && n.fills.length ? n.fills[0].type : 'none'),
  stroke: n.strokes && n.strokes.length ? n.strokeWeight : 0, r: n.cornerRadius, gap: n.itemSpacing, pad: [n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft],
  kids: 'children' in n ? n.children.map(c => c.name + ':' + c.type + ':' + Math.round(c.height)) : null });
const lists = f01.findAll(n => n.name === 'List').slice(0, 2).map(desc);
// lista na 02a
const a02a = light.children.find(x => x.name === '02a Teraz · szczegóły na pełnym ekranie');
const sheet = a02a.children.find(c => c.name === 'Bottom sheet');
const body = sheet.children.find(c => c.name === 'Body');
const l = body.findAll(n => n.name === 'List');
const a02 = light.children.find(x => x.name === '02 Teraz · szczegóły sprawy (arkusz)');
const b2 = a02.children.find(c => c.name === 'Bottom sheet').children.find(c => c.name === 'Body');
return { list01: lists, body02a: body.children.map(c => c.name + ':' + c.type + ':' + Math.round(c.height)), list02a: l.map(desc),
  body02: b2.children.map(c => c.name + ':' + c.type + ':' + Math.round(c.height)), list02: b2.findAll(n => n.name === 'List').map(desc) };
