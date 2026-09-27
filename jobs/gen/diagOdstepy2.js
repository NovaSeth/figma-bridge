//# opis: skad dodatkowe 10 px
const page = figma.root.children.find(p => p.name === '[Mobile] User Front');
await figma.setCurrentPageAsync(page);
const sec = page.children.find(s => s.type === 'SECTION' && s.name === 'Jasny motyw');
const f = sec.children.find(x => x.name === '01 Teraz');
const out = [];
for (const h of f.findAll(n => n.type === 'INSTANCE' && n.name === 'Section heading')) {
  const tytul = (h.findOne(t => t.type === 'TEXT') || {}).characters;
  const chain = [];
  let n = h.parent;
  for (let i = 0; i < 3 && n && n !== f; i++) {
    chain.push({ n: n.name, layout: n.layoutMode, gap: n.itemSpacing, padTop: n.paddingTop, padBottom: n.paddingBottom, kids: n.children.map(c => c.name + '@' + Math.round(c.y) + 'h' + Math.round(c.height)) });
    n = n.parent;
  }
  out.push({ tytul, chain });
}
return out;
