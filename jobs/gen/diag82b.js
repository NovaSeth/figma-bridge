//# opis: struktura ekranu Ustawienia
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const light = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = light.children.find(x => x.name === '02g Teraz · ustawienia');
const d = (n, depth) => ({ id: n.id, name: n.name, type: n.type, x: Math.round(n.x), y: Math.round(n.y), w: Math.round(n.width), h: Math.round(n.height),
  layout: n.layoutMode || null, gap: n.itemSpacing, pad: 'paddingTop' in n ? [n.paddingTop,n.paddingRight,n.paddingBottom,n.paddingLeft] : null,
  txt: n.type === 'TEXT' ? n.characters.slice(0, 40) : null,
  kids: depth > 0 && 'children' in n ? n.children.map(c => d(c, depth - 1)) : ('children' in n ? n.children.map(c => c.name) : null) });
return { frame: d(f, 0), main: d(f.children.find(c => c.name === 'Main Content') || f.children[0], 2) };
