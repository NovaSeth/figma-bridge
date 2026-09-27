//# opis: co to jest LibrusLink i Bottom sheet
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '01 Teraz');
const l = f.findOne(n => n.name === 'LibrusLink');
const opis = n => ({ n: n.name, t: n.type, w: Math.round(n.width), h: Math.round(n.height), vis: n.visible, op: n.opacity,
  rodzic: n.parent && n.parent.name, kids: 'children' in n ? n.children.map(c => c.name + ':' + c.type + (c.type === 'TEXT' ? '=' + c.characters.slice(0, 30) : '')) : null });
// ile ich jest i czy widoczne
const wszystkie = [];
for (const s of sec.children) {
  if (s.type !== 'FRAME') continue;
  for (const n of s.findAll(x => x.name === 'LibrusLink')) wszystkie.push({ ekran: s.name, vis: n.visible, h: Math.round(n.height), w: Math.round(n.width) });
}
// komponent Bottom sheet w DS
const ds = figma.root.children.find(p => p.name === 'Design System');
await figma.setCurrentPageAsync(ds);
const bs = ds.findOne(n => (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') && n.name === 'Bottom sheet');
return { link: l ? opis(l) : null, ile: wszystkie.length, probka: wszystkie.slice(0, 4), dsBottomSheet: bs ? { t: bs.type, w: Math.round(bs.width), h: Math.round(bs.height) } : 'brak' };
