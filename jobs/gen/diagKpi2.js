//# opis: blok KPI na 02f
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '02f Teraz · frekwencja');
const main = f.children.find(c => c.name === 'Main Content');
const d = n => ({ n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), x: Math.round(n.x),
  pad: 'paddingLeft' in n ? [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft] : null, gap: n.itemSpacing,
  v: n.type === 'TEXT' ? n.characters.slice(0, 30) : null,
  kids: 'children' in n ? n.children.map(d) : null });
return { mainPad: [main.paddingTop, main.paddingRight, main.paddingBottom, main.paddingLeft], kids: main.children.map(d) };
