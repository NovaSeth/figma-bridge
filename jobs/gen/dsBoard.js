//# opis: jak zbudowana jest tablica dokumentacji
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const sek = ds.children.find(c => c.type === 'SECTION' && c.name === 'Atomy');
const board = sek.children.find(c => c.name === 'Board');
return {
  layout: board.layoutMode,
  gap: board.itemSpacing,
  pad: [board.paddingTop, board.paddingRight, board.paddingBottom, board.paddingLeft],
  kids: board.children.slice(0, 4).map(c => ({ n: c.name, t: c.type, layout: c.layoutMode, h: Math.round(c.height), kids: 'children' in c ? c.children.map(k => k.name + ':' + k.type) : null })),
  ostatnie: board.children.slice(-3).map(c => c.name + ':' + c.type)
};
