//# opis: komorka 18 wrzesnia i kolory naglowkow
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f17 = sec.children.find(x => x.name === '17 Plan · miesiąc');
const grid = (await figma.getNodeByIdAsync('20:75')).parent.parent;
const cell = grid.children.find(c => /18 września/.test(c.name));
const dump = n => ({ n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), v: n.type === 'TEXT' ? n.characters : null,
  fill: n.fills && n.fills !== figma.mixed && n.fills[0] && n.fills[0].type === 'SOLID' ? [Math.round(n.fills[0].color.r*255),Math.round(n.fills[0].color.g*255),Math.round(n.fills[0].color.b*255)] : 'x',
  kids: 'children' in n ? n.children.map(dump) : null });
const k17 = grid.children.find(c => /17 września/.test(c.name));
// kolory naglowkow: czy fills to mixed
const heads = (await figma.getNodeByIdAsync('20:75')).parent.children;
const kol = [];
for (const h of heads) {
  const t = h.type === 'TEXT' ? h : h.findOne(n => n.type === 'TEXT');
  const segs = t.getStyledTextSegments(['fills']);
  kol.push({ v: t.characters, segs: segs.map(s => ({ chars: s.characters, fill: s.fills[0] && s.fills[0].type === 'SOLID' ? [Math.round(s.fills[0].color.r*255),Math.round(s.fills[0].color.g*255),Math.round(s.fills[0].color.b*255)] : 'x', bound: s.fills[0] && s.fills[0].boundVariables ? JSON.stringify(s.fills[0].boundVariables) : null })) });
}
return { cell18: cell ? dump(cell) : null, cell17: k17 ? dump(k17) : null, naglowki: kol };
