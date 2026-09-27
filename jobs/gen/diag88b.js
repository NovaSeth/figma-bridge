//# opis: co zajmuje 184 px w pasku caly dzien
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const f = await figma.getNodeByIdAsync('18:2');
const grid = f.findOne(n => n.name === 'TimeGrid');
const c = grid.children.find(x => x.layoutPositioning !== 'ABSOLUTE' && x.findOne && x.findOne(n => /Cały dzień/.test(n.name)));
const d = (n, lvl) => ({ n: n.name, t: n.type, y: Math.round(n.y), h: Math.round(n.height), sizV: 'layoutSizingVertical' in n ? n.layoutSizingVertical : null,
  pad: 'paddingTop' in n ? [n.paddingTop, n.paddingBottom] : null, gap: n.itemSpacing,
  kids: lvl > 0 && 'children' in n ? n.children.map(k => d(k, lvl - 1)) : null });
return d(c, 2);
