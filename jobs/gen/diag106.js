//# opis: gdzie siedzi rzad filtrow na 18
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '18 Plan · rok');
const main = f.children.find(c => c.name === 'Main Content');
return main.children.map(c => ({ n: c.name, t: c.type, y: Math.round(c.y), h: Math.round(c.height),
  pad: 'paddingBottom' in c ? [c.paddingTop, c.paddingBottom] : null,
  kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type).slice(0, 5) : null }));
